/**
 * Owner-console counting rules. Pure — no Firestore, no AI, no UI.
 * A studio counts when a coach completes a full baseline assessment.
 */

export const OWNER_CONSOLE = {
  SILENT_AFTER_MS: 14 * 24 * 60 * 60 * 1000,
  TRIAL_ENDING_WITHIN_MS: 3 * 24 * 60 * 60 * 1000,
  STUDIO_LIST_LIMIT: 50,
  NEEDS_YOU_LIMIT: 20,
  REBUILD_PAGE_SIZE: 100,
  REBUILD_MAX_PAGES: 20,
} as const;

export const OWNER_CONSOLE_PATHS = {
  snapshots: 'studio-snapshots',
  pulse: 'platform-stats/owner-pulse',
} as const;

export const OWNER_PAY_STATUS = {
  TRIAL: 'trial',
  PAYING: 'paying',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  INTERNAL: 'internal',
} as const;

export type OwnerPayStatus = (typeof OWNER_PAY_STATUS)[keyof typeof OWNER_PAY_STATUS];

export const OWNER_NEEDS_YOU = {
  UNACTIVATED: 'unactivated',
  TRIAL_ENDING: 'trial_ending',
  PAST_DUE: 'past_due',
  SILENT: 'silent',
} as const;

export type OwnerNeedsYouReason = (typeof OWNER_NEEDS_YOU)[keyof typeof OWNER_NEEDS_YOU];

export interface OwnerWeekCounts {
  newStudios: number;
  firstAssessments: number;
  assessmentsCompleted: number;
}

export interface AssessmentActivity {
  assessmentCount: number;
  firstAssessmentAt: Date | null;
  lastActivityAt: Date | null;
  assessmentsThisWeek: number;
  assessmentsLastWeek: number;
}

export interface OwnerNeedsYouInput {
  payStatus: OwnerPayStatus;
  firstAssessmentAtMs: number | null;
  assessmentCount: number;
  lastActivityAtMs: number | null;
  trialEndsAtMs: number | null;
}

export function emptyWeekCounts(): OwnerWeekCounts {
  return { newStudios: 0, firstAssessments: 0, assessmentsCompleted: 0 };
}

export function emptyAssessmentActivity(): AssessmentActivity {
  return {
    assessmentCount: 0,
    firstAssessmentAt: null,
    lastActivityAt: null,
    assessmentsThisWeek: 0,
    assessmentsLastWeek: 0,
  };
}

export function laterDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

export function earlierDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

/** Fold one full-baseline timestamp into write-time activity counters. */
export function mergeAssessmentTimestamp(
  acc: AssessmentActivity,
  timestamp: Date,
  now: Date,
): AssessmentActivity {
  const thisWeekStart = startOfIsoWeekUtc(now).getTime();
  const lastWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;
  const t = timestamp.getTime();
  return {
    assessmentCount: acc.assessmentCount + 1,
    firstAssessmentAt: earlierDate(acc.firstAssessmentAt, timestamp),
    lastActivityAt: laterDate(acc.lastActivityAt, timestamp),
    assessmentsThisWeek: acc.assessmentsThisWeek + (t >= thisWeekStart ? 1 : 0),
    assessmentsLastWeek: acc.assessmentsLastWeek + (t >= lastWeekStart && t < thisWeekStart ? 1 : 0),
  };
}

/** Monday 00:00 UTC of the ISO week containing `date`. */
export function startOfIsoWeekUtc(date: Date): Date {
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = dayStart.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  dayStart.setUTCDate(dayStart.getUTCDate() + offset);
  return dayStart;
}

export function shouldRollPulseWeek(storedWeekStart: Date | null, now: Date): boolean {
  const current = startOfIsoWeekUtc(now).getTime();
  if (storedWeekStart == null) return true;
  return storedWeekStart.getTime() < current;
}

export function mapPayStatus(status: unknown): OwnerPayStatus {
  switch (status) {
    case 'active':
    case 'paying':
      return OWNER_PAY_STATUS.PAYING;
    case 'trial':
      return OWNER_PAY_STATUS.TRIAL;
    case 'past_due':
      return OWNER_PAY_STATUS.PAST_DUE;
    case 'cancelled':
      return OWNER_PAY_STATUS.CANCELLED;
    case 'paused':
      return OWNER_PAY_STATUS.PAUSED;
    case 'internal':
    case 'free':
      return OWNER_PAY_STATUS.INTERNAL;
    default:
      return OWNER_PAY_STATUS.TRIAL;
  }
}

export function isInternalStudio(org: { metadata?: Record<string, unknown> }): boolean {
  return org.metadata?.isInternal === true;
}

/** Founder / house studios are free on the platform — leftover Stripe test state is ignored. */
export function resolveStudioPayStatus(params: {
  isInternal?: boolean;
  status?: unknown;
}): OwnerPayStatus {
  if (params.isInternal) return OWNER_PAY_STATUS.INTERNAL;
  return mapPayStatus(params.status);
}

export function isPayingStatus(status: OwnerPayStatus): boolean {
  return status === OWNER_PAY_STATUS.PAYING;
}

export function snapshotRevenuePence(payStatus: OwnerPayStatus, amountGbpPence: number): number {
  if (!isPayingStatus(payStatus)) return 0;
  return Math.max(0, amountGbpPence);
}

