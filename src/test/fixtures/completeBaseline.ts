import { createEmptyAssessmentForm, type FormData } from '@/types/assessmentForm';

/** Synthetic baseline. All core observations are present, including legitimate zero repetitions. */
export function completeBaseline(): FormData {
  return { ...createEmptyAssessmentForm(), fullName: 'QA Client', email: 'qa@example.test', gender: 'female', dateOfBirth: '1990-05-15',
    trainingHistory: 'beginner', recentActivity: 'currently-training', activityLevel: 'moderately-active', clientGoals: ['build-muscle'],
    sleepHours: '7-9', sleepRegularity: 'regular', stressFrequency: 'sometimes', stressCoping: 'mostly',
    exerciseMinutesWeek: '150-299', strengthDaysWeek: '2', proteinMeals: 'most', fruitVegPortions: '4', takeawaysWeek: '0-1',
    cardioRestingHr: '74', cardioPeakHr: '148', cardioPost1MinHr: '112', cardioTestSelected: 'treadmill', cardioProtocolVersion: 'incline-walk-4min-v1',
    ohsKneeAlignment: 'stable', ohsHasPain: 'no', hingeBackRounding: 'none', hingeHasPain: 'no', lungeLeftBalance: 'good', lungeRightBalance: 'good', lungeHasPain: 'no',
    pushupsOneMinuteReps: '0', pushupType: 'knees', plankDurationSeconds: '0', singleLegStandLeftReps: '0', singleLegStandRightReps: '0', gripLeftKg: '27', gripRightKg: '29',
    heightCm: '165', inbodyWeightKg: '72', inbodyBodyFatPct: '32', skeletalMuscleMassKg: '26',
    shouldersCm: '103', chestCm: '94', armLeftCm: '29', armRightCm: '29.5', waistCm: '82', hipsCm: '100', thighLeftCm: '58', thighRightCm: '58.5', calfLeftCm: '36', calfRightCm: '36.5',
    postureHeadOverall: ['forward-head'], postureShouldersOverall: ['rounded'], postureBackOverall: ['neutral'], postureHipsOverall: ['neutral'], postureKneesOverall: ['neutral'],
  };
}
