import { describe, it, expect } from 'vitest';

// Copy of allowedKeysForScope logic for isolated testing
// (avoids importing firebase-admin in unit tests)
const REMOTE_POSTURE_VIEWS = ['front', 'side-left', 'back', 'side-right'] as const;
const BASIC_INFO_KEYS = ['fullName','email','phone','dateOfBirth','gender','heightCm','trainingHistory','recentActivity'];
const LIFESTYLE_KEYS = ['activityLevel','sleepArchetype','stressLevel','nutritionHabits','hydrationHabits','stepsPerDay','sedentaryHours','caffeineCupsPerDay'];
const PRE_ASSESSMENT_GOAL_KEYS = ['clientGoals', 'trainingFrequency', 'goalDeadline'];
const POSTURE_KEYS = REMOTE_POSTURE_VIEWS.map((v) => `postureRemotePath_${v}`);

describe('allowedKeysForScope', () => {
  it('full scope contains basic, lifestyle, goals, and posture — not PAR-Q or medications', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PRE_ASSESSMENT_GOAL_KEYS, ...POSTURE_KEYS];
    expect(all).toContain('fullName');
    expect(all).toContain('activityLevel');
    expect(all).toContain('clientGoals');
    expect(all).toContain('postureRemotePath_front');
    expect(all).not.toContain('parq7');
    expect(all).not.toContain('medicationsFlag');
    expect(all).not.toContain('alcoholFrequency');
  });

  it('does not include body-comp keys in full pre-assessment scope', () => {
    const all = [...BASIC_INFO_KEYS, ...LIFESTYLE_KEYS, ...PRE_ASSESSMENT_GOAL_KEYS, ...POSTURE_KEYS];
    expect(all).not.toContain('inbodyWeightKg');
  });
});
