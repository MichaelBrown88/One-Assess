import { DEFAULT_REGION, REGION_TO_CURRENCY, type PackageTrack, type Region } from '@/constants/pricing';
import { resolveSubscriptionClientLimit } from '@/lib/pricing/resolveSubscriptionClientLimit';
import type { OrgBillingData } from '@/types/orgBilling';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    // Firestore org documents are plain field maps.
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value !== null && typeof value === 'object' && 'toDate' in value) {
    const maybe = (value as { toDate: unknown }).toDate;
    if (typeof maybe === 'function') {
      try {
        const d = maybe.call(value);
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function resolveOrgType(data: Record<string, unknown>, sub: Record<string, unknown>): string {
  const fromRoot = readString(data.type);
  if (fromRoot) return fromRoot;
  const subType = readString(sub.type);
  if (subType === 'gym_chain' || subType === 'gym' || subType === 'solo_coach') return subType;
  return 'solo_coach';
}

function resolvePackageTrack(
  sub: Record<string, unknown>,
  orgType: string,
): PackageTrack {
  const explicit = sub.packageTrack;
  if (explicit === 'gym' || explicit === 'solo') return explicit;
  const subType = readString(sub.type);
  if (subType === 'gym' || subType === 'gym_chain') return 'gym';
  if (subType === 'solo' || subType === 'solo_coach') return 'solo';
  if (orgType === 'gym' || orgType === 'gym_chain') return 'gym';
  return 'solo';
}

function resolveRegion(sub: Record<string, unknown>): Region {
  const region = sub.region;
  if (region === 'GB' || region === 'US' || region === 'KW') return region;
  return DEFAULT_REGION;
}

/**
 * Maps an organisation Firestore document to the billing page snapshot.
 */
export function parseOrgBilling(data: Record<string, unknown>): OrgBillingData {
  const sub = asRecord(data.subscription) ?? {};
  const stripe = asRecord(data.stripe) ?? {};
  const counts = asRecord(data._counts);
  const stats = asRecord(data.stats);
  const metadata = asRecord(data.metadata);

  const orgType = resolveOrgType(data, sub);
  const packageTrack = resolvePackageTrack(sub, orgType);
  const region = resolveRegion(sub);
  const currency = readString(sub.currency) ?? REGION_TO_CURRENCY[region];
  const amountCents = readNumber(sub.amountCents) ?? readNumber(sub.amountFils);
  const clientCap = resolveSubscriptionClientLimit({
    capacityTierId: readString(sub.capacityTierId),
    clientCap: readNumber(sub.clientCap),
    clientCount: readNumber(sub.clientCount),
    clientSeats: readNumber(sub.clientSeats),
    plan: readString(sub.plan),
    subscriptionStatus: readString(sub.status),
  });

  const brandingRaw = data.customBrandingEnabled;
  const customBrandingEnabled =
    brandingRaw === true ? true : brandingRaw === false ? false : undefined;

  return {
    name: readString(data.name) ?? '',
    subscription: {
      plan: readString(sub.plan) ?? 'starter',
      status: readString(sub.status) ?? 'trial',
      clientSeats: readNumber(sub.clientSeats) ?? readNumber(sub.clientCount) ?? 0,
      clientCount: readNumber(sub.clientCount) ?? readNumber(sub.clientSeats) ?? 0,
      clientCap,
      monthlyAiCredits: readNumber(sub.monthlyAiCredits),
      capacityTierId: readString(sub.capacityTierId),
      region,
      currency,
      amountCents: amountCents ?? 0,
      amountFils: readNumber(sub.amountFils) ?? 0,
    },
    stripeCustomerId: readString(stripe.stripeCustomerId),
    stripeSubscriptionId: readString(stripe.stripeSubscriptionId),
    orgType,
    packageTrack,
    coachCount: readNumber(counts?.coaches) ?? 1,
    statsClientCount: readNumber(stats?.clientCount) ?? 0,
    assessmentCredits: readNumber(data.assessmentCredits),
    customBrandingEnabled,
    isInternal: metadata?.isInternal === true,
    trialEndsAt: readDate(sub.trialEndsAt),
  };
}
