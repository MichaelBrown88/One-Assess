import { describe, expect, it } from 'vitest';
import { parseHandoffPayload } from './payload';

const valid = () => ({
  version: 1,
  contactId: '00000000-0000-4000-8000-000000000001',
  consultationId: '00000000-0000-4000-8000-000000000002',
  sourceUrl: 'https://example.test/admin/consultations/abc',
  coachEmail: 'Coach@Example.test',
  formData: {
    fullName: '  Test   Client ',
    email: 'Client@Example.test',
    gender: 'female',
    heightCm: '170',
    clientGoals: ['build-strength', 'not-a-goal'],
    trainingFrequency: '5+',
    activityLevel: 'moderately-active',
    trainingHistory: 'intermediate',
    medicationsFlag: 'yes',
    medicationsNotes: 'Example medication',
    unexpectedKey: 'dropped',
  },
  healthNotes: [{ label: 'Injuries', value: 'Example knee note' }],
  consultationNotes: [{ label: 'Why now', value: 'Example reason' }],
  metrics: [{ field: 'weightKg', label: 'Self-reported weight', value: '70', unit: 'kg', date: '2026-11-19' }],
});

describe('parseHandoffPayload', () => {
  it('normalises a valid payload and keeps only known fields', () => {
    const result = parseHandoffPayload(valid());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.coachEmail).toBe('coach@example.test');
    expect(result.value.formData).toEqual({
      fullName: 'Test Client',
      email: 'client@example.test',
      gender: 'female',
      heightCm: '170',
      clientGoals: ['build-strength'],
      trainingFrequency: '5+',
      activityLevel: 'moderately-active',
      trainingHistory: 'intermediate',
      medicationsFlag: 'yes',
      medicationsNotes: 'Example medication',
    });
    expect(result.value.healthNotes).toHaveLength(1);
    expect(result.value.metrics[0].field).toBe('weightKg');
  });

  it('drops enum values ONE ASSESS does not know', () => {
    const p = valid();
    p.formData.gender = 'other';
    p.formData.activityLevel = 'active';
    const result = parseHandoffPayload(p);
    expect(result.ok && result.value.formData.gender).toBe(undefined);
    expect(result.ok && result.value.formData.activityLevel).toBe(undefined);
  });

  it('drops an out-of-range height', () => {
    const p = valid();
    p.formData.heightCm = '17';
    const result = parseHandoffPayload(p);
    expect(result.ok && result.value.formData.heightCm).toBe(undefined);
  });

  it.each([
    ['not an object', null],
    ['wrong version', { ...valid(), version: 2 }],
    ['missing name', { ...valid(), formData: { ...valid().formData, fullName: ' ' } }],
    ['bad contact id', { ...valid(), contactId: 'has spaces' }],
    ['non-https source', { ...valid(), sourceUrl: 'http://example.test' }],
    ['bad coach email', { ...valid(), coachEmail: 'nobody' }],
    ['over-long note', { ...valid(), consultationNotes: [{ label: 'Why now', value: 'x'.repeat(2001) }] }],
    ['too many notes', { ...valid(), consultationNotes: Array.from({ length: 31 }, () => ({ label: 'a', value: 'b' })) }],
  ])('rejects %s', (_label, raw) => {
    expect(parseHandoffPayload(raw).ok).toBe(false);
  });
});
