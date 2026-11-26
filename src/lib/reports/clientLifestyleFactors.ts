import { scoreLifestyle } from '@/lib/scoring/lifestyleScoring';
/**
 * Lifestyle rows for the AXIS report — label, captured value, status, and a
 * short habit tip. Alcohol is collected in assessment but never shown here.
 */

import type { FormData } from '@/contexts/FormContext';
import {
  CLIENT_REPORT_COPY,
  LIFESTYLE_FACTOR_ADVICE,
  LIFESTYLE_FACTOR_LABELS,
  clientLifestyleNutritionAdvice,
} from '@/constants/clientReport';
import { habitFactorLabel, habitFactorScores, hasHabitAnswers, type HabitFactor } from '@/lib/scoring/lifestyleHabits';

export { clientLifestyleNutritionAdvice };

export type LifestyleFactorTone = 'good' | 'concern' | 'critical' | 'unknown';

export type LifestyleFactorId =
  | 'sleep'
  | 'stress'
  | 'nutrition'
  | 'hydration'
  | 'activity'
  | 'sedentary'
  | 'caffeine';

export interface LifestyleFactorRow {
  id: LifestyleFactorId;
  label: string;
  value: string;
  tone: LifestyleFactorTone;
  advice: string;
}

export interface LifestyleNutritionTargets {
  calories: number | null;
  proteinG: number | null;
}

export function lifestyleStatusLabel(tone: LifestyleFactorTone): string {
  if (tone === 'good') return CLIENT_REPORT_COPY.v2LifestyleStatusOnTrack;
  if (tone === 'concern') return CLIENT_REPORT_COPY.v2LifestyleStatusImprove;
  if (tone === 'critical') return CLIENT_REPORT_COPY.v2LifestyleStatusFocus;
  return '–';
}

