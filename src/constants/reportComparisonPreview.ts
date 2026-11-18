import { SAMPLE_PREVIEW_FORM } from './sampleClientReport';
import { buildAssessmentComparison } from '@/lib/reports/assessmentComparison';
import { computeScores } from '@/lib/scoring';
import type { FormData } from '@/types/assessmentForm';

/** Demonstration only: two synthetic captures, never appended to a real client. */
export const COMPARISON_PREVIOUS_FORM: FormData = {
  ...SAMPLE_PREVIEW_FORM,
  fullName: 'Progress example (synthetic)', assessedAt: '2026-07-27T12:00:00.000Z',
  pushupsOneMinuteReps: '24', squatsOneMinuteReps: '34', plankDurationSeconds: '50',
  gripLeftKg: '34', gripRightKg: '36', cardioRestingHr: '78', cardioPeakHr: '152', cardioPost1MinHr: '124',
  treadmillProtocol: 'incline-walk-3min-speed5-incline10-recovery1min',
};
export const COMPARISON_CURRENT_FORM: FormData = {
  ...COMPARISON_PREVIOUS_FORM,
  assessedAt: '2026-11-16T12:00:00.000Z',
  inbodyWeightKg: '78.2', inbodyBodyFatPct: '29.2', skeletalMuscleMassKg: '32.0',
  pushupsOneMinuteReps: '29', squatsOneMinuteReps: '42', plankDurationSeconds: '77',
  gripLeftKg: '36', gripRightKg: '38', cardioRestingHr: '72', cardioPost1MinHr: '116',
  waistCm: '89.4', hipsCm: '102', shouldersCm: '119', chestCm: '105',
  armLeftCm: '34.0', armRightCm: '34.3', thighLeftCm: '59', thighRightCm: '59.2',
};
export const COMPARISON_PREVIEW = buildAssessmentComparison(COMPARISON_CURRENT_FORM, [
  { id: 'synthetic-current', type: 'full-assessment', formData: COMPARISON_CURRENT_FORM },
  { id: 'synthetic-previous', type: 'full-assessment', formData: COMPARISON_PREVIOUS_FORM },
]);
export const COMPARISON_CURRENT_SCORES = computeScores(COMPARISON_CURRENT_FORM);
export const COMPARISON_PREVIOUS_SCORES = computeScores(COMPARISON_PREVIOUS_FORM);
