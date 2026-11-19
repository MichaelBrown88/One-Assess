/**
 * Applies an IntakeWrite inside a Firestore transaction: one writer for the intake link and the API,
 * so both create clients and drafts identically.
 */
import { FieldValue, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { ClientDoc, IntakeConflict, IntakeWrite, OrgDoc } from './clientWrite';
import type { DraftLike } from './mergeDraft';

export type IntakeRefs = { client: DocumentReference; draft: DocumentReference; org: DocumentReference };

export function intakeRefs(db: Firestore, orgId: string, slug: string): IntakeRefs {
  return {
    client: db.doc(`organizations/${orgId}/clients/${slug}`),
    draft: db.doc(`organizations/${orgId}/clients/${slug}/assessmentDrafts/draft`),
    org: db.doc(`organizations/${orgId}`),
  };
}

/** Reads everything a build needs. Call before any write in the transaction. */
export async function readIntakeTargets(tx: Transaction, refs: IntakeRefs): Promise<{ client: ClientDoc | null; draft: DraftLike; org: OrgDoc | null }> {
  const [client, draft, org] = await Promise.all([tx.get(refs.client), tx.get(refs.draft), tx.get(refs.org)]);
  return {
    client: client.exists ? client.data() ?? {} : null,
    draft: draft.exists ? (draft.data() as DraftLike) : null,
    org: org.exists ? org.data() ?? {} : null,
  };
}

export function writeIntakeResult(
  tx: Transaction,
  refs: IntakeRefs,
  orgId: string,
  out: Extract<IntakeWrite, { kind: 'write' }>,
  draftExists: boolean,
): { created: boolean } {
  const now = FieldValue.serverTimestamp();
  if (out.newClient) tx.create(refs.client, { ...out.newClient, createdAt: now });
  tx.set(refs.client, { hasAssessmentDraft: true, draftUpdatedAt: now }, { merge: true });
  const { formData, activePhaseId, activePhaseIdx, importPath, externalImport } = out.draft;
  const fields = {
    clientName: formData.fullName,
    organizationId: orgId,
    formData,
    updatedAt: now,
    ...(activePhaseId ? { activePhaseId } : {}),
    ...(typeof activePhaseIdx === 'number' ? { activePhaseIdx } : {}),
  };
  // update() treats `externalImports.{provider}` as a nested path; a new draft only ever uses `externalImport`.
  if (draftExists) tx.update(refs.draft, { ...fields, [importPath]: externalImport });
  else tx.set(refs.draft, { ...fields, externalImport });
  return { created: Boolean(out.newClient) };
}

export type ApplyOutcome = { kind: 'conflict'; reason: IntakeConflict } | { kind: 'ok'; created: boolean };
