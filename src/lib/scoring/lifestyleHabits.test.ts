import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { HABIT_QUESTIONS, habitFactorScores } from './lifestyleHabits';
import { scoreLifestyle } from './lifestyleScoring';
import { buildLifestyleFactorRows } from '@/lib/reports/clientLifestyleFactors';

const form = (o: Partial<FormData>): FormData => ({ ...initialFormData, ...o });

describe('habit questions', () => {
  it('every option offered on screen has a score and a report label', () => {
    for (const q of HABIT_QUESTIONS) {
      const options = ASSESSMENT_OPTIONS[q.field as keyof typeof ASSESSMENT_OPTIONS] as readonly { value: string }[];
      expect(options.length, q.field).toBeGreaterThan(1);
      for (const o of options) {
        expect(q.scores[o.value], `${q.field}=${o.value}`).toBeGreaterThan(0);
        expect(q.short[o.value], `${q.field}=${o.value}`).toBeTruthy();
      }
    }
  });
});

describe('habitFactorScores', () => {
  it('sleep: 7-9 hours and regular is full marks; irregular costs points', () => {
    expect(habitFactorScores(form({ sleepHours: '7-9', sleepRegularity: 'regular' })).sleep).toBe(100);
    expect(habitFactorScores(form({ sleepHours: '7-9', sleepRegularity: 'varies-more' })).sleep).toBe(80);
    expect(habitFactorScores(form({ sleepHours: 'under-5' })).sleep).toBe(25);
  });

  it('stress averages how often and how well they cope', () => {
    expect(habitFactorScores(form({ stressFrequency: 'often', stressCoping: 'mostly' })).stress).toBe(60);
  });

  it('activity averages weekly exercise, strength days and steps when given', () => {
    expect(habitFactorScores(form({ exerciseMinutesWeek: '150-299', strengthDaysWeek: '2' })).activity).toBe(95);
    expect(habitFactorScores(form({ exerciseMinutesWeek: '0', strengthDaysWeek: '0', stepsPerDay: '3000' })).activity).toBe(28);
  });

  it('nutrition averages protein, fruit and veg, and takeaways', () => {
    expect(habitFactorScores(form({ proteinMeals: 'most', fruitVegPortions: '2-3', takeawaysWeek: '4-6' })).nutrition).toBe(62);
  });

  it('unanswered factors are null, never 0', () => {
    expect(habitFactorScores(form({}))).toEqual({ sleep: null, stress: null, activity: null, nutrition: null });
  });
});

describe('scoreLifestyle uses the new habit answers, and falls back to older answers', () => {
  it('scores from the new answers', () => {
    const r = scoreLifestyle(
      form({ sleepHours: '7-9', sleepRegularity: 'regular', stressFrequency: 'often', stressCoping: 'mostly', proteinMeals: 'most', fruitVegPortions: '2-3', takeawaysWeek: '4-6', exerciseMinutesWeek: '150-299', strengthDaysWeek: '2' }),
      35,
      'male',
    );
    // (100 + 60 + 62 + 95) / 4 = 79
    expect(r.score).toBe(79);
    expect(r.weaknesses.join(' ')).toMatch(/stress/i);
    expect(r.weaknesses.join(' ')).not.toMatch(/hydration/i);
  });

  it('still scores an older assessment from the archetype answers', () => {
    const r = scoreLifestyle(form({ sleepArchetype: 'good', stressLevel: 'low', nutritionHabits: 'good', hydrationHabits: 'good' }), 35, 'male');
    expect(r.assessed).toBe(true);
    expect(r.score).toBe(70); // (75 + 75 + 85 + 85) / 4
  });
});

describe('report lifestyle rows', () => {
  it('shows the new answers in plain words with a status', () => {
    const rows = buildLifestyleFactorRows(form({ sleepHours: '6-7', sleepRegularity: 'regular', stressFrequency: 'always', stressCoping: 'struggling' }));
    const sleep = rows.find((r) => r.id === 'sleep');
    const stress = rows.find((r) => r.id === 'stress');
    expect(sleep).toMatchObject({ value: '6 to 7 hours, regular times', tone: 'concern' });
    expect(stress).toMatchObject({ tone: 'critical' });
    expect(rows.some((r) => r.id === 'hydration')).toBe(false);
  });
});
