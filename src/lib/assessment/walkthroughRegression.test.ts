import { describe, expect, it } from 'vitest';
import { completeBaseline } from '@/test/fixtures/completeBaseline';
import { numericIssue, numericWarning } from './numericValidation';
import { manualPostureSummary } from '@/lib/reports/manualPosture';
import { scoreCardio } from '@/lib/scoring/cardioScoring';
import { scoreStrength } from '@/lib/scoring/strengthScoring';
import { scoreLifestyle } from '@/lib/scoring/lifestyleScoring';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
import { buildProgrammingBrief } from '@/lib/coachNotes/programmingBrief';
import { buildRemoteIntakeScreens, healthToFields } from '@/lib/remote/remoteIntakeFlow';
import { STANDARD_INTAKE_KEYS, sanitizeIntakeFields } from '../../../functions/src/intake/standardFields';
import { HABIT_QUESTIONS } from '@/lib/scoring/lifestyleHabits';

describe('coach walkthrough regressions', () => {
  it('catches extra digits, negative repetitions and unit mistakes without rejecting zero', () => {
    for (const [field, value] of [['pushupsOneMinuteReps','2525'], ['plankDurationSeconds','7070'], ['singleLegStandLeftReps','-1'], ['cardioRestingHr','7.4']]) expect(numericIssue(field,value)).toBeTruthy();
    expect(numericIssue('pushupsOneMinuteReps','0')).toBeNull();
    expect(numericIssue('gripLeftKg','95')).toBeNull();
    expect(numericWarning('gripLeftKg','95')).toBeTruthy();
  });
  it('keeps a zero plank and grip as measured, not missing', () => {
    const form = { ...createEmptyAssessmentForm(), plankDurationSeconds: '0', gripLeftKg: '0' };
    const strength = scoreStrength(form, 36, 'female');
    expect(strength.assessed).toBe(true);
    expect(strength.score).toBe(0);
    expect(strength.details.find(detail => detail.id === 'plank')?.value).toBe(0);
    expect(strength.details.find(detail => detail.id === 'grip')?.value).toBe(0);
  });
  it('does not drop zero recovery or assign the new protocol to historical data', () => {
    const form = completeBaseline(); delete form.cardioProtocolVersion;
    form.cardioPost1MinHr = form.cardioPeakHr;
    const cardio = scoreCardio(form, 36, 'female');
    expect(cardio.details.find(detail => detail.id === 'hrr')?.value).toBe(0);
    expect(cardio.details.find(detail => detail.id === 'vo2')?.value).toBe('-');
    expect(scoreCardio(createEmptyAssessmentForm(), 36, 'female').weaknesses).toEqual([]);
  });
  it('keeps a sleep score reduced to zero in the lifestyle average', () => {
    const form = { ...createEmptyAssessmentForm(), sleepHours: 'under-5', sleepRegularity: 'varies-more', lastCaffeineIntake: '20:00', stressLevel: 'very-low' };
    expect(scoreLifestyle(form, 36, 'female').score).toBe(50);
    expect(scoreLifestyle(form, 36, 'female').weaknesses).toContain('Sleep quality needs improvement');
  });
  it('shows manual posture observations and never invents a neutral result from an empty form', () => {
    expect(manualPostureSummary(completeBaseline())?.join(' ')).toMatch(/Head sits forward.*Shoulders sit forward/);
    expect(manualPostureSummary(createEmptyAssessmentForm())).toBeNull();
  });
  it('uses the same habit options in studio, public intake and the server sanitizer', () => {
    const keys = new Set(STANDARD_INTAKE_KEYS);
    const screens = buildRemoteIntakeScreens({ allowedKeys: keys, prefill: {}, gender: 'female' });
    for (const question of HABIT_QUESTIONS) {
      expect(screens.some(screen => screen.kind === 'select' && screen.field === question.field)).toBe(true);
      for (const answer of Object.keys(question.scores)) expect((sanitizeIntakeFields({ [question.field]: answer }) as Record<string, unknown>)[question.field]).toBe(answer);
    }
    expect(screens.some(screen => ['parq','medications','lifestyle_sleepArchetype','lifestyle_hydrationHabits'].includes(screen.id))).toBe(false);
    expect(healthToFields({parq1:'no'}, keys, 'female')).toEqual({});
  });
  it('produces a deterministic coach-only brief for pain, imbalance, recovery and beginners', () => {
    const form = completeBaseline(); form.ohsHasPain = 'yes'; form.singleLegStandLeftReps = '5'; form.singleLegStandRightReps = '10';
    const notes = buildProgrammingBrief(form).join(' ');
    expect(notes).toMatch(/stop loading/); expect(notes).toMatch(/weaker side/); expect(notes).toMatch(/machines/);
    expect(buildProgrammingBrief(createEmptyAssessmentForm())).toEqual([]);
  });
});
