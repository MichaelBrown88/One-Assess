import { describe, expect, it } from 'vitest';
import {
  FAT_LOSS_MAX_BODYWEIGHT_FRACTION_PER_WEEK,
  lifestyleFactorForSessions,
  monthlyMuscleGainKg,
  weeklyMuscleGainForSessions,
  weeklyWeightLossForSessions,
  weeklyWeightLossKg,
  type ClientProfile,
} from './rates';

const maleBeginner: ClientProfile = {
  sex: 'male',
  age: 29,
  bodyWeightKg: 80,
  bodyFatPct: 22,
  trainingExperience: 'beginner',
  trainingFrequency: 3,
};

describe('session rate tables', () => {
  it('adds modest activity expenditure without multiplying weight loss', () => {
    expect(weeklyWeightLossForSessions(3)).toBe(0.3);
    expect(weeklyWeightLossForSessions(4)).toBe(0.35);
    expect(weeklyWeightLossForSessions(5)).toBe(0.4);
  });

  it('does not assume an extra session doubles muscle growth', () => {
    expect(weeklyMuscleGainForSessions(3)).toBe(0.1);
    expect(weeklyMuscleGainForSessions(4)).toBe(0.1);
    expect(weeklyMuscleGainForSessions(5)).toBe(0.1);
  });
});

describe('weeklyWeightLossKg', () => {
  it('follows the session table for an overweight client', () => {
    const at = (liftingSessions: number) => weeklyWeightLossKg(maleBeginner, 10, { liftingSessions }).rate;
    expect(at(3)).toBe(0.3);
    expect(at(4)).toBe(0.35);
    expect(at(5)).toBe(0.4);
    expect(weeklyWeightLossKg(maleBeginner, 10).rate).toBe(0.3);
  });

  it('cuts slower when already lean', () => {
    const lean = weeklyWeightLossKg({ ...maleBeginner, bodyFatPct: 15 }, 5, { liftingSessions: 5 });
    expect(lean.rate).toBeLessThan(0.6);
  });

  it('never exceeds 1% of body weight a week', () => {
    const light = { ...maleBeginner, bodyWeightKg: 50, bodyFatPct: 35 };
    const five = weeklyWeightLossKg(light, 10, { liftingSessions: 5 });
    expect(five.rate).toBeLessThanOrEqual(50 * FAT_LOSS_MAX_BODYWEIGHT_FRACTION_PER_WEEK);
  });

  it('keeps lifestyle drag at every session count', () => {
    const poorSleep = { ...maleBeginner, sleepScore: 40 };
    expect(lifestyleFactorForSessions(poorSleep, 3)).toBeLessThan(1);
    expect(lifestyleFactorForSessions(poorSleep, 4)).toBe(lifestyleFactorForSessions(poorSleep, 3));
  });
});

describe('monthlyMuscleGainKg', () => {
  it('is 4 weeks of the session table for a beginner male', () => {
    expect(monthlyMuscleGainKg({ ...maleBeginner, trainingFrequency: 3 }).rate).toBeCloseTo(0.4, 2);
    expect(monthlyMuscleGainKg({ ...maleBeginner, trainingFrequency: 4 }).rate).toBeCloseTo(0.4, 2);
    expect(monthlyMuscleGainKg({ ...maleBeginner, trainingFrequency: 5 }).rate).toBeCloseTo(0.4, 2);
  });

  it('halves for women and while cutting when already lean', () => {
    const male = monthlyMuscleGainKg({ ...maleBeginner, trainingFrequency: 4 }).rate;
    expect(monthlyMuscleGainKg({ ...maleBeginner, sex: 'female', trainingFrequency: 4 }).rate).toBeCloseTo(male / 2, 2);
    expect(
      monthlyMuscleGainKg({ ...maleBeginner, trainingFrequency: 4 }, { concurrentFatLoss: true }).rate,
    ).toBeCloseTo(male / 2, 2);
    expect(
      monthlyMuscleGainKg({ ...maleBeginner, bodyFatPct: 31, trainingFrequency: 4 }, { concurrentFatLoss: true }).rate,
    ).toBeCloseTo(male / 2, 2);
  });
});
