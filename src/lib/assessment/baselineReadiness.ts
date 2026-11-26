import type { FormData } from '@/contexts/FormContext';

export interface MissingAssessmentSection { id: string; label: string }
const TAPE = ['shouldersCm', 'chestCm', 'armLeftCm', 'armRightCm', 'waistCm', 'hipsCm', 'thighLeftCm', 'thighRightCm', 'calfLeftCm', 'calfRightCm'] as const;
const HABITS = ['sleepHours', 'sleepRegularity', 'stressFrequency', 'stressCoping', 'exerciseMinutesWeek', 'strengthDaysWeek', 'proteinMeals', 'fruitVegPortions', 'takeawaysWeek'] as const;

/** Readiness is based on captured observations, never on scores (zero is a result). */
export function missingBaselineSections(form: Partial<FormData>): MissingAssessmentSection[] {
  const has = (id: keyof FormData) => {
    const value = form[id];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== '';
  };
  const all = (ids: readonly (keyof FormData)[]) => ids.every(has);
  const manualPosture = all(['postureHeadOverall', 'postureShouldersOverall', 'postureBackOverall', 'postureHipsOverall', 'postureKneesOverall']);
  const photos = ['front', 'side-left', 'back', 'side-right'].every(view =>
    Boolean(form.postureImages?.[view] || form.postureImagesStorage?.[view] || form[`postureRemotePath_${view}` as keyof FormData]));
  const checks: Array<[string, string, boolean]> = [
    ['basic-client-info', 'Client details', all(['fullName', 'email', 'gender', 'trainingHistory', 'recentActivity'])],
    ['lifestyle-overview', 'Lifestyle and goals', has('activityLevel') && has('clientGoals') &&
      (all(HABITS) || all(['sleepArchetype', 'stressLevel', 'nutritionHabits', 'hydrationHabits']))],
    ['fitness-assessment', 'Fitness: three heart-rate readings', all(['cardioRestingHr', 'cardioPeakHr', 'cardioPost1MinHr'])],
    ['overhead-squat', 'Movement: overhead squat', all(['ohsKneeAlignment', 'ohsHasPain'])],
    ['hinge-assessment', 'Movement: hinge', all(['hingeBackRounding', 'hingeHasPain'])],
    ['lunge-assessment', 'Movement: lunge', all(['lungeLeftBalance', 'lungeRightBalance', 'lungeHasPain'])],
    ['strength-endurance', 'Strength: upper body, legs, core and grip', all(['pushupsOneMinuteReps', 'plankDurationSeconds']) && (has('pushupType') || has('squatsOneMinuteReps')) &&
      (all(['singleLegStandLeftReps', 'singleLegStandRightReps']) || has('squatsOneMinuteReps')) && (has('gripLeftKg') || has('gripRightKg') || has('gripDeadhangSeconds') || has('gripPlatePinchSeconds'))],
    ['inbody-results', 'Body composition: height, weight, body fat and muscle', all(['heightCm', 'inbodyWeightKg', 'inbodyBodyFatPct', 'skeletalMuscleMassKg'])],
    ['tape-measurements', 'Tape measurements: all ten sites', all(TAPE)],
    ['posture', 'Posture: four photos or manual observations', photos || manualPosture],
  ];
  return checks.filter(([, , complete]) => !complete).map(([id, label]) => ({ id, label }));
}
