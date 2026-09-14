import { describe, expect, it } from 'vitest';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord } from '@/lib/types/postureFindings';
import { postureDeviationMarks } from './postureDeviationMarks';

function finding(id: string, extras: Partial<PostureFindingRecord> = {}): PostureFindingRecord {
  return {
    id,
    view: 'front',
    measuredValue: 6.18,
    unit: 'pixels',
    severity: 'moderate',
    name: id,
    whatItMeans: '',
    whatWellDo: '',
    priority: 'high',
    ...extras,
  };
}

const emptyAnalysis = {
  forward_head: { status: 'Neutral', deviation_degrees: 0, description: '' },
  shoulder_alignment: { status: 'Neutral', rounded_forward: false, description: '' },
  kyphosis: { status: 'Within range', curve_degrees: 0, description: '' },
  lordosis: { status: 'Within range', curve_degrees: 0, description: '' },
  pelvic_tilt: { status: 'Neutral', description: '' },
  hip_alignment: { status: 'Neutral', description: '' },
  deviations: [],
  risk_flags: [],
  overall_assessment: '',
} as PostureAnalysisResult;

describe('postureDeviationMarks', () => {
  it('draws a hip offset for lateral pelvic shift on the front view', () => {
    const marks = postureDeviationMarks('front', {
      ...emptyAnalysis,
      landmarks: { overlay: { hip: { x: 46.4, y: 51 } } },
      hip_shift: {
        status: 'Shifted Left',
        severity: 'Moderate',
        shift_percent: 6.18,
        description: '',
      },
      structuredFindings: [finding('lateral_pelvic_shift')],
    });
    expect(marks.length).toBeGreaterThanOrEqual(2);
    const connector = marks[0];
    expect(connector?.points[0]?.x).toBe(50);
    expect(connector?.points[0]?.y).toBe(51);
    expect(connector?.points[1]?.x).toBe(46.4);
  });

  it('does not invent a head-pitch bar without ear and eye coordinates', () => {
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      head_updown: {
        status: 'Looking Up',
        severity: 'Moderate',
        description: '',
      },
      structuredFindings: [finding('head_pitch_up', { view: 'side-left', unit: 'degrees', measuredValue: 20 })],
    });
    expect(marks).toEqual([]);
  });

  it('runs the head-pitch line through the ear and eye when overlay points exist', () => {
    const ear = { x: 49, y: 17.2 };
    const eye = { x: 45.5, y: 15.4 };
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      landmarks: { overlay: { ear, eye, shoulder: { x: 50, y: 25 }, hip: { x: 50, y: 50 }, ankle: { x: 50, y: 88 } } },
      head_updown: {
        status: 'Looking Up',
        severity: 'Moderate',
        description: '',
      },
      structuredFindings: [finding('head_pitch_up', { view: 'side-left', unit: 'degrees', measuredValue: 20 })],
    });
    const deviation = marks.find((m) => m.role !== 'reference');
    const [a, b] = deviation?.points ?? [];
    expect(a && b).toBeTruthy();
    const onSegment = (p: { x: number; y: number }) => {
      const along = Math.abs((p.x - a!.x) * (b!.y - a!.y) - (p.y - a!.y) * (b!.x - a!.x));
      expect(along).toBeLessThan(2);
    };
    onSegment(ear);
    onSegment(eye);
  });

  it('draws a thoracic curve for rounded shoulders from shoulder landmarks', () => {
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      landmarks: {
        overlay: {
          ear: { x: 49, y: 17 },
          shoulder: { x: 52, y: 26 },
          hip: { x: 50, y: 50 },
        },
      },
      structuredFindings: [finding('rounded_shoulders', { view: 'side-left', measuredValue: 0.06, unit: 'pixels', severity: 'moderate' })],
    });
    expect(marks.some((m) => m.control)).toBe(true);
  });

  it('does not mark sub-threshold rounded shoulders', () => {
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      structuredFindings: [finding('rounded_shoulders', { view: 'side-left', measuredValue: 0.03, unit: 'pixels', severity: 'mild' })],
    });
    expect(marks).toEqual([]);
  });

  it('draws a short hip tick for anterior pelvic tilt', () => {
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      landmarks: { overlay: { hip: { x: 51, y: 50 } } },
      pelvic_tilt: { status: 'Anterior Tilt', anterior_tilt_degrees: 8, description: '' },
      structuredFindings: [finding('anterior_pelvic_tilt', { view: 'side-left', unit: 'degrees', measuredValue: 8 })],
    });
    expect(marks.length).toBeGreaterThanOrEqual(1);
    const tilt = marks.find((m) => Math.abs((m.points[0]?.x ?? 0) - (m.points[1]?.x ?? 0)) > 6);
    const [a, b] = tilt?.points ?? [];
    expect(a && b).toBeTruthy();
    expect(((a?.y ?? 0) + (b?.y ?? 0)) / 2).toBeCloseTo(50, 0);
    expect(Math.abs((a?.x ?? 0) - (b?.x ?? 0))).toBeLessThan(14);
  });

  it('draws APT and a thoracic curve from live pose even when the saved scan said Neutral', () => {
    const marks = postureDeviationMarks('side-left', {
      ...emptyAnalysis,
      landmarks: {
        overlay: {
          ear: { x: 49, y: 17 },
          eye: { x: 44, y: 15.2 },
          shoulder: { x: 44, y: 27 },
          hip: { x: 49, y: 51 },
          knee: { x: 50, y: 72 },
          ankle: { x: 52, y: 88 },
        },
      },
    });
    expect(marks.some((m) => m.control)).toBe(true);
    expect(
      marks.some((m) => m.points.some((p) => p.y > 48 && p.y < 54)),
    ).toBe(true);
  });

  it('draws nothing when the view is balanced', () => {
    expect(postureDeviationMarks('back', emptyAnalysis)).toEqual([]);
  });
});