export function shouldCountStudio(org: {
  name?: unknown;
  type?: unknown;
  adminEmail?: unknown;
  ownerId?: unknown;
  metadata?: { isTest?: unknown; isSandbox?: unknown; isDeleted?: unknown };
  subscription?: { plan?: unknown; billingEmail?: unknown };
}): boolean {
  if (isEmptyOrgShell(org)) return false;
  if (org.metadata?.isTest === true) return false;
  if (org.metadata?.isSandbox === true) return false;
  if (org.metadata?.isDeleted === true) return false;
  if (org.subscription?.plan === 'sandbox') return false;
  return true;
}

/** Stats-only / abandoned parent docs are not customers. */
export function isEmptyOrgShell(org: {
  name?: unknown;
  type?: unknown;
  adminEmail?: unknown;
  ownerId?: unknown;
  subscription?: { plan?: unknown; billingEmail?: unknown };
}): boolean {
  const name = typeof org.name === 'string' ? org.name.trim() : '';
  if (name.length > 0) return false;
  const type = typeof org.type === 'string' ? org.type.trim() : '';
  if (type.length > 0) return false;
  const email = typeof org.adminEmail === 'string' ? org.adminEmail.trim() : '';
  if (email.length > 0) return false;
  const owner = typeof org.ownerId === 'string' ? org.ownerId.trim() : '';
  if (owner.length > 0) return false;
  const plan = typeof org.subscription?.plan === 'string' ? org.subscription.plan.trim() : '';
  if (plan.length > 0) return false;
  const billing =
    typeof org.subscription?.billingEmail === 'string' ? org.subscription.billingEmail.trim() : '';
  return billing.length === 0;
}

export const OWNER_BUYER_TYPE = {
  COACH: 'coach',
  GYM: 'gym',
} as const;

export type OwnerBuyerType = (typeof OWNER_BUYER_TYPE)[keyof typeof OWNER_BUYER_TYPE];

/** Solo coaches buy for their own clients; gyms buy for staff to use with members. */
export function mapBuyerType(type: unknown): OwnerBuyerType {
  if (type === 'gym' || type === 'gym_chain') return OWNER_BUYER_TYPE.GYM;
  return OWNER_BUYER_TYPE.COACH;
}

export function isIncompleteSetup(name: string, firstAssessmentAtMs: number | null): boolean {
  return name.trim().length === 0 && firstAssessmentAtMs == null;
}

/** Incomplete signups stay in the directory; they are not a call list. */
export function shouldSurfaceNeedsYou(
  reason: OwnerNeedsYouReason | null,
  name: string,
  firstAssessmentAtMs: number | null,
): boolean {
  if (reason == null) return false;
  if (reason === OWNER_NEEDS_YOU.UNACTIVATED && isIncompleteSetup(name, firstAssessmentAtMs)) {
    return false;
  }
  return true;
}

export function isFullBaselineAssessment(session: {
  assessmentType?: unknown;
  type?: unknown;
}): boolean {
  if (session.assessmentType === 'full') return true;
  return session.type === 'full' || session.type === 'full-assessment';
}

/**
 * One reason per studio. Payment risk first, then trial ending, then never assessed, then quiet after a single assessment.
 */
export function resolveNeedsYou(input: OwnerNeedsYouInput, nowMs: number): OwnerNeedsYouReason | null {
  if (input.payStatus === OWNER_PAY_STATUS.CANCELLED) return null;

  if (input.payStatus === OWNER_PAY_STATUS.INTERNAL) {
    return input.firstAssessmentAtMs == null ? OWNER_NEEDS_YOU.UNACTIVATED : null;
  }

  if (input.payStatus === OWNER_PAY_STATUS.PAST_DUE) {
    return OWNER_NEEDS_YOU.PAST_DUE;
  }

  if (
    input.payStatus === OWNER_PAY_STATUS.TRIAL &&
    input.trialEndsAtMs != null &&
    input.trialEndsAtMs >= nowMs &&
    input.trialEndsAtMs - nowMs <= OWNER_CONSOLE.TRIAL_ENDING_WITHIN_MS
  ) {
    return OWNER_NEEDS_YOU.TRIAL_ENDING;
  }

  if (input.firstAssessmentAtMs == null) {
    return OWNER_NEEDS_YOU.UNACTIVATED;
  }

  if (
    input.assessmentCount === 1 &&
    input.lastActivityAtMs != null &&
    nowMs - input.lastActivityAtMs >= OWNER_CONSOLE.SILENT_AFTER_MS
  ) {
    return OWNER_NEEDS_YOU.SILENT;
  }

  return null;
}

export function effectiveAssessmentsThisWeek(
  assessmentsThisWeek: number,
  assessmentWeekStartMs: number | null,
  now: Date,
): number {
  if (assessmentWeekStartMs == null) return 0;
  if (assessmentWeekStartMs !== startOfIsoWeekUtc(now).getTime()) return 0;
  return Math.max(0, assessmentsThisWeek);
}

export function nextAssessmentsThisWeek(
  previousCount: number,
  previousWeekStartMs: number | null,
  now: Date,
): { assessmentsThisWeek: number; assessmentWeekStartMs: number } {
  const weekStartMs = startOfIsoWeekUtc(now).getTime();
  if (previousWeekStartMs === weekStartMs) {
    return { assessmentsThisWeek: previousCount + 1, assessmentWeekStartMs: weekStartMs };
  }
  return { assessmentsThisWeek: 1, assessmentWeekStartMs: weekStartMs };
}
