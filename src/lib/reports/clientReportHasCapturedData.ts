import type { FormData } from '@/contexts/FormContext';

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

function hasPositiveNumber(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0;
}

/**
 * True when the saved assessment has at least one captured signal the AXIS
 * report can render. Uses current and legacy field names so older sessions
 * still open in the v2 document.
 */
export function clientReportHasCapturedData(formData: FormData | undefined): boolean {
  if (!formData) return false;

  if (
    hasPositiveNumber(formData.inbodyWeightKg) ||
    hasPositiveNumber(formData.inbodyBodyFatPct) ||
    hasPositiveNumber(formData.skeletalMuscleMassKg) ||
    hasPositiveNumber(formData.waistCm) ||
    hasPositiveNumber(formData.hipsCm) ||
    hasPositiveNumber(formData.hipCm) ||
    hasPositiveNumber(formData.chestCm) ||
    hasPositiveNumber(formData.shouldersCm) ||
    hasPositiveNumber(formData.armLeftCm) ||
    hasPositiveNumber(formData.armRightCm) ||
    hasPositiveNumber(formData.thighLeftCm) ||
    hasPositiveNumber(formData.thighRightCm) ||
    hasPositiveNumber(formData.calfLeftCm) ||
    hasPositiveNumber(formData.calfRightCm)
  ) {
    return true;
  }

  if (
    hasPositiveNumber(formData.pushupsOneMinuteReps) ||
    hasPositiveNumber(formData.pushupMaxReps) ||
    hasPositiveNumber(formData.squatsOneMinuteReps) ||
    hasPositiveNumber(formData.plankDurationSeconds) ||
    hasPositiveNumber(formData.gripLeftKg) ||
    hasPositiveNumber(formData.gripRightKg) ||
    hasPositiveNumber(formData.gripDeadhangSeconds) ||
    hasPositiveNumber(formData.gripPlatePinchSeconds)
  ) {
    return true;
  }

  if (
    hasPositiveNumber(formData.cardioRestingHr) ||
    hasPositiveNumber(formData.cardioPeakHr) ||
    hasPositiveNumber(formData.cardioPost1MinHr) ||
    hasPositiveNumber(formData.restingHeartRate)
  ) {
    return true;
  }

  if (
    formData.postureAiResults ||
    hasText(formData.postureHeadOverall) ||
    hasText(formData.postureShouldersOverall) ||
    hasText(formData.ohsKneeAlignment) ||
    hasText(formData.ohsSquatDepth) ||
    hasText(formData.lungeLeftKneeAlignment)
  ) {
    return true;
  }

  if (
    hasText(formData.sleepArchetype) ||
    hasText(formData.sleepQuality) ||
    hasText(formData.sleepDuration) ||
    hasText(formData.stressLevel) ||
    hasText(formData.hydrationHabits) ||
    hasText(formData.nutritionHabits) ||
    hasText(formData.activityLevel) ||
    hasPositiveNumber(formData.stepsPerDay) ||
    hasPositiveNumber(formData.caffeineCupsPerDay) ||
    hasText(formData.lastCaffeineIntake)
  ) {
    return true;
  }

  return false;
}
