import {
  getPostureFeedbackDefinition,
  type PostureFeedbackDefinition,
} from '@/constants/postureFeedbackLibrary';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type {
  PostureFindingRecord,
  PostureFindingSeverity,
  PostureFindingUnit,
  PostureFindingViewId,
} from '@/lib/types/postureFindings';
import { POSTURE_STANDARD } from '@/lib/utils/postureAlignment';
import { classifySidePelvicTilt, hipAnteriorOffsetNorm } from '@/lib/utils/postureMath';
import type { OverlayPt, OverlaySkeleton } from './overlaySkeleton';

const FRONT_REPLACE_IDS = ['lateral_pelvic_shift', 'uneven_hip_height'] as const;

export interface OverlaySideCues {
  headPitchUp: boolean;
  headPitchDeg: number;
  forwardHead: boolean;
  forwardHeadDeg: number;
  roundedShoulders: boolean;
  roundedValue: number;
  pelvicStatus: 'Neutral' | 'Anterior Tilt' | 'Posterior Tilt';
  pelvicDegrees: number;
}

function toNorm(p: OverlayPt): { x: number; y: number } {
  return { x: p.x / 100, y: p.y / 100 };
}

function angleAt(a: OverlayPt, b: OverlayPt, c: OverlayPt): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function craniovertebralDeg(ear: OverlayPt, shoulder: OverlayPt): number {
  const dx = ear.x - shoulder.x;
  const dy = ear.y - shoulder.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const fromVertical = Math.acos(Math.max(-1, Math.min(1, (shoulder.y - ear.y) / len)));
  return 90 - fromVertical * (180 / Math.PI);
}

function isSideView(view: string): view is 'side-left' | 'side-right' {
  return view === 'side-left' || view === 'side-right';
}

/** Geometry-only cues from the pose on the displayed photo (overlay percents). */
export function overlaySideCues(
  view: string,
  overlay: OverlaySkeleton,
): OverlaySideCues | undefined {
  if (!isSideView(view)) return undefined;
  const facing = view === 'side-right' ? 1 : -1;
  const { ear, eye, shoulder, hip, knee, ankle } = overlay;

  let headPitchDeg = 0;
  let headPitchUp = false;
  if (ear && eye) {
    const deltaY = (eye.y - ear.y) / 100;
    const deltaX = Math.abs(eye.x - ear.x) / 100;
    headPitchDeg = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    headPitchUp = headPitchDeg < -10;
  }

  let roundedValue = 0;
  let roundedShoulders = false;
  if (shoulder && hip) {
    roundedValue = ((shoulder.x - hip.x) * facing) / 100;
  }
  if (shoulder && ear && hip) {
    const t = (shoulder.y - ear.y) / ((hip.y - ear.y) || 1);
    const chordX = ear.x + t * (hip.x - ear.x);
    const bulge = ((shoulder.x - chordX) * facing) / 100;
    roundedValue = Math.max(roundedValue, bulge);
  }
  roundedShoulders = roundedValue >= 0.012;

  let forwardHead = false;
  let forwardHeadDeg = 0;
  if (ear && shoulder) {
    forwardHeadDeg = Math.max(0, POSTURE_STANDARD.CVA_NEUTRAL_MIN - craniovertebralDeg(ear, shoulder));
    forwardHead = forwardHeadDeg >= 8;
  }

  let pelvicStatus: OverlaySideCues['pelvicStatus'] = 'Neutral';
  let pelvicDegrees = 0;
  if (shoulder && hip) {
    const vsAnkle = ankle ? ((hip.x - ankle.x) * facing) / 100 : 0;
    const vsShoulder = ((hip.x - shoulder.x) * facing) / 100;
    const offset =
      ankle && Math.sign(vsAnkle) !== 0 && Math.sign(vsShoulder) !== Math.sign(vsAnkle)
        ? vsAnkle
        : hipAnteriorOffsetNorm(
            toNorm(shoulder),
            toNorm(hip),
            ankle ? toNorm(ankle) : undefined,
            view,
          );
    const shk = knee ? angleAt(shoulder, hip, knee) : 170;
    const pelvic = classifySidePelvicTilt(offset, shk);
    pelvicStatus = pelvic.status;
    pelvicDegrees = pelvic.degrees;
  }

  return {
    headPitchUp,
    headPitchDeg,
    forwardHead,
    forwardHeadDeg,
    roundedShoulders,
    roundedValue,
    pelvicStatus,
    pelvicDegrees,
  };
}

