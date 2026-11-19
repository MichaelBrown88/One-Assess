import { describe, expect, it } from 'vitest';
import { firstIncompletePhase, mergeHandoffIntoDraft, OFS_NOTES_MARKER, STUDIO_BASELINE_PLAN } from './mergeDraft';
import type { HandoffPayload } from './payload';

const NOW = '2026-11-19T10:00:00.000Z';
const payload = (): HandoffPayload => ({
  version: 1,
  contactId: 'contact-1',
  consultationId: 'consult-1',
  sourceUrl: 'https://example.test/admin/consultations/a1',
  coachEmail: 'coach@example.test',
  formData: { fullName: 'Test Client', email: 'client@example.test', gender: 'female', heightCm: '170', clientGoals: ['build-strength'], activityLevel: 'sedentary', trainingHistory: 'beginner' },
  healthNotes: [{ label: 'Injuries', value: 'Example knee note' }],
  consultationNotes: [{ label: 'Why now', value: 'Example reason' }],
  metrics: [{ field: 'weightKg', label: 'Self-reported weight', value: '70', unit: 'kg', date: '2026-11-19' }],
});

describe('mergeHandoffIntoDraft', () => {
  it('starts a new studio draft on the first step that needs input', () => {
    const out = mergeHandoffIntoDraft(null, payload(), NOW);
    expect(out.formData).toMatchObject({
      fullName: 'Test Client', gender: 'female', heightCm: '170', clientGoals: ['build-strength'],
      assessmentPlan: STUDIO_BASELINE_PLAN, assessmentIntakeMode: 'studio',
      consultationNotes: [{ label: 'Why now', value: 'Example reason' }],
    });
    expect(out.formData.parqNotes).toBe(`${OFS_NOTES_MARKER}\n- Injuries: Example knee note`);
    expect(out.formData.inbodyWeightKg).toBeUndefined();
    expect(out.activePhaseId).toBe('P0');
    expect(out.activePhaseIdx).toBe(0);
    expect(out.externalImport).toEqual({
      provider: 'OFS', clientId: 'contact-1', consultationId: 'consult-1',
      sourceUrl: 'https://example.test/admin/consultations/a1', importedAt: NOW,
      metrics: payload().metrics,
    });
  });

  it('never overwrites what the coach already entered', () => {
    const existing = { formData: { fullName: 'Test Client', gender: 'male', clientGoals: ['weight-loss'], heightCm: '' }, activePhaseId: 'P4', activePhaseIdx: 2 };
    const out = mergeHandoffIntoDraft(existing, payload(), NOW);
    expect(out.formData.gender).toBe('male');
    expect(out.formData.clientGoals).toEqual(['weight-loss']);
    expect(out.formData.heightCm).toBe('170');
    expect(out.activePhaseId).toBeUndefined();
    expect(out.activePhaseIdx).toBeUndefined();
  });

  it('fills an empty goals array', () => {
    const out = mergeHandoffIntoDraft({ formData: { clientGoals: [] } }, payload(), NOW);
    expect(out.formData.clientGoals).toEqual(['build-strength']);
  });

  it('appends health notes once, after coach notes', () => {
    const first = mergeHandoffIntoDraft({ formData: { parqNotes: 'Coach note' } }, payload(), NOW);
    expect(first.formData.parqNotes).toBe(`Coach note\n\n${OFS_NOTES_MARKER}\n- Injuries: Example knee note`);
    const second = mergeHandoffIntoDraft({ formData: first.formData }, payload(), NOW);
    expect(second.formData.parqNotes).toBe(first.formData.parqNotes);
  });

  it('keeps another provider\'s import record intact', () => {
    expect(mergeHandoffIntoDraft({ externalImport: { provider: 'Everfit' } }, payload(), NOW).importKey).toBe('externalImportOfs');
    expect(mergeHandoffIntoDraft({ externalImport: { provider: 'OFS' } }, payload(), NOW).importKey).toBe('externalImport');
    expect(mergeHandoffIntoDraft(null, payload(), NOW).importKey).toBe('externalImport');
  });

  it('leaves parqNotes alone when there are no health notes', () => {
    const p = payload();
    p.healthNotes = [];
    expect(mergeHandoffIntoDraft(null, p, NOW).formData.parqNotes).toBeUndefined();
  });
});

describe('firstIncompletePhase', () => {
  const complete = { fullName: 'A', dateOfBirth: '1990-01-01', gender: 'male', trainingHistory: 'beginner', recentActivity: 'currently-training' };
  it('picks P0 while basic info is missing', () => {
    expect(firstIncompletePhase({ ...complete, dateOfBirth: '' })).toBe('P0');
  });
  it('picks P1 when only lifestyle is missing', () => {
    expect(firstIncompletePhase(complete)).toBe('P1');
  });
  it('picks the first physical step when intake is complete', () => {
    expect(firstIncompletePhase({ ...complete, activityLevel: 'sedentary' })).toBe('P3');
  });
});
