import type { PackageTrack, Region } from '@/constants/pricing';

export interface OrgBillingSubscription {
  plan: string;
  status: string;
  clientSeats: number;
  clientCount?: number;
  clientCap?: number;
  monthlyAiCredits?: number;
  capacityTierId?: string;
  region?: Region;
  currency?: string;
  amountCents?: number;
  amountFils?: number;
}

export interface OrgBillingData {
  name: string;
  subscription: OrgBillingSubscription;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  orgType: string;
  packageTrack: PackageTrack;
  coachCount: number;
  statsClientCount: number;
  assessmentCredits?: number;
  customBrandingEnabled?: boolean;
  isInternal: boolean;
  trialEndsAt: Date | null;
}
