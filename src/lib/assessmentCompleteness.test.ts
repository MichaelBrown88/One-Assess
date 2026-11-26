import { completeBaseline } from '@/test/fixtures/completeBaseline';
import { missingBaselineSections } from '@/lib/assessment/baselineReadiness';
import { describe, expect, it } from 'vitest';
import { createEmptyAssessmentForm } from '@/contexts/FormContext';
import { isAssessmentComplete } from '@/lib/assessmentCompleteness';

describe('isAssessmentComplete', () => {
  it('returns false when client name is missing (full mode)', () => {
    const form = createEmptyAssessmentForm();
    expect(isAssessmentComplete(form, 'full')).toBe(false);
  });

  it('returns false when client name is missing (partial mode)', () => {
    const form = createEmptyAssessmentForm();
    expect(isAssessmentComplete(form, 'partial', 'bodycomp')).toBe(false);
  });

  it('returns false for full mode when name exists but no pillar has score data', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    expect(isAssessmentComplete(form, 'full')).toBe(false);
  });

  it('returns false for partial bodycomp when name exists but body comp fields are empty', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    expect(isAssessmentComplete(form, 'partial', 'bodycomp')).toBe(false);
  });

  it('does not mistake one scored pillar for a complete baseline', () => {
    const form = createEmptyAssessmentForm();
    form.fullName = 'Test Client';
    form.dateOfBirth = '1990-06-01';
    form.gender = 'male';
    form.inbodyBodyFatPct = '22';
    expect(isAssessmentComplete(form, 'full')).toBe(false);
  });
});

it('requires every baseline area while allowing measured zeros and optional analyzer fields', () => {
  const form = completeBaseline();
  expect(missingBaselineSections(form)).toEqual([]);
  expect(isAssessmentComplete(form, 'full')).toBe(true);
  form.hingeHasPain = '';
  expect(missingBaselineSections(form)).toEqual([{ id: 'hinge-assessment', label: 'Movement: hinge' }]);
  expect(isAssessmentComplete(form, 'full')).toBe(false);
});
it('rejects extra digits and supports alternative grip equipment', () => {
  const form = completeBaseline();
  form.gripLeftKg = form.gripRightKg = '';
  form.gripDeadhangSeconds = '20';
  expect(isAssessmentComplete(form, 'full')).toBe(true);
  form.pushupsOneMinuteReps = '2525';
  expect(isAssessmentComplete(form, 'full')).toBe(false);
});
