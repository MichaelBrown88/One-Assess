import { describe, expect, it } from 'vitest';
import { metricRow, noteRow, parseRows, sanitizeIntakeFields, STANDARD_INTAKE_KEYS } from './standardFields';

const NOW = new Date('2026-11-19T00:00:00Z');

describe('sanitizeIntakeFields', () => {
  it('keeps valid standard fields and normalises them', () => {
    const input = {
      fullName: '  Test   Client ', email: 'Client@Example.test', phone: '+000', dateOfBirth: '1990-05-01',
      gender: 'female', heightCm: '170', trainingHistory: 'beginner', recentActivity: 'stopped-3-months',
      activityLevel: 'lightly-active', sleepArchetype: 'good', stressLevel: 'low', nutritionHabits: 'fair',
      hydrationHabits: 'poor', stepsPerDay: '8000', caffeineCupsPerDay: '2', clientGoals: ['build-strength', 'weight-loss'],
      trainingFrequency: '3', goalDeadline: '2027-03-01', medicationsFlag: 'yes', medicationsNotes: 'Example',
      parq1: 'no', parq12: 'yes',
    };
    expect(sanitizeIntakeFields(input, NOW)).toEqual({ ...input, fullName: 'Test Client', email: 'client@example.test' });
  });

  it('accepts comma-separated goals from the phone wizard', () => {
    expect(sanitizeIntakeFields({ clientGoals: 'build-muscle, nope ,general-health' }).clientGoals).toEqual(['build-muscle', 'general-health']);
  });

  it.each([
    ['unknown key', { postureImages: 'x' }],
    ['bad enum', { gender: 'other', parq1: 'maybe' }],
    ['out-of-range number', { heightCm: '20', stepsPerDay: '-1' }],
    ['bad date', { dateOfBirth: '01/05/1990' }],
    ['implausible birth year', { dateOfBirth: '2024-01-01' }],
    ['bad email', { email: 'nobody' }],
    ['short name', { fullName: 'A' }],
    ['over-long note', { medicationsNotes: 'x'.repeat(2001) }],
  ])('drops %s', (_label, raw) => {
    expect(sanitizeIntakeFields(raw, NOW)).toEqual({});
  });

  it('ignores non-objects', () => {
    expect(sanitizeIntakeFields(null)).toEqual({});
    expect(sanitizeIntakeFields('x')).toEqual({});
  });

  it('offers current intake fields while retaining legacy API support', () => {
    expect(STANDARD_INTAKE_KEYS).not.toContain('parq13');
    expect(STANDARD_INTAKE_KEYS).not.toContain('medicationsFlag');
    expect(STANDARD_INTAKE_KEYS).toContain('sleepHours');
    expect(STANDARD_INTAKE_KEYS).toContain('clientGoals');
    expect(STANDARD_INTAKE_KEYS).not.toContain('inbodyWeightKg');
  });
});

describe('row parsers', () => {
  it('parses notes and metrics and rejects bad rows', () => {
    expect(parseRows([{ label: 'Why now', value: 'Example' }], noteRow)).toEqual([{ label: 'Why now', value: 'Example' }]);
    expect(parseRows([{ label: 'Why now' }], noteRow)).toBeNull();
    expect(parseRows(Array.from({ length: 31 }, () => ({ label: 'a', value: 'b' })), noteRow)).toBeNull();
    expect(parseRows(undefined, metricRow)).toEqual([]);
    expect(parseRows([{ field: 'weightKg', label: 'Weight', value: '70', unit: 'kg', date: '2026-11-19' }], metricRow)).toHaveLength(1);
  });
});
