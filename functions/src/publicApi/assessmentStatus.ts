import { createHash } from 'crypto';

export type IntakeBinding = {
  provider: string; externalAssessmentId: string; externalClientId: string;
  clientSlug: string; coachUid: string; coachEmail: string;
};
export type AssessmentStatus = IntakeBinding & {
  status: 'not_started' | 'in_progress' | 'completed' | 'unavailable';
  sessionId: string | null; reportUrl: string | null; completedAt: string | null; revision: number;
};
export function intakeBindingId(provider: string, externalAssessmentId: string): string {
  return createHash('sha256').update(`${provider.toLowerCase()}\0${externalAssessmentId}`).digest('hex').slice(0, 40);
}
export function sameBinding(a: IntakeBinding, b: IntakeBinding): boolean {
  return a.provider === b.provider && a.externalAssessmentId === b.externalAssessmentId &&
    a.externalClientId === b.externalClientId && a.clientSlug === b.clientSlug && a.coachUid === b.coachUid;
}
export function completionFromRecords(input: {
  binding: IntakeBinding; bindingId: string; previous?: AssessmentStatus;
  client: Record<string, unknown> | null; draft: Record<string, unknown> | null;
  sessions: Array<{ id: string; data: Record<string, unknown>; savedAt: string }>;
  appHost: string;
}): AssessmentStatus {
  const { binding, client, draft } = input;
  const unavailable = !client || client.status === 'deleted' || client.status === 'archived' ||
    (client.coachUid !== binding.coachUid && client.assignedCoachUid !== binding.coachUid);
  const sessions = input.sessions.filter(s => {
    const fd = s.data.formData as Record<string, unknown> | undefined;
    return fd?.integrationIntakeId === input.bindingId && s.data.createdBy === binding.coachUid &&
      (s.data.assessmentType === 'full' || s.data.type === 'full-assessment' || s.data.type === 'full');
  }).sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  const session = unavailable ? undefined : sessions.find(s => s.id === input.previous?.sessionId) ?? sessions[0];
  const draftData = draft?.formData as Record<string, unknown> | undefined;
  const status: AssessmentStatus['status'] = unavailable ? 'unavailable' : session ? 'completed' :
    draftData?.integrationIntakeId === input.bindingId ? 'in_progress' : 'not_started';
  const reportUrl = session ? `${input.appHost.replace(/\/+$/, '')}/dashboard/clients/${encodeURIComponent(binding.clientSlug)}/report?session=${encodeURIComponent(session.id)}` : null;
  const next = { ...binding, status, sessionId: session?.id ?? null, reportUrl, completedAt: session?.savedAt ?? null };
  const changed = !input.previous || ['status', 'sessionId', 'reportUrl', 'completedAt'].some(k =>
    next[k as keyof typeof next] !== input.previous?.[k as keyof AssessmentStatus]);
  return { ...next, revision: (input.previous?.revision ?? 0) + (changed ? 1 : 0) };
}
