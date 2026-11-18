import {
  getActivePaidTiersForTrack,
  isPaidCapacityTierId,
} from '@/constants/pricing';
import type { PackageTrack, PaidCapacityTierId } from '@/constants/pricing';

export function resolveInitialTierId(
  currentTierId: string | undefined,
  track: PackageTrack,
  clientLimit: number,
): PaidCapacityTierId {
  if (currentTierId && isPaidCapacityTierId(currentTierId)) {
    return currentTierId;
  }
  const tiers = getActivePaidTiersForTrack(track);
  const sorted = [...tiers].sort((a, b) => a.clientLimit - b.clientLimit);
  const match = sorted.find((t) => t.clientLimit >= clientLimit);
  return (match ?? sorted[sorted.length - 1] ?? sorted[0]).id;
}

export function annualSavingsPct(monthlyPrice: number, annualPrice: number): number {
  const full = monthlyPrice * 12;
  if (full <= 0) return 0;
  return Math.max(0, Math.round(((full - annualPrice) / full) * 100));
}
