import { describe, expect, it } from 'vitest';
import { layoutTapeLabels, tapeCallout, tapeFigureGender, tapeSite } from './tapeAnatomy';

const SAMPLE_SITES = [
  'Shoulders',
  'Chest',
  'Right arm',
  'Left arm',
  'Waist',
  'Hips',
  'Right thigh',
  'Left thigh',
  'Right calf',
  'Left calf',
];

describe('tapeCallout', () => {
  it('places each captured site on the figure, with left and right opposite', () => {
    expect(tapeCallout('Waist')?.side).toBe('left');
    expect(tapeCallout('Left arm')?.side).toBe('right');
    expect(tapeCallout('Right arm')?.side).toBe('left');
    expect(tapeCallout('Neck')).toBeNull();
  });

  it('uses the female figure landmarks for female clients', () => {
    expect(tapeFigureGender('female')).toBe('female');
    expect(tapeFigureGender('Female')).toBe('female');
    expect(tapeFigureGender('male')).toBe('male');
    expect(tapeSite('Hips', 'female')?.anchor).toBeLessThan(tapeSite('Hips', 'male')!.anchor);
  });
});

describe('layoutTapeLabels', () => {
  it('keeps callouts on the same side from overlapping', () => {
    for (const gender of ['male', 'female'] as const) {
      const placed = layoutTapeLabels(SAMPLE_SITES, gender);
      for (const side of ['left', 'right'] as const) {
        const labels = placed
          .filter((item) => item.side === side)
          .map((item) => item.label)
          .sort((a, b) => a - b);
        for (let index = 1; index < labels.length; index += 1) {
          expect(labels[index]! - labels[index - 1]!).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });
});
