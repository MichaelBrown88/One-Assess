import { describe, expect, it } from 'vitest';
import { getActivePaidTiersForTrack } from '@/constants/pricing';
import { annualSavingsPct, resolveInitialTierId } from '@/lib/billing/changePlanDraft';

describe('resolveInitialTierId', () => {
  it('keeps a valid paid tier id', () => {
    const tiers = getActivePaidTiersForTrack('gym');
    const id = tiers[0]?.id;
    expect(id).toBeTruthy();
    if (!id) return;
    expect(resolveInitialTierId(id, 'gym', 1)).toBe(id);
  });

  it('picks the smallest tier that covers current clients', () => {
    const tiers = [...getActivePaidTiersForTrack('solo')].sort((a, b) => a.clientLimit - b.clientLimit);
    const mid = tiers[Math.min(1, tiers.length - 1)];
    expect(mid).toBeTruthy();
    if (!mid) return;
    expect(resolveInitialTierId(undefined, 'solo', mid.clientLimit)).toBe(mid.id);
  });
});

describe('annualSavingsPct', () => {
  it('returns the percent saved versus twelve monthly payments', () => {
    expect(annualSavingsPct(10, 96)).toBe(20);
  });

  it('returns 0 when monthly price is 0', () => {
    expect(annualSavingsPct(0, 0)).toBe(0);
  });
});
