import { studioStatusKey } from '@/constants/ownerConsole';
import type { StudioSnapshot } from '@/types/ownerConsole';
import type { OwnerPayStatus } from '@shared/ownerConsole';
import type { PlatformMetricsHistoryEntry } from '@/types/platform';

export interface OwnerTrendPoint {
  date: string;
  monthlyRevenueGbpPence: number;
  payingStudios: number;
  trialStudios: number;
  totalStudios: number;
  assessments: number;
}

export type OwnerMixKey = OwnerPayStatus | 'setup';

export interface OwnerPayMixRow {
  key: OwnerMixKey;
  count: number;
  pct: number;
}

export function isPopulatedTrendEntry(entry: PlatformMetricsHistoryEntry): boolean {
  return (
    entry.mrrCents > 0 ||
    entry.activeOrgs > 0 ||
    entry.trialOrgs > 0 ||
    entry.totalOrgs > 0 ||
    entry.totalAssessments > 0
  );
}

export function mapMetricsHistoryToTrends(entries: PlatformMetricsHistoryEntry[]): OwnerTrendPoint[] {
  return entries.filter(isPopulatedTrendEntry).map((entry) => ({
    date: entry.date,
    monthlyRevenueGbpPence: Math.max(0, entry.mrrCents),
    payingStudios: Math.max(0, entry.activeOrgs),
    trialStudios: Math.max(0, entry.trialOrgs),
    totalStudios: Math.max(0, entry.totalOrgs),
    assessments: Math.max(0, entry.totalAssessments),
  }));
}

export function formatTrendTick(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return dateKey;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

const MIX_ORDER: OwnerMixKey[] = ['paying', 'internal', 'trial', 'past_due', 'paused', 'cancelled', 'setup'];

export function payMixFromStudios(studios: StudioSnapshot[]): OwnerPayMixRow[] {
  const counts: Record<OwnerMixKey, number> = {
    paying: 0,
    internal: 0,
    trial: 0,
    past_due: 0,
    paused: 0,
    cancelled: 0,
    setup: 0,
  };
  for (const studio of studios) {
    counts[studioStatusKey(studio)] += 1;
  }
  const total = studios.length;
  return MIX_ORDER.filter((key) => counts[key] > 0).map((key) => ({
    key,
    count: counts[key],
    pct: total === 0 ? 0 : Math.round((counts[key] / total) * 100),
  }));
}
