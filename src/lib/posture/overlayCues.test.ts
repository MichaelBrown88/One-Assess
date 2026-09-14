import { describe, expect, it } from 'vitest';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { enrichPostureAnalysisFromOverlay, overlaySideCues } from './overlayCues';

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
  structuredFindings: [],
} as PostureAnalysisResult;

describe('overlaySideCues', () => {
  it('flags anterior pelvic tilt when the hip sits forward of the shoulder–ankle line', () => {
    const cues = overlaySideCues('side-left', {
      ear: { x: 49, y: 17 },
      eye: { x: 45, y: 16.5 },
      shoulder: { x: 50, y: 26 },
      hip: { x: 46.5, y: 51 },
      knee: { x: 50, y: 72 },
      ankle: { x: 50, y: 88 },
    });
    expect(cues?.pelvicStatus).toBe('Anterior Tilt');
  });

  it('flags rounded shoulders when the shoulder sits anterior of the hip', () => {
    const cues = overlaySideCues('side-right', {
      ear: { x: 51, y: 17 },
      eye: { x: 55, y: 16.5 },
      shoulder: { x: 56, y: 27 },
      hip: { x: 50, y: 51 },
      ankle: { x: 50, y: 88 },
    });
    expect(cues?.roundedShoulders).toBe(true);
    expect(cues?.roundedValue).toBeGreaterThanOrEqual(0.02);
  });
});

describe('enrichPostureAnalysisFromOverlay', () => {
  it('adds APT and rounded-shoulder findings the saved scan missed', () => {
    const enriched = enrichPostureAnalysisFromOverlay('side-right', emptyAnalysis, {
      ear: { x: 51, y: 17 },
      eye: { x: 56, y: 14.8 },
      shoulder: { x: 57, y: 27 },
      hip: { x: 52, y: 51 },
      knee: { x: 50, y: 72 },
      ankle: { x: 50, y: 88 },
    });
    const ids = (enriched?.structuredFindings ?? []).map((f) => f.id);
    expect(ids).toContain('anterior_pelvic_tilt');
    expect(ids).toContain('rounded_shoulders');
    expect(enriched?.pelvic_tilt.status).toBe('Anterior Tilt');
  });
});
