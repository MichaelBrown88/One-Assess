import { describe, expect, it } from 'vitest';
import { parseIntakeRequest } from './intakeRequest';

const NOW = new Date('2026-11-19T00:00:00Z');
const valid = () => ({
  provider: 'Example CRM',
  externalClientId: 'crm-123',
  sourceUrl: 'https://crm.example.test/clients/123',
  coachEmail: 'Coach@Example.test',
  client: { fullName: ' Test  Client ', email: 'Client@Example.test', phone: '+000' },
  fields: { version: 1, gender: 'female', clientGoals: ['build-strength'], activityLevel: 'lightly-active', bogus: 'x' },
  notes: { health: [{ label: 'Injuries', value: 'Example' }], consultation: [{ label: 'Why now', value: 'Example' }] },
  measurements: [{ field: 'weightKg', label: 'Self-reported weight', value: '70', unit: 'kg', date: '2026-11-19' }],
});

describe('parseIntakeRequest', () => {
  it('builds a standard intake from a full request', () => {
    const r = parseIntakeRequest(valid(), NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.clientName).toBe('Test Client');
    expect(r.value.coachEmail).toBe('coach@example.test');
    expect(r.value.intake).toEqual({
      provider: 'Example CRM', externalClientId: 'crm-123', sourceUrl: 'https://crm.example.test/clients/123',
      formData: { fullName: 'Test Client', email: 'client@example.test', phone: '+000', gender: 'female', clientGoals: ['build-strength'], activityLevel: 'lightly-active' },
      healthNotes: [{ label: 'Injuries', value: 'Example' }],
      consultationNotes: [{ label: 'Why now', value: 'Example' }],
      metrics: valid().measurements,
    });
  });

  it('accepts the minimum: provider and a name', () => {
    const r = parseIntakeRequest({ provider: 'X', client: { fullName: 'Test Client' } });
    expect(r.ok && r.value.intake.formData).toEqual({ fullName: 'Test Client' });
  });

  it.each([
    ['no body', null, 'invalid_body'],
    ['no provider', { ...valid(), provider: '' }, 'invalid_provider'],
    ['reserved provider', { ...valid(), provider: 'intake-link' }, 'invalid_provider'],
    ['bad external id', { ...valid(), externalClientId: 'has spaces' }, 'invalid_external_client_id'],
    ['http source', { ...valid(), sourceUrl: 'http://x' }, 'invalid_source_url'],
    ['no name', { ...valid(), client: { email: 'a@b.test' } }, 'invalid_client_name'],
    ['bad email', { ...valid(), client: { fullName: 'Test Client', email: 'nope' } }, 'invalid_client_email'],
    ['future field version', { ...valid(), fields: { version: 2 } }, 'unsupported_fields_version'],
    ['bad note', { ...valid(), notes: { health: [{ label: 'x' }] } }, 'invalid_notes'],
    ['bad measurement', { ...valid(), measurements: [{ field: 'x' }] }, 'invalid_measurements'],
    ['bad coach email', { ...valid(), coachEmail: 'nope' }, 'invalid_coach_email'],
  ])('rejects %s', (_label, raw, code) => {
    const r = parseIntakeRequest(raw, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(code);
  });
});