function severityFromThresholds(
  value: number,
  thresholds: { mild: number; moderate: number; significant: number },
): PostureFindingSeverity {
  const v = Math.abs(value);
  if (v >= thresholds.significant) return 'significant';
  if (v >= thresholds.moderate) return 'moderate';
  if (v >= thresholds.mild) return 'mild';
  return 'aligned';
}

function recordFromDef(
  def: PostureFeedbackDefinition,
  view: PostureFindingViewId,
  measuredValue: number,
  unit: PostureFindingUnit,
  severity: PostureFindingSeverity,
): PostureFindingRecord | null {
  if (severity === 'aligned') return null;
  const copy = def.feedback[severity];
  return {
    id: def.id,
    view,
    measuredValue,
    unit,
    severity,
    name: def.name,
    whatItMeans: copy.what_it_means,
    whatWellDo: copy.what_well_do,
    priority: def.priority,
  };
}

function findingsFromCues(
  view: PostureFindingViewId,
  cues: OverlaySideCues,
): PostureFindingRecord[] {
  const out: PostureFindingRecord[] = [];
  const push = (rec: PostureFindingRecord | null) => {
    if (rec) out.push(rec);
  };

  if (cues.headPitchUp) {
    const def = getPostureFeedbackDefinition('head_pitch_up');
    if (def) {
      const deg = Math.abs(cues.headPitchDeg);
      push(recordFromDef(def, view, deg, 'degrees', severityFromThresholds(deg, def.thresholds)));
    }
  }

  if (cues.forwardHead) {
    const def = getPostureFeedbackDefinition('forward_head');
    if (def) {
      push(
        recordFromDef(
          def,
          view,
          cues.forwardHeadDeg,
          'degrees',
          severityFromThresholds(cues.forwardHeadDeg, def.thresholds),
        ),
      );
    }
  }

  if (cues.roundedShoulders) {
    const def = getPostureFeedbackDefinition('rounded_shoulders');
    if (def) {
      const sev = severityFromThresholds(cues.roundedValue, def.thresholds);
      push(recordFromDef(def, view, cues.roundedValue, 'pixels', sev === 'aligned' ? 'mild' : sev));
    }
  }

  if (cues.pelvicStatus === 'Anterior Tilt') {
    const def = getPostureFeedbackDefinition('anterior_pelvic_tilt');
    if (def) {
      push(
        recordFromDef(
          def,
          view,
          cues.pelvicDegrees,
          'degrees',
          severityFromThresholds(cues.pelvicDegrees, def.thresholds),
        ),
      );
    }
  }

  if (cues.pelvicStatus === 'Posterior Tilt') {
    const def = getPostureFeedbackDefinition('posterior_pelvic_tilt');
    if (def) {
      push(
        recordFromDef(
          def,
          view,
          cues.pelvicDegrees,
          'degrees',
          severityFromThresholds(cues.pelvicDegrees, def.thresholds),
        ),
      );
    }
  }

  return out;
}

/**
 * Merge live pose-on-photo cues into saved analysis so the report can mark
 * APT / rounded shoulders that capture-time Neutral missed.
 */
export function enrichPostureAnalysisFromOverlay(
  view: PostureFindingViewId,
  analysis: PostureAnalysisResult | undefined,
  overlay: OverlaySkeleton | undefined,
): PostureAnalysisResult | undefined {
  if (!analysis) return undefined;
  if (!overlay) return analysis;

  const withOverlay: PostureAnalysisResult = {
    ...analysis,
    landmarks: { ...analysis.landmarks, overlay },
  };

  const cues = overlaySideCues(view, overlay);
  if (!cues) return withOverlay;

  const live = findingsFromCues(view, cues);
  const byId = new Map((analysis.structuredFindings ?? []).map((f) => [f.id, f]));
  for (const rec of live) {
    byId.set(rec.id, rec);
  }

  return {
    ...withOverlay,
    pelvic_tilt:
      cues.pelvicStatus === 'Anterior Tilt'
        ? {
            status: 'Anterior Tilt',
            anterior_tilt_degrees: cues.pelvicDegrees,
            description: analysis.pelvic_tilt.description,
          }
        : cues.pelvicStatus === 'Posterior Tilt'
          ? {
              status: 'Posterior Tilt',
              anterior_tilt_degrees: cues.pelvicDegrees,
              description: analysis.pelvic_tilt.description,
            }
          : analysis.pelvic_tilt,
    shoulder_alignment: cues.roundedShoulders
      ? { ...analysis.shoulder_alignment, rounded_forward: true }
      : analysis.shoulder_alignment,
    structuredFindings: [...byId.values()],
  };
}
