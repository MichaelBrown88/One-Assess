import type { OwnerBuyerType, OwnerNeedsYouReason, OwnerPayStatus, OwnerWeekCounts } from '@shared/ownerConsole';

export interface StudioSnapshot {
  orgId: string;
  name: string;
  ownerEmail: string;
  joinedAt: Date;
  payStatus: OwnerPayStatus;
  buyerType: OwnerBuyerType;
  trialEndsAt: Date | null;
  seatCount: number;
  assessmentCount: number;
  firstAssessmentAt: Date | null;
  lastActivityAt: Date | null;
  assessmentsThisWeek: number;
  assessmentWeekStartMs: number | null;
  monthlyRevenueGbpPence: number;
  needsYou: boolean;
  needsYouReason: OwnerNeedsYouReason | null;
}

export interface OwnerPulse {
  weekStartsAt: Date | null;
  thisWeek: OwnerWeekCounts;
  lastWeek: OwnerWeekCounts;
  payingStudios: number;
  monthlyRevenueGbpPence: number;
}
