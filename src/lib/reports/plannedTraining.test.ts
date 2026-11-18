import { describe, expect, it } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import { parseClientGoals } from '@/lib/goals/goalContext';
import {
  plannedFatLossSessions,
  plannedLiftingSessions,
  prescribedCardioSessions,
  profileForTwelveWeekPlan,
  reportPlanSessions,
} from './plannedTraining';

describe('plannedLiftingSessions', () => {
  it('floors a sedentary snapshot at the prescribed 3 lifting sessions', () => {
    expect(plannedLiftingSessions({ activityLevel: 'sedentary' } as FormData)).toBe(3);
    expect(plannedLiftingSessions({ trainingFrequency: '' } as FormData)).toBe(3);
  });

  it('keeps an explicit 3× or 5+ week', () => {
    expect(plannedLiftingSessions({ trainingFrequency: '3' } as FormData)).toBe(3);
    expect(plannedLiftingSessions({ trainingFrequency: '5+' } as FormData)).toBe(5);
  });

  it('uses an explicit report week over the stated week', () => {
    expect(plannedLiftingSessions({ reportLiftingSessions: '4' } as FormData)).toBe(4);
    expect(plannedLiftingSessions({ reportLiftingSessions: '5', trainingFrequency: '3' } as FormData)).toBe(5);
  });
});

describe('reportPlanSessions', () => {
  it('plans the report around the recommended 4-session week', () => {
    expect(reportPlanSessions({ activityLevel: 'sedentary' } as FormData)).toBe(4);
    expect(reportPlanSessions({ trainingFrequency: '3', reportLiftingSessions: '3' } as FormData)).toBe(4);
  });

  it('keeps 5 when the client already trains 5+', () => {
    expect(reportPlanSessions({ trainingFrequency: '5+' } as FormData)).toBe(5);
  });
});

describe('prescribedCardioSessions', () => {
  it('adds two easy cardio sessions when fat loss or fitness is a goal', () => {
    expect(prescribedCardioSessions(parseClientGoals(undefined, ['weight-loss']))).toBe(2);
    expect(prescribedCardioSessions(parseClientGoals(undefined, ['improve-fitness']))).toBe(2);
    expect(prescribedCardioSessions(parseClientGoals(undefined, ['build-muscle']))).toBe(0);
  });
});

describe('plannedFatLossSessions', () => {
  it('keeps cardio within the prescribed visits', () => {
    expect(plannedFatLossSessions({ activityLevel: 'sedentary' } as FormData, parseClientGoals(undefined, ['weight-loss']))).toBe(3);
  });
});

describe('profileForTwelveWeekPlan', () => {
  it('does not let a sedentary activity slug zero the training week', () => {
    const profile = profileForTwelveWeekPlan({
      activityLevel: 'sedentary',
      inbodyWeightKg: '81.2',
    } as FormData);
    expect(profile.trainingFrequency).toBe(3);
  });
});
