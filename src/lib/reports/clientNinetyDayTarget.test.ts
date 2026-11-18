import { describe, expect, it } from 'vitest';
import { buildClientNinetyDayTarget } from './clientNinetyDayTarget';
import { parseClientGoals } from '@/lib/goals/goalContext';
import type { FormData } from '@/contexts/FormContext';

const weightLossCtx = parseClientGoals(undefined, ['weight-loss']);
const muscleCtx = parseClientGoals(undefined, ['build-muscle']);
const generalCtx = parseClientGoals(undefined, ['general-health']);

function form(overrides: Partial<FormData>): FormData {
  return {
    inbodyWeightKg: '90',
    skeletalMuscleMassKg: '35',
    assessedAt: '2026-09-08T12:00:00.000Z',
    heightCm: '180',
    dateOfBirth: '1990-01-01',
    gender: 'male',
    trainingFrequency: '3',
    ...overrides,
  } as FormData;
}

describe('buildClientNinetyDayTarget', () => {
  it('returns null without a body weight', () => {
    expect(
      buildClientNinetyDayTarget({ heightCm: '180' } as FormData, undefined, weightLossCtx),
    ).toBeNull();
  });

  it('projects a realistic downward weight target for weight loss', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, weightLossCtx);
    expect(target).not.toBeNull();
    expect(target!.direction).toBe('lose');
    expect(target!.targetWeightKg!).toBeLessThan(90);
    // Prescribed week, not a crash — stays around 10% of bodyweight in 12 weeks.
    expect(target!.targetWeightKg!).toBeGreaterThan(80);
  });

  it('sets protein from body weight at 2.2 g/kg on a cut, not skeletal muscle mass', () => {
    const target = buildClientNinetyDayTarget(
      form({ inbodyWeightKg: '81.2', skeletalMuscleMassKg: '31.5' }),
      undefined,
      weightLossCtx,
    );
    expect(target!.proteinG).toBe(180);
  });

  it('computes daily calories and macros from height + age', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, weightLossCtx);
    expect(target!.calories).toBeGreaterThan(1200);
    expect(target!.proteinG).toBeGreaterThan(0);
    expect(target!.carbsG).toBeGreaterThan(0);
    expect(target!.fatG).toBeGreaterThan(0);
    // Weight-loss calories sit below a rough maintenance estimate.
    expect(target!.calories!).toBeLessThan(3200);
  });

  it('projects upward for muscle building', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, muscleCtx);
    expect(target!.direction).toBe('gain');
    expect(target!.targetWeightKg!).toBeGreaterThan(90);
  });

  it('omits macros when height is missing but still returns a weight target', () => {
    const target = buildClientNinetyDayTarget(
      form({ heightCm: '' }),
      undefined,
      weightLossCtx,
    );
    expect(target!.calories).toBeNull();
    expect(target!.targetWeightKg).not.toBeNull();
  });

  it('holds steady for a general-health client with no directional goal', () => {
    const target = buildClientNinetyDayTarget(form({}), undefined, generalCtx);
    expect(target!.direction).toBe('maintain');
  });

  it('does not crash 12-week weight when muscle-building is also a goal', () => {
    const both = parseClientGoals(undefined, ['weight-loss', 'build-muscle']);
    const target = buildClientNinetyDayTarget(
      form({ inbodyWeightKg: '81.2', inbodyBodyFatPct: '31.2' }),
      undefined,
      both,
    );
    expect(target!.direction).toBe('lose');
    expect(target!.targetWeightKg!).toBeGreaterThan(71);
  });

  it('gives a female client lower calories than a male with the same stats', () => {
    const male = buildClientNinetyDayTarget(form({ gender: 'male' }), undefined, weightLossCtx);
    const female = buildClientNinetyDayTarget(form({ gender: 'female' }), undefined, weightLossCtx);
    expect(female!.calories!).toBeLessThan(male!.calories!);
    expect(female!.direction).toBe('lose');
  });

  it('projects slower 12-week muscle gain for a female client', () => {
    const male = buildClientNinetyDayTarget(form({ gender: 'male' }), undefined, muscleCtx);
    const female = buildClientNinetyDayTarget(form({ gender: 'female' }), undefined, muscleCtx);
    expect(male!.direction).toBe('gain');
    expect(female!.direction).toBe('gain');
    expect(female!.targetWeightKg!).toBeLessThan(male!.targetWeightKg!);
  });

  it('does not stack a low analyzer BMR with a sedentary multiplier for a recomp client', () => {
    const both = parseClientGoals(undefined, ['weight-loss', 'build-muscle']);
    const target = buildClientNinetyDayTarget(
      form({
        inbodyWeightKg: '81.2',
        inbodyBodyFatPct: '31.2',
        skeletalMuscleMassKg: '31.5',
        heightCm: '174',
        dateOfBirth: '1995-01-15',
        bmrKcal: '1577',
        activityLevel: 'sedentary',
        stepsPerDay: '5800',
        trainingFrequency: '',
      }),
      undefined,
      both,
    );
    expect(target!.direction).toBe('lose');
    expect(target!.proteinG).toBe(180);
    expect(target!.calories).toBeGreaterThanOrEqual(2200);
    expect(target!.calories).toBeLessThanOrEqual(2400);
    expect(target!.fatG).toBe(65);
    expect(target!.fuelSessionsNote).toMatch(/review/i);
  });

  it('fuels a sedentary new client the same as someone already training 3×', () => {
    const both = parseClientGoals(undefined, ['weight-loss', 'build-muscle']);
    const sedentary = buildClientNinetyDayTarget(
      form({
        activityLevel: 'sedentary',
        stepsPerDay: '3000',
        trainingFrequency: '',
      }),
      undefined,
      both,
    );
    const threeSessions = buildClientNinetyDayTarget(
      form({
        activityLevel: 'sedentary',
        stepsPerDay: '11000',
        trainingFrequency: '3',
      }),
      undefined,
      both,
    );
    expect(sedentary!.calories).toBe(threeSessions!.calories);
    expect(sedentary!.fuelSessionsNote).toBe(threeSessions!.fuelSessionsNote);
  });

  it('counts extra visits as activity on the same food', () => {
    const both = parseClientGoals(undefined, ['weight-loss', 'build-muscle']);
    const planned = buildClientNinetyDayTarget(form({ trainingFrequency: '' }), undefined, both);
    const fivePlus = buildClientNinetyDayTarget(form({ trainingFrequency: '5+' }), undefined, both);
    expect(fivePlus!.calories!).toBe(planned!.calories!);
    expect(Math.abs(fivePlus!.weightDeltaKg!)).toBeGreaterThan(Math.abs(planned!.weightDeltaKg!));
  });
});
