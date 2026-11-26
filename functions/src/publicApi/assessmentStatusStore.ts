import { type Firestore } from 'firebase-admin/firestore';
import { completionFromRecords, type AssessmentStatus, type IntakeBinding } from './assessmentStatus';

export async function refreshAssessmentStatus(db: Firestore, orgId: string, bindingId: string, appHost: string): Promise<AssessmentStatus | null> {
  const ref = db.doc(`organizations/${orgId}/assessmentIntakes/${bindingId}`);
  return db.runTransaction(async tx => {
    const bindingSnap = await tx.get(ref);
    if (!bindingSnap.exists) return null;
    const raw = bindingSnap.data() as IntakeBinding;
    const binding: IntakeBinding = { provider: raw.provider, externalAssessmentId: raw.externalAssessmentId,
      externalClientId: raw.externalClientId, clientSlug: raw.clientSlug, coachUid: raw.coachUid, coachEmail: raw.coachEmail };
    const base = `organizations/${orgId}/clients/${binding.clientSlug}`;
    const [client, draft, sessions] = await Promise.all([
      tx.get(db.doc(base)), tx.get(db.doc(`${base}/assessmentDrafts/draft`)),
      tx.get(db.collection(`${base}/sessions`).where('formData.integrationIntakeId', '==', bindingId).limit(50)),
    ]);
    const previous = bindingSnap.get('result') as AssessmentStatus | undefined;
    const result = completionFromRecords({ binding, bindingId, previous,
      client: client.data() ?? null, draft: draft.data() ?? null, appHost,
      sessions: sessions.docs.map(doc => ({ id: doc.id, data: doc.data(), savedAt: doc.get('timestamp')?.toDate?.().toISOString() ?? doc.createTime.toDate().toISOString() })),
    });
    if (result.revision !== previous?.revision) tx.update(ref, { result });
    return result;
  });
}

export async function refreshClientAssessmentStatuses(db: Firestore, orgId: string, clientSlug: string, appHost: string): Promise<void> {
  const bindings = await db.collection(`organizations/${orgId}/assessmentIntakes`).where('clientSlug', '==', clientSlug).limit(50).get();
  await Promise.all(bindings.docs.map(doc => refreshAssessmentStatus(db, orgId, doc.id, appHost)));
}
