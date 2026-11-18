/**
 * Write-time studio snapshots and weekly pulse for the platform owner console.
 * Triggered on organisation writes, full baseline assessments, and a daily flag refresh.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { firestoreValueToDate as toDate } from './firestoreTimestamp';
import {
  currencyRatesFromFirestoreDoc,
  DEFAULT_CURRENCY_RATES,
  subscriptionSmallestUnitToGbpPence,
  type CurrencyRatesForReporting,
} from './shared/reportingFx';
import {
  emptyAssessmentActivity,
  emptyWeekCounts,
  effectiveAssessmentsThisWeek,
  isFullBaselineAssessment,
  isInternalStudio,
  isPayingStatus,
  laterDate,
  mapBuyerType,
  mapPayStatus,
  mergeAssessmentTimestamp,
  nextAssessmentsThisWeek,
  OWNER_CONSOLE,
  OWNER_CONSOLE_PATHS,
  resolveNeedsYou,
  resolveStudioPayStatus,
  shouldCountStudio,
  shouldRollPulseWeek,
  shouldSurfaceNeedsYou,
  snapshotRevenuePence,
  startOfIsoWeekUtc,
  type AssessmentActivity,
  type OwnerBuyerType,
  type OwnerNeedsYouReason,
  type OwnerPayStatus,
  type OwnerWeekCounts,
} from './shared/ownerConsole';

function getDb() {
  return admin.firestore();
}

function snapshotRef(orgId: string) {
  return getDb().doc(`${OWNER_CONSOLE_PATHS.snapshots}/${orgId}`);
}

function pulseRef() {
  return getDb().doc(OWNER_CONSOLE_PATHS.pulse);
}

let cachedRates: CurrencyRatesForReporting | null = null;

async function getCurrencyRates(): Promise<CurrencyRatesForReporting> {
  if (cachedRates) return cachedRates;
  try {
    const configSnap = await getDb().doc('platform/config').get();
    cachedRates = currencyRatesFromFirestoreDoc(configSnap.data() as Record<string, unknown> | undefined);
    return cachedRates;
  } catch {
    cachedRates = DEFAULT_CURRENCY_RATES;
    return cachedRates;
  }
}

async function subscriptionGbpPence(sub: Record<string, unknown> | undefined): Promise<number> {
  if (!sub) return 0;
  const amountSmallest = Number(sub.amountCents ?? sub.amountFils ?? 0);
  const currency = typeof sub.currency === 'string' ? sub.currency : 'GBP';
  const rates = await getCurrencyRates();
  return subscriptionSmallestUnitToGbpPence(amountSmallest, currency, rates);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function numberField(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

interface PulseIncrements {
  newStudios?: number;
  firstAssessments?: number;
  assessmentsCompleted?: number;
  payingStudios?: number;
  monthlyRevenueGbpPence?: number;
}

async function applyPulseIncrements(now: Date, increments: PulseIncrements): Promise<void> {
  const ref = pulseRef();
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? {};
    const storedWeek = toDate(data.weekStartsAt);
    let thisWeek: OwnerWeekCounts = {
      ...emptyWeekCounts(),
      ...(asRecord(data.thisWeek) as OwnerWeekCounts | undefined),
    };
    let lastWeek: OwnerWeekCounts = {
      ...emptyWeekCounts(),
      ...(asRecord(data.lastWeek) as OwnerWeekCounts | undefined),
    };

    if (shouldRollPulseWeek(storedWeek, now)) {
      lastWeek = storedWeek ? { ...thisWeek } : emptyWeekCounts();
      thisWeek = emptyWeekCounts();
    }

    thisWeek = {
      newStudios: Math.max(0, thisWeek.newStudios + (increments.newStudios ?? 0)),
      firstAssessments: Math.max(0, thisWeek.firstAssessments + (increments.firstAssessments ?? 0)),
      assessmentsCompleted: Math.max(0, thisWeek.assessmentsCompleted + (increments.assessmentsCompleted ?? 0)),
    };

    tx.set(
      ref,
      {
        weekStartsAt: admin.firestore.Timestamp.fromDate(startOfIsoWeekUtc(now)),
        thisWeek,
        lastWeek,
        payingStudios: Math.max(0, numberField(data.payingStudios) + (increments.payingStudios ?? 0)),
        monthlyRevenueGbpPence: Math.max(
          0,
          numberField(data.monthlyRevenueGbpPence) + (increments.monthlyRevenueGbpPence ?? 0),
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

function seatCount(sub: Record<string, unknown> | undefined): number {
  const cap = numberField(sub?.clientCap, 0);
  const seats = numberField(sub?.clientSeats, 0);
  return cap > 0 ? cap : seats;
}

interface SnapshotFields {
  orgId: string;
  name: string;
  ownerEmail: string;
  joinedAt: Date;
  payStatus: OwnerPayStatus;
  buyerType: OwnerBuyerType;
  trialEndsAt: Date | null;
  seatCount: number;
  assessmentCount: number;
  firstAssessmentAt: Date | admin.firestore.Timestamp | null;
  lastActivityAt: Date;
  assessmentsThisWeek: number;
  assessmentWeekStartMs: number | null;
  monthlyRevenueGbpPence: number;
}

function needsYouWrite(
  fields: SnapshotFields,
  now: Date,
): { needsYou: boolean; needsYouReason: OwnerNeedsYouReason | null; needsYouAt: admin.firestore.Timestamp | null } {
  const firstMs = toDate(fields.firstAssessmentAt)?.getTime() ?? null;
  const reason = resolveNeedsYou(
    {
      payStatus: fields.payStatus,
      firstAssessmentAtMs: firstMs,
      assessmentCount: fields.assessmentCount,
      lastActivityAtMs: fields.lastActivityAt.getTime(),
      trialEndsAtMs: fields.trialEndsAt?.getTime() ?? null,
    },
    now.getTime(),
  );
  const surface = shouldSurfaceNeedsYou(reason, fields.name, firstMs);
  return {
    needsYou: surface,
    needsYouReason: surface ? reason : null,
    needsYouAt: surface ? admin.firestore.Timestamp.fromDate(now) : null,
  };
}

async function writeSnapshot(orgId: string, fields: SnapshotFields, now: Date): Promise<void> {
  const flags = needsYouWrite(fields, now);
  await snapshotRef(orgId).set(
    {
      orgId,
      name: fields.name,
      ownerEmail: fields.ownerEmail,
      joinedAt: fields.joinedAt,
      payStatus: fields.payStatus,
      buyerType: fields.buyerType,
      trialEndsAt: fields.trialEndsAt,
      seatCount: fields.seatCount,
      assessmentCount: fields.assessmentCount,
      firstAssessmentAt: fields.firstAssessmentAt,
      lastActivityAt: fields.lastActivityAt,
      assessmentsThisWeek: fields.assessmentsThisWeek,
      assessmentWeekStartMs: fields.assessmentWeekStartMs,
      monthlyRevenueGbpPence: fields.monthlyRevenueGbpPence,
      ...flags,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

function orgName(data: Record<string, unknown> | undefined): string {
  return typeof data?.name === 'string' ? data.name.trim() : '';
}

function ownerEmail(org: Record<string, unknown> | undefined, sub: Record<string, unknown> | undefined): string {
  const billing = typeof sub?.billingEmail === 'string' ? sub.billingEmail.trim() : '';
  if (billing) return billing;
  const adminEmail = typeof org?.adminEmail === 'string' ? org.adminEmail.trim() : '';
  return adminEmail;
}

function sessionTimestamp(data: Record<string, unknown>): Date | null {
  return toDate(data.timestamp) ?? toDate(data.createdAt) ?? toDate(data.completedAt);
}

function payStatusForOrg(org: Record<string, unknown> | undefined, sub: Record<string, unknown> | undefined): OwnerPayStatus {
  return resolveStudioPayStatus({
    isInternal: isInternalStudio({ metadata: asRecord(org?.metadata) }),
    status: sub?.status,
  });
}

const CLIENT_PAGE = 50;
const SESSION_PAGE = 100;

async function foldClientSessions(
  orgId: string,
  clientId: string,
  acc: AssessmentActivity,
  now: Date,
): Promise<AssessmentActivity> {
  const db = getDb();
  let last: admin.firestore.QueryDocumentSnapshot | undefined;
  let next = acc;
  for (;;) {
    let query: admin.firestore.Query = db
      .collection(`organizations/${orgId}/clients/${clientId}/sessions`)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(SESSION_PAGE);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    for (const sessionSnap of page.docs) {
      const data = sessionSnap.data();
      if (!isFullBaselineAssessment(data)) continue;
      const ts = sessionTimestamp(data);
      if (!ts) continue;
      next = mergeAssessmentTimestamp(next, ts, now);
    }
    last = page.docs[page.docs.length - 1];
    if (page.size < SESSION_PAGE) break;
  }
  return next;
}

async function loadAssessmentActivity(orgId: string, now: Date): Promise<AssessmentActivity> {
  const db = getDb();
  let acc = emptyAssessmentActivity();
  let last: admin.firestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let query: admin.firestore.Query = db
      .collection(`organizations/${orgId}/clients`)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(CLIENT_PAGE);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    for (const clientSnap of page.docs) {
      acc = await foldClientSessions(orgId, clientSnap.id, acc, now);
    }
    last = page.docs[page.docs.length - 1];
    if (page.size < CLIENT_PAGE) break;
  }
  return acc;
}

export async function syncStudioFromOrganization(params: {
  orgId: string;
  after?: admin.firestore.DocumentData;
  before?: admin.firestore.DocumentData;
  isCreated: boolean;
  isDeleted: boolean;
}): Promise<void> {
  const { orgId, after, before, isCreated, isDeleted } = params;
  const now = new Date();

  if (isDeleted) {
    const existing = await snapshotRef(orgId).get();
    if (existing.exists) {
      const payStatus = mapPayStatus(existing.data()?.payStatus);
      const revenue = numberField(existing.data()?.monthlyRevenueGbpPence);
      await snapshotRef(orgId).delete();
      await applyPulseIncrements(now, {
        payingStudios: isPayingStatus(payStatus) ? -1 : 0,
        monthlyRevenueGbpPence: isPayingStatus(payStatus) ? -revenue : 0,
      });
    }
    return;
  }

  if (!after) return;
  if (!shouldCountStudio(after)) {
    const existing = await snapshotRef(orgId).get();
    if (existing.exists) {
      await snapshotRef(orgId).delete();
    }
    return;
  }

  const afterSub = asRecord(after.subscription);
  const beforeSub = asRecord(before?.subscription);
  const afterStatus = payStatusForOrg(after, afterSub);
  const beforeStatus = before ? payStatusForOrg(before, beforeSub) : afterStatus;
  const afterRevenue = snapshotRevenuePence(afterStatus, await subscriptionGbpPence(afterSub));
  const beforeRevenue = before ? snapshotRevenuePence(beforeStatus, await subscriptionGbpPence(beforeSub)) : 0;
  const existingSnap = await snapshotRef(orgId).get();
  const existing = existingSnap.data();

  const joinedAt = toDate(after.createdAt) ?? toDate(existing?.joinedAt) ?? now;
  const assessmentCount = numberField(existing?.assessmentCount, numberField(asRecord(after.stats)?.assessmentCount));
  const firstAssessmentAt = existing?.firstAssessmentAt ?? null;
  const lastActivityAt =
    laterDate(toDate(existing?.lastActivityAt), toDate(asRecord(after.stats)?.lastAssessmentDate)) ?? joinedAt;

  await writeSnapshot(
    orgId,
    {
      orgId,
      name: orgName(after),
      ownerEmail: ownerEmail(after, afterSub),
      joinedAt,
      payStatus: afterStatus,
      buyerType: mapBuyerType(after.type),
      trialEndsAt: toDate(afterSub?.trialEndsAt),
      seatCount: seatCount(afterSub),
      assessmentCount,
      firstAssessmentAt,
      lastActivityAt,
      assessmentsThisWeek: numberField(existing?.assessmentsThisWeek),
      assessmentWeekStartMs:
        typeof existing?.assessmentWeekStartMs === 'number' ? existing.assessmentWeekStartMs : null,
      monthlyRevenueGbpPence: afterRevenue,
    },
    now,
  );

  const pulse: PulseIncrements = {};
  if (isCreated || !existingSnap.exists) {
    if (joinedAt.getTime() >= startOfIsoWeekUtc(now).getTime()) {
      pulse.newStudios = 1;
    }
  }

  const wasPaying = existingSnap.exists
    ? isPayingStatus(mapPayStatus(existing?.payStatus ?? beforeStatus))
    : Boolean(before) && isPayingStatus(beforeStatus);
  const isPayingNow = isPayingStatus(afterStatus);

  if (isPayingNow && !wasPaying) {
    pulse.payingStudios = 1;
    pulse.monthlyRevenueGbpPence = afterRevenue;
  } else if (!isPayingNow && wasPaying) {
    pulse.payingStudios = -1;
    pulse.monthlyRevenueGbpPence = -(
      existingSnap.exists ? numberField(existing?.monthlyRevenueGbpPence, beforeRevenue) : beforeRevenue
    );
  } else if (isPayingNow && wasPaying && afterRevenue !== beforeRevenue) {
    pulse.monthlyRevenueGbpPence = afterRevenue - beforeRevenue;
  }

  if (Object.keys(pulse).length > 0) {
    await applyPulseIncrements(now, pulse);
  }
}

export async function recordStudioFullAssessment(
  orgId: string,
  sessionData: Record<string, unknown>,
): Promise<void> {
  if (!isFullBaselineAssessment(sessionData)) return;

  const orgSnap = await getDb().doc(`organizations/${orgId}`).get();
  if (!orgSnap.exists) return;
  const org = orgSnap.data();
  if (!org || !shouldCountStudio(org)) return;

  const now = toDate(sessionData.timestamp) ?? toDate(sessionData.createdAt) ?? new Date();
  const existingSnap = await snapshotRef(orgId).get();
  const existing = existingSnap.data();
  const sub = asRecord(org.subscription);
  const payStatus = payStatusForOrg(org, sub);
  const isFirst = !existing?.firstAssessmentAt;
  const revenue = snapshotRevenuePence(payStatus, await subscriptionGbpPence(sub));
  const week = nextAssessmentsThisWeek(
    numberField(existing?.assessmentsThisWeek),
    typeof existing?.assessmentWeekStartMs === 'number' ? existing.assessmentWeekStartMs : null,
    now,
  );

  await writeSnapshot(
    orgId,
    {
      orgId,
      name: orgName(org),
      ownerEmail: ownerEmail(org, sub),
      joinedAt: toDate(org.createdAt) ?? toDate(existing?.joinedAt) ?? now,
      payStatus,
      buyerType: mapBuyerType(org.type),
      trialEndsAt: toDate(sub?.trialEndsAt),
      seatCount: seatCount(sub),
      assessmentCount: numberField(existing?.assessmentCount) + 1,
      firstAssessmentAt: existing?.firstAssessmentAt ?? now,
      lastActivityAt: now,
      assessmentsThisWeek: week.assessmentsThisWeek,
      assessmentWeekStartMs: week.assessmentWeekStartMs,
      monthlyRevenueGbpPence: revenue,
    },
    now,
  );

  const extra: PulseIncrements = existingSnap.exists
    ? {}
    : {
        newStudios: (toDate(org.createdAt) ?? now).getTime() >= startOfIsoWeekUtc(now).getTime() ? 1 : 0,
        payingStudios: isPayingStatus(payStatus) ? 1 : 0,
        monthlyRevenueGbpPence: isPayingStatus(payStatus) ? revenue : 0,
      };

  await applyPulseIncrements(now, {
    firstAssessments: isFirst ? 1 : 0,
    assessmentsCompleted: 1,
    ...extra,
  });
}

export async function refreshStudioNeedsYouFlags(now: Date = new Date()): Promise<void> {
  const db = getDb();
  let last: admin.firestore.QueryDocumentSnapshot | undefined;
  for (let page = 0; page < OWNER_CONSOLE.REBUILD_MAX_PAGES; page += 1) {
    let query = db
      .collection(OWNER_CONSOLE_PATHS.snapshots)
      .orderBy('joinedAt', 'desc')
      .limit(OWNER_CONSOLE.REBUILD_PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const batchSnap = await query.get();
    if (batchSnap.empty) break;

    const writer = db.batch();
    batchSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const lastActivityAt = toDate(data.lastActivityAt) ?? toDate(data.joinedAt) ?? now;
      const fields: SnapshotFields = {
        orgId: docSnap.id,
        name: typeof data.name === 'string' ? data.name : '',
        ownerEmail: typeof data.ownerEmail === 'string' ? data.ownerEmail : '',
        joinedAt: toDate(data.joinedAt) ?? now,
        payStatus: mapPayStatus(data.payStatus),
        buyerType: mapBuyerType(data.buyerType),
        trialEndsAt: toDate(data.trialEndsAt),
        seatCount: numberField(data.seatCount),
        assessmentCount: numberField(data.assessmentCount),
        firstAssessmentAt: toDate(data.firstAssessmentAt),
        lastActivityAt,
        assessmentsThisWeek: effectiveAssessmentsThisWeek(
          numberField(data.assessmentsThisWeek),
          typeof data.assessmentWeekStartMs === 'number' ? data.assessmentWeekStartMs : null,
          now,
        ),
        assessmentWeekStartMs:
          typeof data.assessmentWeekStartMs === 'number' ? data.assessmentWeekStartMs : null,
        monthlyRevenueGbpPence: numberField(data.monthlyRevenueGbpPence),
      };
      const flags = needsYouWrite(fields, now);
      writer.set(
        docSnap.ref,
        {
          ...flags,
          assessmentsThisWeek: fields.assessmentsThisWeek,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
    await writer.commit();
    last = batchSnap.docs[batchSnap.docs.length - 1];
    if (batchSnap.size < OWNER_CONSOLE.REBUILD_PAGE_SIZE) break;
  }
}

export async function rebuildOwnerConsole(now: Date = new Date()): Promise<{ studios: number }> {
  const db = getDb();
  const weekStartMs = startOfIsoWeekUtc(now).getTime();
  let last: admin.firestore.QueryDocumentSnapshot | undefined;
  let studios = 0;
  let payingStudios = 0;
  let monthlyRevenueGbpPence = 0;
  let newStudios = 0;
  let firstAssessments = 0;
  let assessmentsCompleted = 0;
  let lastWeekNewStudios = 0;
  let lastWeekFirstAssessments = 0;
  let lastWeekCompleted = 0;

  for (let page = 0; page < OWNER_CONSOLE.REBUILD_MAX_PAGES; page += 1) {
    let query: admin.firestore.Query = db
      .collection('organizations')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(OWNER_CONSOLE.REBUILD_PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const batchSnap = await query.get();
    if (batchSnap.empty) break;

    for (const docSnap of batchSnap.docs) {
      const org = docSnap.data();
      if (!shouldCountStudio(org)) {
        await snapshotRef(docSnap.id).delete();
        continue;
      }

      const existingSnap = await snapshotRef(docSnap.id).get();
      const existing = existingSnap.data();
      const sub = asRecord(org.subscription);
      const payStatus = payStatusForOrg(org, sub);
      const revenue = snapshotRevenuePence(payStatus, await subscriptionGbpPence(sub));
      const joinedAt = toDate(org.createdAt) ?? now;
      const activity = await loadAssessmentActivity(docSnap.id, now);
      const firstAssessmentAt = activity.firstAssessmentAt;
      const lastActivityAt = activity.lastActivityAt ?? toDate(existing?.lastActivityAt) ?? joinedAt;
      const weekCount = activity.assessmentsThisWeek;
      const weekStartForStudio = startOfIsoWeekUtc(now).getTime();

      await writeSnapshot(
        docSnap.id,
        {
          orgId: docSnap.id,
          name: orgName(org),
          ownerEmail: ownerEmail(org, sub),
          joinedAt,
          payStatus,
          buyerType: mapBuyerType(org.type),
          trialEndsAt: toDate(sub?.trialEndsAt),
          seatCount: seatCount(sub),
          assessmentCount: activity.assessmentCount,
          firstAssessmentAt,
          lastActivityAt,
          assessmentsThisWeek: weekCount,
          assessmentWeekStartMs: weekStartForStudio,
          monthlyRevenueGbpPence: revenue,
        },
        now,
      );

      if (activity.lastActivityAt) {
        await db.doc(`organizations/${docSnap.id}`).set(
          {
            'stats.lastAssessmentDate': admin.firestore.Timestamp.fromDate(activity.lastActivityAt),
            'stats.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      studios += 1;
      if (isPayingStatus(payStatus)) {
        payingStudios += 1;
        monthlyRevenueGbpPence += revenue;
      }
      if (joinedAt.getTime() >= weekStartMs) newStudios += 1;
      const firstMs = firstAssessmentAt?.getTime();
      if (firstMs != null && firstMs >= weekStartMs) firstAssessments += 1;
      assessmentsCompleted += weekCount;
      lastWeekCompleted += activity.assessmentsLastWeek;
      if (
        firstMs != null &&
        firstMs >= weekStartMs - 7 * 24 * 60 * 60 * 1000 &&
        firstMs < weekStartMs
      ) {
        lastWeekFirstAssessments += 1;
      }
      if (
        joinedAt.getTime() >= weekStartMs - 7 * 24 * 60 * 60 * 1000 &&
        joinedAt.getTime() < weekStartMs
      ) {
        lastWeekNewStudios += 1;
      }
    }

    last = batchSnap.docs[batchSnap.docs.length - 1];
    if (batchSnap.size < OWNER_CONSOLE.REBUILD_PAGE_SIZE) break;
  }

  await pulseRef().set({
    weekStartsAt: admin.firestore.Timestamp.fromDate(startOfIsoWeekUtc(now)),
    thisWeek: {
      newStudios,
      firstAssessments,
      assessmentsCompleted,
    },
    lastWeek: {
      newStudios: lastWeekNewStudios,
      firstAssessments: lastWeekFirstAssessments,
      assessmentsCompleted: lastWeekCompleted,
    },
    payingStudios,
    monthlyRevenueGbpPence,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info('[ownerConsole] rebuilt', { studios, payingStudios });
  return { studios };
}
