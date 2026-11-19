import { describe, expect, it } from 'vitest';
import { firstIncompletePhase, mergeIntakeIntoDraft, NOTES_MARKER, STUDIO_BASELINE_PLAN, type StandardIntake } from './mergeDraft';

const NOW = '2026-11-19T10:00:00.000Z';
const intake = (overrides: Partial<StandardIntake> = {}): StandardIntake => ({
  provider: 'OFS',
  externalClientId: 'contact-1',
  sourceUrl: 'https://example.test/consultations/a1',
  formData: { fullName: 'Test Client', email: 'client@example.test', gender: 'female', heightCm: '170', clientGoals: ['build-strength'], activityLevel: 'sedentary', trainingHistory: 'beginner' },
  healthNotes: [{ label: 'Injuries', value: 'Example knee note' }],
  consultationNotes: [{ label: 'Why now', value: 'Example reason' }],
  metrics: [{ field: 'weightKg', label: 'Self-reported weight', value: '70', unit: 'kg', date: '2026-11-19' }],
  ...overrides,
});

describe('mergeIntakeIntoDraft', () => {
  it('starts a new studio draft on the first step that needs input', () => {
    const out = mergeIntakeIntoDraft(null, intake(), NOW);
    expect(out.formData).toMatchObject({
      fullName: 'Test Client', gender: 'female', heightCm: '170', clientGoals: ['build-strength'],
      assessmentPlan: STUDIO_BASELINE_PLAN, assessmentIntakeMode: 'studio',
      consultationNotes: [{ label: 'Why now', value: 'Example reason' }],
    });
    expect(out.formData.parqNotes).toBe(`${NOTES_MARKER('OFS')}\n- Injuries: Example knee note`);
    expect(out.formData.parqSource).toBeUndefined();
    expect(out.activePhaseId).toBe('P0');
    expect(out.activePhaseIdx).toBe(0);
    expect(out.importPath).toBe('externalImport');
    expect(out.externalImport).toEqual({
      provider: 'OFS', externalClientId: 'contact-1', sourceUrl: 'https://example.test/consultations/a1',
      importedAt: NOW, metrics: intake().metrics,
    });
  });

  it('opens on the first physical step when the client answered intake', () => {
    const out = mergeIntakeIntoDraft(null, intake({
      provider: 'intake-link',
      formData: { fullName: 'Test Client', dateOfBirth: '1990-01-01', gender: 'male', trainingHistory: 'beginner', recentActivity: 'currently-training', activityLevel: 'sedentary', parq1: 'no', parq2: 'yes' },
    }), NOW);
    expect(out.activePhaseId).toBe('P3');
    expect(out.formData.parqSource).toBe('client');
  });

  it('never overwrites what the coach already entered', () => {
    const existing = { formData: { fullName: 'Test Client', gender: 'male', clientGoals: ['weight-loss'], heightCm: '' }, activePhaseId: 'P4', activePhaseIdx: 2 };
    const out = mergeIntakeIntoDraft(existing, intake(), NOW);
    expect(out.formData.gender).toBe('male');
    expect(out.formData.clientGoals).toEqual(['weight-loss']);
    expect(out.formData.heightCm).toBe('170');
    expect(out.activePhaseId).toBeUndefined();
  });

  it('does not mark coach-entered PAR-Q answers as client-reported', () => {
    const out = mergeIntakeIntoDraft({ formData: { parq1: 'no' } }, intake({ formData: { fullName: 'Test Client', parq1: 'yes' } }), NOW);
    expect(out.formData.parq1).toBe('no');
    expect(out.formData.parqSource).toBeUndefined();
  });

  it('appends health notes once per provider, after coach notes', () => {
    const first = mergeIntakeIntoDraft({ formData: { parqNotes: 'Coach note' } }, intake(), NOW);
    expect(first.formData.parqNotes).toBe(`Coach note\n\n${NOTES_MARKER('OFS')}\n- Injuries: Example knee note`);
    expect(mergeIntakeIntoDraft({ formData: first.formData }, intake(), NOW).formData.parqNotes).toBe(first.formData.parqNotes);
  });

  it('keeps another provider\'s import record intact', () => {
    expect(mergeIntakeIntoDraft({ externalImport: { provider: 'Everfit' } }, intake(), NOW).importPath).toBe('externalImports.OFS');
    expect(mergeIntakeIntoDraft({ externalImport: { provider: 'OFS' } }, intake(), NOW).importPath).toBe('externalImport');
  });
});

describe('firstIncompletePhase', () => {
  const complete = { fullName: 'A', dateOfBirth: '1990-01-01', gender: 'male', trainingHistory: 'beginner', recentActivity: 'currently-training' };
  it('walks P0, P1, then the first physical step', () => {
    expect(firstIncompletePhase({ ...complete, dateOfBirth: '' })).toBe('P0');
    expect(firstIncompletePhase(complete)).toBe('P1');
    expect(firstIncompletePhase({ ...complete, activityLevel: 'sedentary' })).toBe('P3');
  });
});
