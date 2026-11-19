import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, runTransaction, collection, query, where, getDocs, limit } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-one-assess',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'organizations/org-a'), {stats:{clientCount:0},subscription:{clientCap:100}});
    for (const [uid, role] of [['coach-a','coach'],['coach-b','coach'],['admin-a','owner']]) {
      await setDoc(doc(db, 'organizations/org-a/coaches/' + uid), {role});
      await setDoc(doc(db, 'user-profiles/' + uid), {organizationId:'org-a'});
    }
    await setDoc(doc(db, 'organizations/org-a/clients/other-client'), {coachUid:'coach-b',organizationId:'org-a',hasAssessmentDraft:true});
    await setDoc(doc(db, 'organizations/org-a/clients/other-client/assessmentDrafts/draft'), {formData:{fullName:'Other Client'}});
  });
  const coach = env.authenticatedContext('coach-a').firestore();
  const admin = env.authenticatedContext('admin-a').firestore();
  const outsider = env.authenticatedContext('outsider').firestore();
  const parent = 'organizations/org-a/clients/new-client';
  await assertSucceeds(getDoc(doc(coach,parent)));
  await assertSucceeds(runTransaction(coach, async tx => {
    const ref = doc(coach,parent);
    await tx.get(ref);
    await tx.get(doc(coach,parent+'/assessmentDrafts/draft'));
    tx.set(ref,{clientName:'New Client',coachUid:'coach-a',organizationId:'org-a',hasAssessmentDraft:true,assessmentCount:0});
    tx.set(doc(coach,parent+'/assessmentDrafts/draft'),{organizationId:'org-a',formData:{fullName:'New Client'}});
  }));
  await assertSucceeds(getDoc(doc(coach,parent+'/assessmentDrafts/draft')));
  await assertSucceeds(getDocs(query(collection(coach,'organizations/org-a/clients'),where('coachUid','==','coach-a'),where('hasAssessmentDraft','==',true),limit(20))));
  await assertFails(getDoc(doc(coach,'organizations/org-a/clients/other-client')));
  await assertFails(getDoc(doc(coach,'organizations/org-a/clients/other-client/assessmentDrafts/draft')));
  await assertFails(getDocs(query(collection(coach,'organizations/org-a/clients'),where('hasAssessmentDraft','==',true),limit(20))));
  await assertFails(getDoc(doc(outsider,parent)));
  await assertFails(getDoc(doc(outsider,'organizations/org-a/clients/missing')));
  await assertFails(setDoc(doc(outsider,'organizations/org-a/clients/missing'),{coachUid:'outsider'}));
  await assertSucceeds(getDoc(doc(admin,'organizations/org-a/clients/other-client/assessmentDrafts/draft')));
  process.stdout.write('Draft rules: owner reads, admin reads, atomic creation, scoped queries and cross-coach/org isolation passed.\n');
  // Intake-link submissions: org staff read, nobody writes from the client; lookup docs are server-only.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'organizations/org-a/intakes/i1'), { status: 'new', clientName: 'Test Client' });
    await setDoc(doc(db, 'intake-links/' + 'A'.repeat(22)), { organizationId: 'org-a', enabled: true });
  });
  await assertSucceeds(getDoc(doc(coach, 'organizations/org-a/intakes/i1')));
  await assertFails(getDoc(doc(outsider, 'organizations/org-a/intakes/i1')));
  await assertFails(setDoc(doc(coach, 'organizations/org-a/intakes/i2'), { status: 'new' }));
  await assertFails(setDoc(doc(admin, 'organizations/org-a/intakes/i1'), { status: 'converted' }));
  await assertFails(getDoc(doc(coach, 'intake-links/' + 'A'.repeat(22))));
} finally {
  await env.cleanup();
}
