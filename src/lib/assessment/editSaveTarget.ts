/**
 * Decide whether an edit updates an existing session or, only when no session
 * can be identified, appends one (legacy links with nothing to update).
 *
 * Session document ids come from sessionIdFromDate(): an ISO timestamp with
 * colons and dots replaced. A client slug must never be used as a session id.
 */

const SESSION_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

export function isAssessmentSessionId(value: string | null | undefined): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value.trim());
}

export type EditSaveTarget =
  | { mode: 'in-place'; sessionId: string; source: 'payload' | 'current-session' }
  | { mode: 'append' };

export function resolveEditSessionTarget(input: {
  snapshotId?: string | null;
  latestSessionId?: string | null;
}): EditSaveTarget {
  const explicit = input.snapshotId?.trim();
  if (explicit && isAssessmentSessionId(explicit)) {
    return { mode: 'in-place', sessionId: explicit, source: 'payload' };
  }

  const latest = input.latestSessionId?.trim();
  if (latest) {
    return { mode: 'in-place', sessionId: latest, source: 'current-session' };
  }

  return { mode: 'append' };
}
