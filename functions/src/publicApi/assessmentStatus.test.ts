import { describe, it, expect } from 'vitest';
import { completionFromRecords, intakeBindingId, type IntakeBinding } from './assessmentStatus';
const binding: IntakeBinding = { provider: 'One Fitness', externalAssessmentId: 'visit-a', externalClientId: 'contact-a', clientSlug: 'test-client', coachUid: 'coach-a', coachEmail: 'coach@example.test' };
const id = intakeBindingId(binding.provider, binding.externalAssessmentId);
const session = { id: 'saved-1', savedAt: '2026-11-26T10:00:00Z', data: { createdBy: 'coach-a', assessmentType: 'full', formData: { integrationIntakeId: id } } };
const base = { binding, bindingId: id, client: { coachUid: 'coach-a' }, draft: { formData: { integrationIntakeId: id } }, sessions: [session], appHost: 'https://one-assess.com' };
describe('saved assessment status', () => {
  it('completes only the exact saved full assessment and uses an authenticated snapshot link', () => {
    expect(completionFromRecords(base)).toMatchObject({ status: 'completed', sessionId: 'saved-1', reportUrl: 'https://one-assess.com/dashboard/clients/test-client/report?session=saved-1', revision: 1 });
    for (const data of [ { ...session.data, assessmentType: 'pillar' }, { ...session.data, createdBy: 'other' }, { ...session.data, formData: { integrationIntakeId: 'another-visit' } } ]) {
      expect(completionFromRecords({ ...base, sessions: [{ ...session, data }] }).status).toBe('in_progress');
    }
  });
  it('does not count draft input, a previous report, or another client as completion', () => {
    expect(completionFromRecords({ ...base, sessions: [] }).status).toBe('in_progress');
    expect(completionFromRecords({ ...base, sessions: [], draft: null }).status).toBe('not_started');
    expect(completionFromRecords({ ...base, client: { coachUid: 'another-coach' } })).toMatchObject({ status: 'unavailable', reportUrl: null });
  });
  it('is idempotent and removes completion on deletion with a higher revision', () => {
    const previous = completionFromRecords(base);
    expect(completionFromRecords({ ...base, previous })).toEqual(previous);
    expect(completionFromRecords({ ...base, previous, sessions: [] })).toMatchObject({ status: 'in_progress', reportUrl: null, revision: 2 });
    for (const client of [null, { coachUid: 'coach-a', status: 'deleted' }, { coachUid: 'coach-a', status: 'archived' }]) {
      expect(completionFromRecords({ ...base, previous, client })).toMatchObject({ status: 'unavailable', reportUrl: null, revision: 2 });
    }
  });
});
