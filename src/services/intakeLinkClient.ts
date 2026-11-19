/**
 * Client calls for the reusable per-org intake link (functions/src/intakeLink).
 * Failures from the server carry `details.reason`; see intakeFailureReason.
 */
import { httpsCallable } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import type { RemoteSessionResult } from '@/lib/types/remoteAssessment';

export type IntakeLinkState = { token: string; enabled: boolean };
export type IntakeCandidate = { clientSlug: string; clientName: string };
export type ConvertIntakeChoice = { useClient: string } | { createNew: true; clientName?: string } | { dismiss: true };
export type ConvertIntakeResult =
  | { ok: true; kind: 'converted'; clientSlug: string; created: boolean }
  | { ok: true; kind: 'dismissed' }
  | { ok: true; kind: 'choose'; candidates: IntakeCandidate[] };

/** Public path of a gym's intake link. */
export function intakeLinkUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/start/${token}`;
}

export function intakeFailureReason(error: unknown): string {
  if (error instanceof FirebaseError) {
    const details = (error as FirebaseError & { details?: { reason?: unknown } }).details;
    if (details && typeof details.reason === 'string') return details.reason;
    return error.code.replace(/^functions\//, '');
  }
  return 'network';
}

/**
 * Loads a public link and shapes it like a remote session so the phone wizard can reuse it.
 * No prefill here: URL name/email are editable starting values, not coach-confirmed facts.
 */
export async function fetchIntakeLinkSession(linkToken: string): Promise<RemoteSessionResult & { orgName?: string }> {
  try {
    const fn = httpsCallable<{ linkToken: string }, { ok: true; orgName: string; allowedKeys: string[] } | { ok: false; reason: 'invalid' | 'disabled' }>(
      getFirebaseFunctions(), 'getIntakeLink');
    const { data } = await fn({ linkToken });
    if (!data.ok) return { ok: false, reason: data.reason };
    return { ok: true, scope: 'full', allowedKeys: data.allowedKeys, orgName: data.orgName };
  } catch (error) {
    logger.warn('[IntakeLink] load failed', error);
    return { ok: false, reason: 'network' };
  }
}

export async function submitIntakeLink(linkToken: string, fields: Record<string, string>): Promise<void> {
  await httpsCallable(getFirebaseFunctions(), 'submitIntakeLink')({ linkToken, fields });
}

export async function manageIntakeLink(action: 'enable' | 'disable' | 'regenerate'): Promise<IntakeLinkState> {
  const { data } = await httpsCallable<{ action: string }, { ok: true } & IntakeLinkState>(getFirebaseFunctions(), 'manageIntakeLink')({ action });
  return { token: data.token, enabled: data.enabled };
}

export async function convertIntake(intakeId: string, choice?: ConvertIntakeChoice): Promise<ConvertIntakeResult> {
  const { data } = await httpsCallable<{ intakeId: string; choice?: ConvertIntakeChoice }, ConvertIntakeResult>(
    getFirebaseFunctions(), 'convertIntake')({ intakeId, ...(choice ? { choice } : {}) });
  return data;
}
