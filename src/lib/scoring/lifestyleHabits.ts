/**
 * Lifestyle habit questions (Nov 2026): behaviours scored against guidelines,
 * replacing the self-rated sleep/stress/nutrition/hydration archetypes.
 * One source for the score of every answer and its plain-language report label.
 *
 * Guideline anchors:
 * - Sleep: 7–9 hours for adults (AASM/SRS 2015 consensus; NSF); regular timing
 *   is linked to better health independent of duration.
 * - Activity: WHO 2020: 150–300 min a week of moderate activity (or 75–150
 *   vigorous) and muscle-strengthening on 2+ days. Steps: benefits from ~8,000.
 * - Nutrition: protein spread across meals; 5+ portions of fruit and veg a day
 *   (WHO / NHS); fewer takeaway or ultra-processed meals.
 * - Stress: two plain One Assess questions (not a validated scale).
 */
import type { FormData } from '@/contexts/FormContext';
import { meanOfMeasured } from './scoringUtils';
import { safeParse } from '@/lib/utils/numbers';

export type HabitFactor = 'sleep' | 'stress' | 'activity' | 'nutrition';

export interface HabitQuestion {
  field: keyof FormData;
  factor: HabitFactor;
  scores: Record<string, number>;
  /** Short report wording for each answer. */
  short: Record<string, string>;
}

export const HABIT_QUESTIONS: readonly HabitQuestion[] = [
  {
    field: 'sleepHours', factor: 'sleep',
    scores: { 'under-5': 25, '5-6': 45, '6-7': 70, '7-9': 100, 'over-9': 80 },
    short: { 'under-5': 'under 5 hours', '5-6': '5 to 6 hours', '6-7': '6 to 7 hours', '7-9': '7 to 9 hours', 'over-9': 'over 9 hours' },
  },
  {
    field: 'sleepRegularity', factor: 'sleep',
    // Applied as a deduction from the hours score (see sleepScore below).
    scores: { regular: 100, 'varies-1h': 90, 'varies-more': 80 },
    short: { regular: 'regular times', 'varies-1h': 'times vary by about an hour', 'varies-more': 'times vary a lot' },
  },
  {
    field: 'stressFrequency', factor: 'stress',
    scores: { rarely: 100, sometimes: 75, often: 45, always: 25 },
    short: { rarely: 'rarely stressed', sometimes: 'sometimes stressed', often: 'often stressed', always: 'stressed most of the time' },
  },
  {
    field: 'stressCoping', factor: 'stress',
    scores: { well: 100, mostly: 75, struggling: 45, 'not-coping': 25 },
    short: { well: 'coping well', mostly: 'mostly coping', struggling: 'struggling to cope', 'not-coping': 'not coping' },
  },
  {
    field: 'exerciseMinutesWeek', factor: 'activity',
    scores: { '0': 15, 'under-60': 35, '60-149': 60, '150-299': 90, '300-plus': 100 },
    short: { '0': 'no exercise', 'under-60': 'under 60 min exercise a week', '60-149': '60 to 149 min exercise a week', '150-299': '150 to 299 min exercise a week', '300-plus': '300+ min exercise a week' },
  },
  {
    field: 'strengthDaysWeek', factor: 'activity',
    scores: { '0': 30, '1': 60, '2': 100, '3-plus': 100 },
    short: { '0': 'no strength days', '1': '1 strength day', '2': '2 strength days', '3-plus': '3+ strength days' },
  },
  {
    field: 'proteinMeals', factor: 'nutrition',
    scores: { rarely: 30, some: 55, most: 85, every: 100 },
    short: { rarely: 'protein rarely', some: 'protein at some meals', most: 'protein at most meals', every: 'protein at every meal' },
  },
  {
    field: 'fruitVegPortions', factor: 'nutrition',
    scores: { '0-1': 30, '2-3': 55, '4': 80, '5-plus': 100 },
    short: { '0-1': '0 to 1 fruit and veg a day', '2-3': '2 to 3 fruit and veg a day', '4': '4 fruit and veg a day', '5-plus': '5+ fruit and veg a day' },
  },
  {
    field: 'takeawaysWeek', factor: 'nutrition',
    scores: { '0-1': 100, '2-3': 75, '4-6': 45, '7-plus': 25 },
    short: { '0-1': '0 to 1 takeaways a week', '2-3': '2 to 3 takeaways a week', '4-6': '4 to 6 takeaways a week', '7-plus': '7+ takeaways a week' },
  },
];

const answer = (form: Partial<FormData>, q: HabitQuestion): string | null => {
  const v = form[q.field];
  return typeof v === 'string' && v in q.scores ? v : null;
};

const question = (field: keyof FormData) => HABIT_QUESTIONS.find((q) => q.field === field)!;

/** Daily steps band score (benefits from ~8,000; 10,000 as the aim). */
export function stepsScore(steps: number): number | null {
  if (!(steps > 0)) return null;
  if (steps >= 10000) return 100;
  if (steps >= 8000) return 85;
  if (steps >= 6000) return 70;
  if (steps >= 4000) return 55;
  return 40;
}

/** Score per habit factor from the new questions. null = not answered. */
export function habitFactorScores(form: Partial<FormData>): Record<HabitFactor, number | null> {
  const score = (field: keyof FormData) => {
    const q = question(field);
    const a = answer(form, q);
    return a === null ? null : q.scores[a];
  };

  const hours = score('sleepHours');
  const regularity = score('sleepRegularity');
  const sleep = hours === null ? null : Math.max(0, hours - (regularity === null ? 0 : 100 - regularity));

  const round = (v: number | null) => (v === null ? null : Math.round(v));
  return {
    sleep,
    stress: round(meanOfMeasured([score('stressFrequency'), score('stressCoping')])),
    activity: round(meanOfMeasured([score('exerciseMinutesWeek'), score('strengthDaysWeek'), stepsScore(safeParse(form.stepsPerDay))])),
    nutrition: round(meanOfMeasured([score('proteinMeals'), score('fruitVegPortions'), score('takeawaysWeek')])),
  };
}

/** True when any of the new habit questions was answered for this factor. */
export function hasHabitAnswers(form: Partial<FormData>, factor: HabitFactor): boolean {
  return HABIT_QUESTIONS.some((q) => q.factor === factor && answer(form, q) !== null);
}

/** Plain-language summary of the answers for one factor, for the report table. */
export function habitFactorLabel(form: Partial<FormData>, factor: HabitFactor): string {
  const parts = HABIT_QUESTIONS.filter((q) => q.factor === factor)
    .map((q) => {
      const a = answer(form, q);
      return a === null ? null : q.short[a];
    })
    .filter((s): s is string => !!s);
  if (factor === 'activity') {
    const steps = safeParse(form.stepsPerDay);
    if (steps > 0) parts.push(`${steps.toLocaleString('en-GB')} steps a day`);
  }
  const text = parts.join(', ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '–';
}
