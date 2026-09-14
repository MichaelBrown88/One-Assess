import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord } from '@/lib/types/postureFindings';
import { CONFIG } from '@/config';
import { overlaySideCues } from './overlayCues';
import type { OverlayPt, OverlaySkeleton } from './overlaySkeleton';

/** Overlay-canvas percents (same grid as the baked green lines). */
export interface DeviationMark {
  points: Array<{ x: number; y: number }>;
  /** Quadratic control — draws a curve from points[0] to points[1]. */
  control?: OverlayPt;
  role?: 'deviation' | 'reference';
}

const CX = CONFIG.POSTURE_OVERLAY.TARGET_LANDMARKS.CENTER_X_PCT;
const ROUNDED_SHOULDER_MARK_MIN = 0.04;
const PLUMB = CX;

function activeFindings(analysis: PostureAnalysisResult): PostureFindingRecord[] {
  return (analysis.structuredFindings ?? []).filter((f) => f.severity !== 'aligned');
}

function hasFinding(findings: PostureFindingRecord[], id: string): boolean {
  return findings.some((f) => f.id === id);
}

function findingValue(findings: PostureFindingRecord[], id: string): number {
  return Math.abs(findings.find((f) => f.id === id)?.measuredValue ?? 0);
}

function sideFacing(view: string): number {
  return view === 'side-right' ? 1 : -1;
}

function extendSegment(a: OverlayPt, b: OverlayPt, pad: number): [OverlayPt, OverlayPt] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return [
    { x: a.x - ux * pad, y: a.y - uy * pad },
    { x: b.x + ux * pad, y: b.y + uy * pad },
  ];
}

function overlayOf(analysis: PostureAnalysisResult): OverlaySkeleton | undefined {
  return analysis.landmarks?.overlay;
}

/**
 * Red deviation strokes in 0–100 overlay space.
 * Prefers the persisted pose skeleton (ear, eye, hips) over the capture grid.
 */
export function postureDeviationMarks(
  view: string,
  analysis: PostureAnalysisResult,
): DeviationMark[] {
  const findings = activeFindings(analysis);
  if (view === 'front' || view === 'back') {
    return frontBackMarks(view, analysis, findings);
  }
  return sideMarks(view, analysis, findings);
}

function frontBackMarks(
  view: string,
  analysis: PostureAnalysisResult,
  findings: PostureFindingRecord[],
): DeviationMark[] {
  const marks: DeviationMark[] = [];
  const overlay = overlayOf(analysis);
  const subjectLeft = view === 'back' ? -1 : 1;

  if (hasFinding(findings, 'lateral_pelvic_shift') || (analysis.hip_shift && analysis.hip_shift.status !== 'Centered')) {
    const hip = overlay?.hip;
    if (hip) {
      marks.push({ points: [{ x: PLUMB, y: hip.y }, { x: hip.x, y: hip.y }] });
      marks.push({ points: [{ x: hip.x, y: hip.y - 3 }, { x: hip.x, y: hip.y + 3 }] });
    }
  }

  if (hasFinding(findings, 'uneven_hip_height') || (analysis.hip_alignment && analysis.hip_alignment.status !== 'Neutral')) {
    if (overlay?.hipL && overlay.hipR) {
      marks.push({ points: [overlay.hipL, overlay.hipR] });
    }
  }

  if (hasFinding(findings, 'shoulder_asymmetry') || (analysis.shoulder_alignment && analysis.shoulder_alignment.status === 'Asymmetric')) {
    if (overlay?.shoulderL && overlay.shoulderR) {
      marks.push({ points: [overlay.shoulderL, overlay.shoulderR] });
    }
  }

  if (hasFinding(findings, 'spinal_lateral_shift') && analysis.spinal_curvature && analysis.spinal_curvature.status !== 'Aligned') {
    if (overlay?.shoulder && overlay.hip) {
      const bulge = analysis.spinal_curvature.curve_direction === 'left-leaning' ? subjectLeft : -subjectLeft;
      const midX = (overlay.shoulder.x + overlay.hip.x) / 2 + bulge * 4;
      marks.push({
        points: [overlay.shoulder, overlay.hip],
        control: { x: midX, y: (overlay.shoulder.y + overlay.hip.y) / 2 },
      });
    }
  }

  return marks;
}

