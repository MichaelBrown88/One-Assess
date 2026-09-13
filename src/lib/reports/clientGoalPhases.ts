import type { FormData } from '@/contexts/FormContext';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
} from '@/lib/goals/goalContext';

/**
 * Compact self-guided takeaway — three habit bullets a client can act on alone.
 * Rendered under the coached plan so someone who doesn't sign up still leaves
 * with a starting point (the "reassess in 12 weeks" line lives in copy).
 */
export function buildClientSelfGuidedHabits(
  formData: FormData | undefined,
  goals: string[] | undefined,
): string[] {
  const ctx = formData ? parseClientGoals(formData, goals) : null;

  switch (ctx?.primaryGoal) {
    case GOAL_WEIGHT_LOSS:
      return [
        'Protein at every meal and a daily step target — the two levers that move the scale most reliably.',
        'Strength train 2–3×/week so the weight you lose is fat, not muscle.',
        'Weigh in weekly, same day and time — trend over weeks, not days.',
      ];
    case GOAL_BUILD_MUSCLE:
      return [
        'Train each major muscle group twice a week and add a little weight or a rep when you can.',
        'Eat enough protein (roughly palm-sized portion each meal) and don\u2019t skip sleep — that\u2019s where muscle is built.',
        'Track your main lifts so progress is visible week to week.',
      ];
    case GOAL_IMPROVE_FITNESS:
      return [
        'Two to three easy cardio sessions a week where you can still hold a conversation.',
        'Add one harder interval session once the easy sessions feel routine.',
        'Check your resting heart rate monthly — it dropping is the clearest sign this is working.',
      ];
    case GOAL_BUILD_STRENGTH:
      return [
        'Practise squat, hinge, push, and pull movements 2–3×/week — technique first, load second.',
        'Add small amounts of weight when all sets feel solid, and rest fully between heavy sets.',
        'Keep a simple log of your working weights so every session builds on the last.',
      ];
    default:
      return [
        'Aim for consistent sleep and a daily walk — recovery and movement drive everything else.',
        'Train 2–3×/week, even short sessions; consistency beats intensity.',
        'Pick one number from this report to improve and check it monthly.',
      ];
  }
}
