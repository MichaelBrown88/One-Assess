import { describe, expect, it } from 'vitest';
import { isAssessmentSessionId, resolveEditSessionTarget } from './editSaveTarget';

const SESSION = '2026-11-01T10-00-00-000Z';
const OLDER = '2026-10-01T10-00-00-000Z';

describe('resolveEditSessionTarget', () => {
  it('updates the session named on the edit payload', () => {
    expect(resolveEditSessionTarget({ snapshotId: SESSION, latestSessionId: OLDER })).toEqual({
      mode: 'in-place',
      sessionId: SESSION,
      source: 'payload',
    });
  });

  it('updates the current session when an old link has no snapshot id', () => {
    expect(resolveEditSessionTarget({ snapshotId: undefined, latestSessionId: SESSION })).toEqual({
      mode: 'in-place',
      sessionId: SESSION,
      source: 'current-session',
    });
  });

  it('ignores a client slug and still uses the current session', () => {
    expect(isAssessmentSessionId('jane-doe')).toBe(false);
    expect(resolveEditSessionTarget({ snapshotId: 'jane-doe', latestSessionId: SESSION })).toEqual({
      mode: 'in-place',
      sessionId: SESSION,
      source: 'current-session',
    });
  });

  it('appends only when no session can be identified', () => {
    expect(resolveEditSessionTarget({ snapshotId: 'jane-doe', latestSessionId: null })).toEqual({
      mode: 'append',
    });
    expect(resolveEditSessionTarget({})).toEqual({ mode: 'append' });
  });
});
