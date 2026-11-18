import { describe, expect, it } from 'vitest';
import { priorAssessmentComparison } from './baselineClientRecord';

describe('first assessment comparison', () => {
  it('does not compare a new baseline with a draft profile', () => {
    expect(priorAssessmentComparison({assessmentCount:0},71)).toEqual({});
    expect(priorAssessmentComparison({assessmentCount:0,overallScore:0},71)).toEqual({});
  });
  it('does not compare with a legacy intake-only profile', () => {
    expect(priorAssessmentComparison({clientName:'Saved Client'},71)).toEqual({});
  });
  it('retains genuine prior comparisons, including a real zero score', () => {
    expect(priorAssessmentComparison({assessmentCount:1,overallScore:65},71)).toEqual({previousScore:65,trend:6});
    expect(priorAssessmentComparison({assessmentCount:1,overallScore:0},71)).toEqual({previousScore:0,trend:71});
    expect(priorAssessmentComparison({overallScore:65},71)).toEqual({previousScore:65,trend:6});
  });
});
