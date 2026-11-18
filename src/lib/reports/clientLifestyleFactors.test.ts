import { describe, expect, it } from 'vitest';
import { buildLifestyleFactorRows, clientLifestyleNutritionAdvice } from './clientLifestyleFactors';
import { LIFESTYLE_FACTOR_ADVICE } from '@/constants/clientReport';
import { CLIENT_COPY_FORBIDDEN } from './sanitizeClientReportCopy';
import type { FormData } from '@/contexts/FormContext';

function rows(partial: Partial<FormData>, targets?: { calories: number | null; proteinG: number | null }) {
  return buildLifestyleFactorRows(partial as FormData, targets);
}

function byId(id: string, partial: Partial<FormData>, targets?: { calories: number | null; proteinG: number | null }) {
  return rows(partial, targets).find((r) => r.id === id);
}

describe('buildLifestyleFactorRows', () => {
  it('gives sleep advice on timing, duration, and environment even when sleep is good', () => {
    const sleep = byId('sleep', { sleepArchetype: 'excellent' });
    expect(sleep?.value).toMatch(/excellent/i);
    expect(sleep?.tone).toBe('good');
    expect(sleep?.advice).toMatch(/bedtime/i);
    expect(sleep?.advice).toMatch(/7–9 hours/);
    expect(sleep?.advice).toMatch(/dark|cool|quiet/i);
    expect(sleep?.advice).not.toMatch(CLIENT_COPY_FORBIDDEN);
  });

  it('gives two or three concrete stress-reduction strategies', () => {
    const stress = byId('stress', { stressLevel: 'moderate' });
    expect(stress?.tone).toBe('concern');
    expect(stress?.advice).toMatch(/walk/i);
    expect(stress?.advice).toMatch(/breath/i);
    expect(stress?.advice).toMatch(/phone|break/i);
  });

  it('describes good nutrition with calories, protein, and whole-food habits', () => {
    const nutrition = byId(
      'nutrition',
      { nutritionHabits: 'good' },
      { calories: 2150, proteinG: 160 },
    );
    expect(nutrition?.advice).toMatch(/2,150 calories/);
    expect(nutrition?.advice).toMatch(/160g protein/);
    expect(nutrition?.advice).toMatch(/minimally processed/i);
    expect(nutrition?.advice).toMatch(/fruit/i);
    expect(nutrition?.advice).toMatch(/fibre|fiber/i);
  });

  it('still describes nutrition quality when calorie targets are missing', () => {
    const nutrition = byId('nutrition', { nutritionHabits: 'fair' });
    expect(nutrition?.advice).toBe(LIFESTYLE_FACTOR_ADVICE.nutrition);
  });

  it('counts all fluids for hydration, not only water', () => {
    const hydration = byId('hydration', { hydrationHabits: 'good' });
    expect(hydration?.advice).toMatch(/coffee/i);
    expect(hydration?.advice).toMatch(/shakes/i);
    expect(hydration?.advice).toMatch(/soft drinks/i);
    expect(hydration?.advice.toLowerCase()).not.toMatch(/water only|only water/);
  });

  it('flags activity below 8,000 steps and aims for 10,000', () => {
    const low = byId('activity', { stepsPerDay: '7000' });
    expect(low?.tone).toBe('concern');
    expect(low?.advice).toMatch(/8,000/);
    expect(low?.advice).toMatch(/10,000/);

    const strong = byId('activity', { stepsPerDay: '11000' });
    expect(strong?.tone).toBe('good');
    expect(strong?.advice).toMatch(/10,000/);
  });

  it('explains that caffeine lasts about 8 hours and can disrupt sleep', () => {
    const caffeine = byId('caffeine', { caffeineCupsPerDay: '2', lastCaffeineIntake: '16:00' });
    expect(caffeine?.advice).toMatch(/8 hours/i);
    expect(caffeine?.advice).toMatch(/sleep/i);
    expect(caffeine?.value).toMatch(/4 pm/i);
  });

  it('omits alcohol and returns nothing without lifestyle inputs', () => {
    expect(rows({ alcoholFrequency: 'weekly' })).toEqual([]);
    expect(rows({})).toEqual([]);
  });

  it('never lists alcohol even when other lifestyle factors are captured', () => {
    const result = rows({
      sleepArchetype: 'good',
      stressLevel: 'low',
      alcoholFrequency: 'daily',
    });
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((r) => /alcohol/i.test(`${r.id} ${r.label} ${r.value}`))).toBe(false);
  });
});

describe('clientLifestyleNutritionAdvice', () => {
  it('falls back to the generic line without numbers', () => {
    expect(clientLifestyleNutritionAdvice(null, null)).toBe(LIFESTYLE_FACTOR_ADVICE.nutrition);
  });
});
