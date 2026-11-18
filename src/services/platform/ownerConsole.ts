import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFirebaseFunctions } from '@/services/firebase';
import { COLLECTIONS } from '@/constants/collections';
import { SYSTEM_STATS } from '@/lib/database/paths';
import {
  emptyWeekCounts,
  effectiveAssessmentsThisWeek,
  mapBuyerType,
  mapPayStatus,
  OWNER_CONSOLE,
  type OwnerNeedsYouReason,
  type OwnerWeekCounts,
} from '@shared/ownerConsole';
import type { OwnerPulse, StudioSnapshot } from '@/types/ownerConsole';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      const date = maybe.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }
  return null;
}

function numberField(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asWeekCounts(value: unknown): OwnerWeekCounts {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    newStudios: numberField(record.newStudios),
    firstAssessments: numberField(record.firstAssessments),
    assessmentsCompleted: numberField(record.assessmentsCompleted),
  };
}

function parseSnapshot(orgId: string, data: Record<string, unknown>, now: Date): StudioSnapshot {
  const weekStartMs =
    typeof data.assessmentWeekStartMs === 'number' ? data.assessmentWeekStartMs : null;
  const reason = data.needsYouReason;
  const needsYouReason: OwnerNeedsYouReason | null =
    reason === 'unactivated' || reason === 'trial_ending' || reason === 'past_due' || reason === 'silent'
      ? reason
      : null;

  return {
    orgId,
    name: typeof data.name === 'string' ? data.name : '',
    ownerEmail: typeof data.ownerEmail === 'string' ? data.ownerEmail : '',
    joinedAt: toDate(data.joinedAt) ?? now,
    payStatus: mapPayStatus(data.payStatus),
    buyerType: mapBuyerType(data.buyerType),
    trialEndsAt: toDate(data.trialEndsAt),
    seatCount: numberField(data.seatCount),
    assessmentCount: numberField(data.assessmentCount),
    firstAssessmentAt: toDate(data.firstAssessmentAt),
    lastActivityAt: toDate(data.lastActivityAt),
    assessmentsThisWeek: effectiveAssessmentsThisWeek(
      numberField(data.assessmentsThisWeek),
      weekStartMs,
      now,
    ),
    assessmentWeekStartMs: weekStartMs,
    monthlyRevenueGbpPence: numberField(data.monthlyRevenueGbpPence),
    needsYou: data.needsYou === true,
    needsYouReason,
  };
}

function emptyPulse(): OwnerPulse {
  return {
    weekStartsAt: null,
    thisWeek: emptyWeekCounts(),
    lastWeek: emptyWeekCounts(),
    payingStudios: 0,
    monthlyRevenueGbpPence: 0,
  };
}

export async function getOwnerPulse(): Promise<{ pulse: OwnerPulse; exists: boolean }> {
  const snap = await getDoc(doc(getDb(), SYSTEM_STATS.ownerPulse()));
  if (!snap.exists()) {
    return { pulse: emptyPulse(), exists: false };
  }
  const data = snap.data();
  return {
    exists: true,
    pulse: {
      weekStartsAt: toDate(data.weekStartsAt),
      thisWeek: asWeekCounts(data.thisWeek),
      lastWeek: asWeekCounts(data.lastWeek),
      payingStudios: numberField(data.payingStudios),
      monthlyRevenueGbpPence: numberField(data.monthlyRevenueGbpPence),
    },
  };
}

export async function listStudioSnapshots(now: Date = new Date()): Promise<StudioSnapshot[]> {
  const q = query(
    collection(getDb(), COLLECTIONS.STUDIO_SNAPSHOTS),
    orderBy('joinedAt', 'desc'),
    limit(OWNER_CONSOLE.STUDIO_LIST_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((item) => parseSnapshot(item.id, item.data(), now));
}

export async function listStudiosNeedingYou(now: Date = new Date()): Promise<StudioSnapshot[]> {
  const q = query(
    collection(getDb(), COLLECTIONS.STUDIO_SNAPSHOTS),
    where('needsYou', '==', true),
    orderBy('needsYouAt', 'desc'),
    limit(OWNER_CONSOLE.NEEDS_YOU_LIMIT),
  );
  const snap = await getDocs(q);
  return snap.docs.map((item) => parseSnapshot(item.id, item.data(), now));
}

export async function getStudioSnapshot(
  orgId: string,
  now: Date = new Date(),
): Promise<StudioSnapshot | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.STUDIO_SNAPSHOTS, orgId));
  if (!snap.exists()) return null;
  return parseSnapshot(snap.id, snap.data(), now);
}

export async function rebuildOwnerConsole(): Promise<void> {
  const fn = httpsCallable(getFirebaseFunctions(), 'rebuildOwnerConsole');
  await fn();
}