function sideMarks(
  view: string,
  analysis: PostureAnalysisResult,
  findings: PostureFindingRecord[],
): DeviationMark[] {
  const marks: DeviationMark[] = [];
  const overlay = overlayOf(analysis);
  const facing = sideFacing(view);
  const ear = overlay?.ear;
  const eye = overlay?.eye;
  const shoulder = overlay?.shoulder;
  const hip = overlay?.hip;
  const ankle = overlay?.ankle;
  const plumbX = ankle?.x ?? PLUMB;
  const cues = overlay ? overlaySideCues(view, overlay) : undefined;

  if (
    ear &&
    eye &&
    (cues?.headPitchUp ||
      hasFinding(findings, 'head_pitch_up') ||
      analysis.head_updown?.status === 'Looking Up' ||
      analysis.head_updown?.status === 'Looking Down')
  ) {
    const [a, b] = extendSegment(ear, eye, 1.4);
    marks.push({ points: [a, b] });
    marks.push({
      role: 'reference',
      points: [
        { x: ear.x - facing * 3.5, y: ear.y },
        { x: ear.x + facing * 3.5, y: ear.y },
      ],
    });
  }

  if (
    ear &&
    (cues?.forwardHead ||
      hasFinding(findings, 'forward_head') ||
      (analysis.forward_head && analysis.forward_head.status !== 'Neutral'))
  ) {
    marks.push({ points: [{ x: plumbX, y: ear.y }, { x: ear.x, y: ear.y }] });
  }

  const roundedValue = Math.max(findingValue(findings, 'rounded_shoulders'), cues?.roundedValue ?? 0);
  const kyphosisOff = Boolean(analysis.kyphosis?.status && analysis.kyphosis.status !== 'Within range');
  const apt =
    cues?.pelvicStatus === 'Anterior Tilt' ||
    hasFinding(findings, 'anterior_pelvic_tilt') ||
    analysis.pelvic_tilt?.status === 'Anterior Tilt';
  const ppt =
    cues?.pelvicStatus === 'Posterior Tilt' ||
    hasFinding(findings, 'posterior_pelvic_tilt') ||
    analysis.pelvic_tilt?.status === 'Posterior Tilt';
  const showUpperBack =
    Boolean(shoulder) &&
    (cues?.roundedShoulders ||
      kyphosisOff ||
      apt ||
      (hasFinding(findings, 'rounded_shoulders') && roundedValue >= ROUNDED_SHOULDER_MARK_MIN));
  if (showUpperBack && shoulder) {
    marks.push(roundedUpperBackMark(ear, shoulder, hip));
  }
  if (hip && apt) {
    marks.push({ points: [{ x: plumbX, y: hip.y }, { x: hip.x, y: hip.y }] });
    marks.push(pelvicTiltMark(facing, 1, hip, plumbX));
  }
  if (hip && ppt) {
    marks.push(pelvicTiltMark(facing, -1, hip, plumbX));
  }

  return marks;
}

function roundedUpperBackMark(
  ear: OverlayPt | undefined,
  shoulder: OverlayPt,
  hip: OverlayPt | undefined,
): DeviationMark {
  const start = ear ?? { x: shoulder.x, y: shoulder.y - 6 };
  const end = hip ?? { x: shoulder.x, y: shoulder.y + 12 };
  return {
    points: [start, end],
    control: shoulder,
  };
}

function pelvicTiltMark(
  facing: number,
  anteriorSign: number,
  hip: OverlayPt,
  _plumbX: number,
): DeviationMark {
  const lift = 1.6 * anteriorSign * facing;
  return {
    points: [
      { x: hip.x - 5.5, y: hip.y - lift },
      { x: hip.x + 5.5, y: hip.y + lift },
    ],
  };
}
