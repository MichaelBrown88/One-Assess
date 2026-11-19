import type { FormData } from '@/contexts/FormContext';
import { LIFESTYLE_FEEDBACK_DB } from '../clinical-data';
import { safeParse } from '../utils/numbers';
import type { ScoreCategory, ScoreDetail } from './types';

/** Parse an 'HH:MM' time string into an hour number, or null when absent/invalid. */
function parseCaffeineHour(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  return hour >= 0 && hour <= 23 ? hour : null;
}

export function scoreLifestyle(form: FormData, age: number, gender: string): ScoreCategory {
  // Support both new archetype and legacy fields
  const sleepArchetype = (form.sleepArchetype || '').toLowerCase();
  const sleepQ = (form.sleepQuality || '').toLowerCase();
  const sleepC = (form.sleepConsistency || '').toLowerCase();
  const stress = (form.stressLevel || '').toLowerCase();
  const hydration = (form.hydrationHabits || '').toLowerCase();
  const nutrition = (form.nutritionHabits || '').toLowerCase();
  const steps = safeParse(form.stepsPerDay);
  const sedentary = safeParse(form.sedentaryHours); // legacy field — no longer collected
  const activityLevel = (form.activityLevel || '').toLowerCase();
  const caffeineHour = parseCaffeineHour(form.lastCaffeineIntake);

  // Alcohol is optional (often skipped in regions where it is not asked).
  // Never include it in the lifestyle average — empty, skipped, or answered.
  const hasLifestyleData = !!(sleepArchetype || sleepQ || sleepC || stress || hydration || nutrition || steps > 0 || sedentary > 0 || activityLevel);

  if (!hasLifestyleData) {
    return {
      id: 'lifestyle',
      title: 'Lifestyle Factors',
      score: 0,
      assessed: false,
      details: [],
      strengths: [],
      weaknesses: []
    };
  }

  // Sleep score - prefer new archetype, fall back to legacy fields
  let sleepScore = 0;
  if (sleepArchetype) {
    // New archetype-based scoring
    if (sleepArchetype === 'excellent') sleepScore = 100;
    else if (sleepArchetype === 'good') sleepScore = 75;
    else if (sleepArchetype === 'fair') sleepScore = 50;
    else if (sleepArchetype === 'poor') sleepScore = 30;
  } else if (sleepQ || sleepC) {
    // Legacy field-based scoring
    if (sleepQ === 'excellent') sleepScore = 100;
    else if (sleepQ === 'good') sleepScore = 85;
    else if (sleepQ === 'fair') sleepScore = 60;
    else if (sleepQ === 'poor') sleepScore = 40;
    if (sleepC === 'very-consistent') sleepScore = Math.min(100, sleepScore + 10);
    else if (sleepC === 'consistent') sleepScore = Math.min(100, sleepScore + 5);
    else if (sleepC === 'inconsistent') sleepScore = Math.max(0, sleepScore - 10);
    else if (sleepC === 'very-inconsistent') sleepScore = Math.max(0, sleepScore - 20);
  }

  // Caffeine timing penalty: caffeine's ~5-6h half-life means afternoon/evening
  // servings cut into sleep depth even when self-reported sleep feels fine.
  let lateCaffeine: 'afternoon' | 'evening' | null = null;
  if (sleepScore > 0 && caffeineHour !== null) {
    if (caffeineHour >= 18) {
      sleepScore = Math.max(0, sleepScore - 20);
      lateCaffeine = 'evening';
    } else if (caffeineHour >= 14) {
      sleepScore = Math.max(0, sleepScore - 10);
      lateCaffeine = 'afternoon';
    }
  }

  // Stress score (archetype-based: very-low=balanced, low=coping, moderate=affected, high=overwhelmed)
  let stressScore = 0;
  if (stress === 'very-low') stressScore = 100;
  else if (stress === 'low') stressScore = 75;
  else if (stress === 'moderate') stressScore = 50;
  else if (stress === 'high') stressScore = 30;
  else if (stress === 'very-high') stressScore = 30; // Legacy value

  // Hydration score
  let hydrationScore = 0;
  if (hydration === 'excellent') hydrationScore = 100;
  else if (hydration === 'good') hydrationScore = 85;
  else if (hydration === 'fair') hydrationScore = 60;
  else if (hydration === 'poor') hydrationScore = 40;

  // Nutrition score
  let nutritionScore = 0;
  if (nutrition === 'excellent') nutritionScore = 100;
  else if (nutrition === 'good') nutritionScore = 85;
  else if (nutrition === 'fair') nutritionScore = 60;
  else if (nutrition === 'poor') nutritionScore = 40;

  // Activity score: steps are the objective signal; the self-rated activity
  // level fills in when steps are missing. Sedentary hours are legacy data.
  let activityScore = 0;
  if (steps > 0) {
    if (steps >= 10000) activityScore = 100;
    else if (steps >= 8000) activityScore = 85;
    else if (steps >= 6000) activityScore = 70;
    else if (steps >= 4000) activityScore = 55;
    else activityScore = 40;
  } else if (activityLevel) {
    if (activityLevel === 'extremely-active') activityScore = 100;
    else if (activityLevel === 'very-active') activityScore = 85;
    else if (activityLevel === 'moderately-active') activityScore = 70;
    else if (activityLevel === 'lightly-active') activityScore = 50;
    else if (activityLevel === 'sedentary') activityScore = 30;
  }
  if (sedentary >= 10) activityScore = Math.max(30, activityScore - 20);
  else if (sedentary >= 8) activityScore = Math.max(40, activityScore - 15);

  // Fetch Advice Blocks
  const lifestyleAdvice: string[] = [];

  // Advice only for habits that were actually asked (a score of 0 = not answered).
  if (sleepScore > 0 && sleepScore < 70) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (sleepScore >= 85) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Sleep' && a.riskLevel === 'Optimal')?.adviceBlock || '');
  }

  if (stressScore === 0) {
    // not asked
  } else if (stressScore < 50) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'High Risk')?.adviceBlock || '');
  } else if (stressScore < 75) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Moderate Risk')?.adviceBlock || '');
  } else {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Stress' && a.riskLevel === 'Low Risk')?.adviceBlock || '');
  }

  if (steps <= 0) {
    // steps not recorded
  } else if (steps < 5000) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Sedentary')?.adviceBlock || '');
  } else if (steps < 10000) {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Active')?.adviceBlock || '');
  } else {
    lifestyleAdvice.push(LIFESTYLE_FEEDBACK_DB.find(a => a.category === 'Steps' && a.riskLevel === 'Highly Active')?.adviceBlock || '');
  }

  const details: ScoreDetail[] = [
    { id: 'sleep', label: 'Sleep Quality', value: lateCaffeine ? `${sleepQ || sleepArchetype || '-'} (late caffeine)` : (sleepQ || sleepArchetype || '-'), score: Math.round(sleepScore) },
    { id: 'stress', label: 'Stress Management', value: stress || '-', score: Math.round(stressScore) },
    { id: 'hydration', label: 'Hydration', value: hydration || '-', score: Math.round(hydrationScore) },
    { id: 'nutrition', label: 'Nutrition', value: nutrition || '-', score: Math.round(nutritionScore) },
    { id: 'activity', label: 'Daily Activity', value: steps > 0 ? `${Math.round(steps)} steps` : '-', score: Math.round(activityScore) },
  ];

  const scoresWithData = [sleepScore, stressScore, hydrationScore, nutritionScore, activityScore].filter(s => s > 0);
  const overallScore = scoresWithData.length > 0
    ? Math.round(scoresWithData.reduce((a, b) => a + b, 0) / scoresWithData.length)
    : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Only answered habits become strengths or weaknesses.
  const habit = (score: number, strong: string, weak: string) => {
    if (score <= 0) return;
    if (score >= 75) strengths.push(strong);
    else weaknesses.push(weak);
  };
  habit(sleepScore, 'Good sleep habits', 'Sleep quality needs improvement');
  if (lateCaffeine === 'evening') weaknesses.push('Evening caffeine is likely cutting into sleep depth');
  else if (lateCaffeine === 'afternoon') weaknesses.push('Afternoon caffeine may be affecting sleep quality');
  habit(stressScore, 'Well-managed stress', 'Stress management needed');
  habit(hydrationScore, 'Good hydration', 'Hydration needs attention');
  habit(nutritionScore, 'Good nutrition habits', 'Nutrition needs improvement');
  habit(activityScore, 'Active lifestyle', 'Daily activity needs increase');

  return {
    id: 'lifestyle',
    title: 'Lifestyle Factors',
    score: overallScore,
    assessed: true,
    details,
    strengths,
    weaknesses,
    lifestyleAdvice: lifestyleAdvice.filter(Boolean)
  };
}
