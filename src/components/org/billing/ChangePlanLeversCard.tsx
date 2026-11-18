import { PackageTrackLever } from '@/components/org/billing/levers/PackageTrackLever';
import { CapacitySlider } from '@/components/org/billing/levers/CapacitySlider';
import { BillingPeriodLever } from '@/components/org/billing/levers/BillingPeriodLever';
import { AddOnLever } from '@/components/org/billing/levers/AddOnLever';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import type { CapacityTier, PaidCapacityTierId, BillingPeriod, PackageTrack } from '@/constants/pricing';
import type { DraftSubscription } from '@/types/billingLevers';

interface ChangePlanLeversCardProps {
  draft: DraftSubscription;
  currentTrack: PackageTrack;
  draftTiers: CapacityTier[];
  resolvedTierId: PaidCapacityTierId;
  isCrossTrack: boolean;
  isLoading: boolean;
  hasChanges: boolean;
  savingsPct: number;
  brandingPriceFormatted: string;
  offerBrandingAddOn: boolean;
  onTrack: (track: PackageTrack) => void;
  onTier: (id: PaidCapacityTierId) => void;
  onPeriod: (period: BillingPeriod) => void;
  onBranding: (branding: boolean) => void;
}

export function ChangePlanLeversCard({
  draft,
  currentTrack,
  draftTiers,
  resolvedTierId,
  isCrossTrack,
  isLoading,
  hasChanges,
  savingsPct,
  brandingPriceFormatted,
  offerBrandingAddOn,
  onTrack,
  onTier,
  onPeriod,
  onBranding,
}: ChangePlanLeversCardProps) {
  const draftTier = draftTiers.find((t) => t.id === draft.tierId) ?? draftTiers[0];
  if (!draftTier) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{CHECKOUT_FLOW_COPY.changePlanLead}</p>
        {hasChanges ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-score-amber-bold shrink-0">
            {CHECKOUT_FLOW_COPY.changePlanUnsaved}
          </span>
        ) : null}
      </div>
      <PackageTrackLever
        track={draft.track}
        currentTrack={currentTrack}
        disabled={isLoading}
        onChange={onTrack}
      />
      <CapacitySlider
        tiers={draftTiers}
        selectedTierId={draft.tierId}
        currentTierId={isCrossTrack ? undefined : resolvedTierId}
        billingPeriod={draft.period}
        disabled={isLoading}
        onChange={onTier}
      />
      <BillingPeriodLever
        period={draft.period}
        savingsPct={savingsPct}
        monthlyPrice={draftTier.monthlyPriceGbp}
        annualPrice={draftTier.annualPriceGbp}
        disabled={isLoading}
        onChange={onPeriod}
      />
      {offerBrandingAddOn ? (
        <AddOnLever
          branding={draft.branding}
          brandingPriceFormatted={brandingPriceFormatted}
          disabled={isLoading}
          onChange={onBranding}
        />
      ) : null}
    </section>
  );
}