export function buildLifestyleFactorRows(
  formData: FormData | undefined,
  nutritionTargets?: LifestyleNutritionTargets,
): LifestyleFactorRow[] {
  if (!formData) return [];

  const factors: LifestyleFactorRow[] = [];
  const scored = scoreLifestyle(formData, 0, '').details ?? [];
  const scoreTone = (id: string): LifestyleFactorTone => {
    const score = scored.find(detail => detail.id === id)?.score;
    return score == null ? 'unknown' : score >= 75 ? 'good' : score >= 50 ? 'concern' : 'critical';
  };
  const habits = habitFactorScores(formData);
  const habitTone = (score: number | null): LifestyleFactorTone =>
    score === null ? 'unknown' : score >= 75 ? 'good' : score >= 50 ? 'concern' : 'critical';
  const habitRow = (factor: HabitFactor, label: string, advice: string): LifestyleFactorRow | null =>
    hasHabitAnswers(formData, factor)
      ? { id: factor, label, value: habitFactorLabel(formData, factor), tone: scoreTone(factor), advice }
      : null;

  const sleepArch = (formData.sleepArchetype || '').toLowerCase();
  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepC = (formData.sleepConsistency || '').toLowerCase();
  const sleepDur = (formData.sleepDuration || '').toLowerCase();
  const sleepHabit = habitRow('sleep', LIFESTYLE_FACTOR_LABELS.sleep, LIFESTYLE_FACTOR_ADVICE.sleep);
  if (sleepHabit) {
    factors.push(sleepHabit);
  } else if (sleepArch || sleepQ || sleepDur) {
    const sleepLabel = sleepArch
      ? capitalise(sleepArch.replace(/[-_]/g, ' '))
      : [sleepDur, sleepQ].filter(Boolean).map(capitalise).join(' · ');
    let tone: LifestyleFactorTone = 'good';
    if (sleepArch.includes('disrupted') || sleepArch.includes('insufficient') || sleepQ === 'poor' || sleepArch === 'poor') {
      tone = 'critical';
    } else if (sleepArch.includes('fragmented') || sleepQ === 'fair' || sleepArch === 'fair' || sleepC.includes('inconsistent')) {
      tone = 'concern';
    }
    factors.push({
      id: 'sleep',
      label: LIFESTYLE_FACTOR_LABELS.sleep,
      value: sleepArch === 'good' ? 'Enough sleep, variable routine or quality' : sleepLabel || '–',
      tone: scoreTone('sleep'),
      advice: LIFESTYLE_FACTOR_ADVICE.sleep,
    });
  }

  const stress = (formData.stressLevel || '').toLowerCase();
  const stressHabit = habitRow('stress', LIFESTYLE_FACTOR_LABELS.stress, LIFESTYLE_FACTOR_ADVICE.stress);
  if (stressHabit) {
    factors.push(stressHabit);
  } else if (stress) {
    let tone: LifestyleFactorTone = 'good';
    if (stress === 'very-high' || stress === 'high') tone = 'critical';
    else if (stress === 'moderate' || stress.includes('moderate')) tone = 'concern';
    factors.push({
      id: 'stress',
      label: LIFESTYLE_FACTOR_LABELS.stress,
      value: capitalise(stress.replace(/-/g, ' ')),
      tone,
      advice: LIFESTYLE_FACTOR_ADVICE.stress,
    });
  }

  const nutrition = (formData.nutritionHabits || '').toLowerCase();
  const nutritionHabit = habitRow('nutrition', LIFESTYLE_FACTOR_LABELS.nutrition, clientLifestyleNutritionAdvice(nutritionTargets?.calories, nutritionTargets?.proteinG));
  if (nutritionHabit) {
    factors.push(nutritionHabit);
  } else if (nutrition) {
    let tone: LifestyleFactorTone = 'good';
    if (nutrition === 'poor') tone = 'critical';
    else if (nutrition === 'fair') tone = 'concern';
    factors.push({
      id: 'nutrition',
      label: LIFESTYLE_FACTOR_LABELS.nutrition,
      value: nutrition === 'good' ? 'Healthy choices, inconsistent routine' : capitalise(nutrition),
      tone: scoreTone('nutrition'),
      advice: clientLifestyleNutritionAdvice(nutritionTargets?.calories, nutritionTargets?.proteinG),
    });
  }

  const hydration = (formData.hydrationHabits || '').toLowerCase();
  if (hydration) {
    let tone: LifestyleFactorTone = 'good';
    if (hydration === 'poor') tone = 'critical';
    else if (hydration === 'fair') tone = 'concern';
    factors.push({
      id: 'hydration',
      label: LIFESTYLE_FACTOR_LABELS.hydration,
      value: hydration === 'good' ? 'Often forgets to drink' : capitalise(hydration),
      tone: scoreTone('hydration'),
      advice: LIFESTYLE_FACTOR_ADVICE.hydration,
    });
  }

  const steps = parseFloat(formData.stepsPerDay || '0');
  const activityHabit = hasHabitAnswers(formData, 'activity')
    ? habitRow('activity', LIFESTYLE_FACTOR_LABELS.activity, (habits.activity ?? 0) >= 90 ? LIFESTYLE_FACTOR_ADVICE.activityStrong : LIFESTYLE_FACTOR_ADVICE.activityAim)
    : null;
  if (activityHabit) {
    factors.push(activityHabit);
  } else if (steps > 0) {
    let tone: LifestyleFactorTone = 'good';
    if (steps < 5000) tone = 'critical';
    else if (steps < 8000) tone = 'concern';
    factors.push({
      id: 'activity',
      label: LIFESTYLE_FACTOR_LABELS.activity,
      value: `${formatThousands(steps)} steps / day`,
      tone,
      advice: steps >= 10000 ? LIFESTYLE_FACTOR_ADVICE.activityStrong : LIFESTYLE_FACTOR_ADVICE.activityAim,
    });
  } else if (formData.activityLevel) {
    factors.push({
      id: 'activity',
      label: LIFESTYLE_FACTOR_LABELS.activityLevel,
      value: capitalise((formData.activityLevel || '').replace(/-/g, ' ')),
      tone: 'good',
      advice: LIFESTYLE_FACTOR_ADVICE.activityAim,
    });
  }

  const sedentary = parseFloat(formData.sedentaryHours || '0');
  if (sedentary > 0) {
    let tone: LifestyleFactorTone = 'good';
    if (sedentary >= 10) tone = 'critical';
    else if (sedentary >= 8) tone = 'concern';
    factors.push({
      id: 'sedentary',
      label: LIFESTYLE_FACTOR_LABELS.sedentary,
      value: `${sedentary.toFixed(sedentary % 1 === 0 ? 0 : 1)} h / day`,
      tone,
      advice: LIFESTYLE_FACTOR_ADVICE.sedentary,
    });
  }

  const cups = parseFloat(formData.caffeineCupsPerDay || '0');
  const lastCaffeine = formData.lastCaffeineIntake || '';
  if (cups > 0 || lastCaffeine) {
    let tone: LifestyleFactorTone = 'good';
    const cutoff = parseInt((lastCaffeine.split(':')[0] || '0'), 10);
    if (cups >= 5 || (lastCaffeine && cutoff >= 16)) tone = 'critical';
    else if (cups >= 3 || (lastCaffeine && cutoff >= 14)) tone = 'concern';
    const parts: string[] = [];
    if (cups > 0) parts.push(`${cups} cup${cups === 1 ? '' : 's'}`);
    if (lastCaffeine) parts.push(`last ${formatTime(lastCaffeine)}`);
    factors.push({
      id: 'caffeine',
      label: LIFESTYLE_FACTOR_LABELS.caffeine,
      value: parts.join(' · '),
      tone,
      advice: LIFESTYLE_FACTOR_ADVICE.caffeine,
    });
  }

  return factors;
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatThousands(n: number): string {
  return n.toLocaleString('en-GB');
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hour = parseInt(h, 10);
  const minute = m ? parseInt(m, 10) : 0;
  if (Number.isNaN(hour)) return hhmm;
  const period = hour >= 12 ? 'pm' : 'am';
  const display = ((hour + 11) % 12) + 1;
  return minute > 0 ? `${display}:${String(minute).padStart(2, '0')} ${period}` : `${display} ${period}`;
}
