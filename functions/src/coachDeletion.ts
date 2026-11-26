import * as admin from 'firebase-admin';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

type DeleteRequest = { organizationId: string; clientId: string; snapshotId?: string };
const segment = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && !value.includes('/') && value !== '.' && value !== '..';

/** Unlike broad org administration, this operation only permits the assigned coach. */
export function assertDeletionAccess(uid: string | undefined, member: boolean, coachUid: unknown, status: unknown, permanent: boolean): void {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before deleting.');
  if (!member || coachUid !== uid) throw new HttpsError('permission-denied', 'Only the assigned coach can delete this client’s data.');
  if (permanent && status !== 'deleted') throw new HttpsError('failed-precondition', 'Move the client to Trash before deleting permanently.');
}

export async function handleCoachDeletion(request: CallableRequest<DeleteRequest>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before deleting.');
  const { organizationId: orgId, clientId, snapshotId } = request.data ?? {};
  if (!segment(orgId) || !segment(clientId) || (snapshotId !== undefined && !segment(snapshotId))) {
    throw new HttpsError('invalid-argument', 'Valid organization, client and assessment IDs are required.');
  }
  const db = admin.firestore();
  const clientRef = db.doc(`organizations/${orgId}/clients/${clientId}`);
  const [member, client] = await Promise.all([
    db.doc(`organizations/${orgId}/coaches/${uid}`).get(), clientRef.get(),
  ]);
  if (!client.exists) throw new HttpsError('not-found', 'Client not found.');
  assertDeletionAccess(uid, member.exists, client.data()?.coachUid, client.data()?.status, !snapshotId);

  if (snapshotId) {
    // Transaction reads the history and profile together: retries if a concurrent save changes either.
    return db.runTransaction(async transaction => {
      const [profile, history, reports] = await Promise.all([
        transaction.get(clientRef),
        transaction.get(clientRef.collection('sessions').orderBy('timestamp', 'desc')),
        transaction.get(db.collection('shared-reports').where('organizationId', '==', orgId).where('assessmentId', '==', clientId)),
      ]);
      assertDeletionAccess(uid, member.exists, profile.data()?.coachUid, profile.data()?.status, false);
      const selected = history.docs.find(item => item.id === snapshotId);
      if (!selected) throw new HttpsError('not-found', 'Assessment not found. Refresh and try again.');
      const remaining = history.docs.filter(item => item.id !== snapshotId);
      const latest = history.docs[0]?.id === snapshotId;
      const publicChildren = latest ? await Promise.all(reports.docs.flatMap(report => ['snapshots', 'achievements', 'notifications', 'lifestyleCheckins', 'preSessionCheckins', 'clientConsent'].map(name => transaction.get(report.ref.collection(name))))) : [];
      const patch: Record<string, unknown> = { assessmentCount: remaining.length, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      transaction.delete(selected.ref);
      if (latest) {
        const previous = remaining[0]?.data();
        const currentRef = clientRef.collection('current').doc('state');
        const clear = admin.firestore.FieldValue.delete();
        for (const key of ['scoresSummary', 'categoryScores', 'pillarBreakdown', 'overallScore', 'previousScore', 'trend', 'lastAssessmentDate', 'assessedAt', 'lastBodyCompDate', 'lastBodyCompositionDate', 'lastInBodyDate', 'lastPostureDate', 'lastFitnessDate', 'lastStrengthDate', 'lastLifestyleDate', 'shareToken', 'retestSchedule']) patch[key] = clear;
        if (previous) {
          transaction.set(currentRef, { ...previous, organizationId: orgId, coachUid: uid, lastUpdated: previous.timestamp });
          Object.assign(patch, { formData: previous.formData ?? {}, overallScore: previous.overallScore ?? 0,
            lastAssessmentDate: previous.timestamp, assessedAt: previous.timestamp,
            previousScore: remaining[1]?.data().overallScore ?? 0,
            trend: remaining[1] ? (previous.overallScore ?? 0) - (remaining[1].data().overallScore ?? 0) : 0 });
          for (const key of ['scoresSummary', 'categoryScores', 'pillarBreakdown']) if (previous[key] != null) patch[key] = previous[key];
        } else {
          transaction.delete(currentRef);
          patch.formData = {};
        }
        publicChildren.forEach(collection => collection.docs.forEach(child => transaction.delete(child.ref)));
        // Keep a non-personal revocation marker so old URLs stop working and
        // permanent client erasure can still discover the token's Storage files.
        reports.docs.forEach(report => transaction.set(report.ref, { revoked: true, organizationId: orgId, assessmentId: clientId, coachUid: uid }));
      }
      transaction.update(clientRef, patch);
      return { success: true, message: !latest ? 'Assessment deleted. The current report is unchanged.' : remaining.length
        ? 'Assessment deleted. The previous assessment is now current. Share it again to create a new report link.'
        : 'Assessment deleted. The client profile is kept.' };
    });
  }

  // Keep the Trash profile until every cleanup succeeds. A failure is visible and retryable.
  // Prefix ends in / so adjacent client IDs can never match.
  await db.runTransaction(async transaction => {
    const latest = await transaction.get(clientRef);
    assertDeletionAccess(uid, member.exists, latest.data()?.coachUid, latest.data()?.status, true);
    transaction.update(clientRef, { permanentDeletionStartedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  const bucket = admin.storage().bucket();
  await bucket.deleteFiles({ prefix: `organizations/${orgId}/clients/${clientId}/` });
  for (const [collection, field] of [['shared-reports', 'assessmentId'], ['shared-roadmaps', 'assessmentId'], ['remote-tokens', 'clientSlug']] as const) {
    const related = await db.collection(collection).where('organizationId', '==', orgId).where(field, '==', clientId).get();
    for (const document of related.docs) {
      if (collection === 'shared-reports') await bucket.deleteFiles({ prefix: `publicReportShare/${document.id}/` });
      await db.recursiveDelete(document.ref);
    }
  }
  for (const collection of await clientRef.listCollections()) await db.recursiveDelete(collection);
  await db.runTransaction(async transaction => {
    const current = await transaction.get(clientRef);
    if (!current.exists) return;
    assertDeletionAccess(uid, member.exists, current.data()?.coachUid, current.data()?.status, true);
    transaction.delete(clientRef);
    transaction.update(db.doc(`organizations/${orgId}`), { 'stats.clientCount': admin.firestore.FieldValue.increment(-1), 'stats.lastUpdated': admin.firestore.FieldValue.serverTimestamp() });
  });
  return { success: true, message: 'Client permanently deleted.' };
}
