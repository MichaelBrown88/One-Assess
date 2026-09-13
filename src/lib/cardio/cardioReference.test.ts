import { describe, expect, it } from 'vitest';
import {
  ageBracketFor,
  buildCardioReference,
  classifyHrrDropBand,
  classifyPeakWalkBand,
  classifyRestingHrBand,
  estimatedMaxHr,
} from './cardioReference';

describe('cardioReference', () => {
  it('maps Ibrahim-age into the 26–35 bracket', () => {
    expect(ageBracketFor(31)).toBe('26-35');
  });

  it('classifies resting HR for a 31-year-old male', () => {
    expect(classifyRestingHrBand(61, 'male', 31)).toBe('excellent');
    expect(classifyRestingHrBand(68, 'male', 31)).toBe('good');
    expect(classifyRestingHrBand(73, 'male', 31)).toBe('average');
    expect(classifyRestingHrBand(75, 'male', 31)).toBe('poor');
  });

  it('treats a bigger 1-minute drop as better', () => {
    expect(classifyHrrDropBand(31)).toBe('excellent');
    expect(classifyHrrDropBand(22)).toBe('good');
    expect(classifyHrrDropBand(15)).toBe('average');
    expect(classifyHrrDropBand(10)).toBe('poor');
  });

  it('treats a lower % of max on the standard walk as fitter', () => {
    const maxHr = estimatedMaxHr(31);
    expect(maxHr).toBeCloseTo(186.3, 1);
    expect(classifyPeakWalkBand(110, 31)).toBe('excellent');
    expect(classifyPeakWalkBand(152, 31)).toBe('poor');
  });

  it('builds a debrief chart for Ibrahim-like inputs', () => {
    const chart = buildCardioReference({
      age: 31,
      gender: 'male',
      restingHr: 75,
      peakHr: 152,
      recoveryHr: 121,
    });

    expect(chart.bracketLabel).toBe('Men 26–35');
    expect(chart.metrics).toHaveLength(3);
    expect(chart.metrics[0].id).toBe('rhr');
    expect(chart.metrics[0].band).toBe('poor');
    expect(chart.metrics[1].id).toBe('peak');
    expect(chart.metrics[1].band).toBe('poor');
    expect(chart.metrics[2].id).toBe('hrr');
    expect(chart.metrics[2].band).toBe('excellent');
    expect(chart.metrics[2].value).toBe(31);
  });
});
