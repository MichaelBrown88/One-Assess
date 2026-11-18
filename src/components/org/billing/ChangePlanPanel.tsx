import { useReducer, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChangePlanNonGb } from '@/components/org/billing/ChangePlanNonGb';
import { ChangePlanLeversCard } from '@/components/org/billing/ChangePlanLeversCard';
import { ChangePlanStatusBanners } from '@/components/org/billing/ChangePlanStatusBanners';
import { ChangePlanDowngradeDialog } from '@/components/org/billing/ChangePlanDowngradeDialog';
import { PlanChangeSummary } from '@/components/org/billing/PlanChangeSummary';
import { useChangePlanConfirm } from '@/hooks/useChangePlanConfirm';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { getActivePaidTiersForTrack, getPaidTierById } from '@/constants/pricing';
import type { Region, PackageTrack, BillingPeriod } from '@/constants/pricing';
import { formatPrice } from '@/lib/utils/currency';
import { getCustomBrandingPrice } from '@/lib/pricing/config';
import { annualSavingsPct, resolveInitialTierId } from '@/lib/billing/changePlanDraft';
import { draftReducer, draftEquals } from '@/types/billingLevers';
import type { DraftSubscription, CurrentSubscription } from '@/types/billingLevers';

export interface ChangePlanPanelProps {
  organizationId: string;
  region: Region;
  subscriptionStatus: string;
  stripeSubscriptionId?: string;
  currentTrack: PackageTrack;
  currentClientLimit: number;
  currentTierId?: string;
  statsClientCount: number;
  offerBrandingAddOn: boolean;
  onBack: () => void;
  onSubscriptionUpdated: () => void;
  onManagePayment: () => Promise<void>;
}

export function ChangePlanPanel({
  organizationId,
  region,
  subscriptionStatus,
  stripeSubscriptionId,
  currentTrack,
  currentClientLimit,
  currentTierId,
  statsClientCount,
  offerBrandingAddOn,
  onBack,
  onSubscriptionUpdated,
  onManagePayment,
}: ChangePlanPanelProps) {
  const checkoutLocked =
    subscriptionStatus === 'active' && Boolean(stripeSubscriptionId?.trim());
  const resolvedTierId = resolveInitialTierId(currentTierId, currentTrack, currentClientLimit);
  const initialDraft: DraftSubscription = {
    track: currentTrack,
    tierId: resolvedTierId,
    period: 'monthly' as BillingPeriod,
    branding: false,
  };
  const currentSub: CurrentSubscription = {
    track: currentTrack,
    tierId: resolvedTierId,
    period: 'monthly' as BillingPeriod,
    customBrandingEnabled: !offerBrandingAddOn,
  };
  const [draft, dispatch] = useReducer(draftReducer, initialDraft);
  const hasChanges = !draftEquals(draft, initialDraft);
  const isCrossTrack = draft.track !== currentTrack;
  const draftTiers = useMemo(
    () => getActivePaidTiersForTrack(draft.track).sort((a, b) => a.clientLimit - b.clientLimit),
    [draft.track],
  );
  const currentTierObj = useMemo(
    () => getPaidTierById(resolvedTierId) ?? getActivePaidTiersForTrack(currentTrack)[0],
    [resolvedTierId, currentTrack],
  );
  const draftTierObj = useMemo(
    () => draftTiers.find((t) => t.id === draft.tierId) ?? draftTiers[0],
    [draftTiers, draft.tierId],
  );
  const confirm = useChangePlanConfirm({
    organizationId,
    region,
    checkoutLocked,
    isCrossTrack,
    statsClientCount,
    draft,
    draftTier: draftTierObj ?? draftTiers[0],
    offerBrandingAddOn,
    onSubscriptionUpdated,
    onBack,
  });

  if (region !== 'GB') {
    return <ChangePlanNonGb checkoutLocked={checkoutLocked} onBack={onBack} />;
  }
  if (!currentTierObj || !draftTierObj) return null;

  return (
    <div className="space-y-5 pb-16">
      <div>
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2 mb-2">
          <ArrowLeft className="h-4 w-4" />
          {CHECKOUT_FLOW_COPY.changePlanBackToOverview}
        </Button>
        <p className="text-sm text-muted-foreground">{CHECKOUT_FLOW_COPY.changePlanLead}</p>
      </div>
      <ChangePlanStatusBanners subscriptionStatus={subscriptionStatus} onManagePayment={onManagePayment} />
      <ChangePlanLeversCard
        draft={draft}
        currentTrack={currentTrack}
        draftTiers={draftTiers}
        resolvedTierId={resolvedTierId}
        isCrossTrack={isCrossTrack}
        isLoading={confirm.isLoading}
        hasChanges={hasChanges}
        savingsPct={annualSavingsPct(draftTierObj.monthlyPriceGbp, draftTierObj.annualPriceGbp)}
        brandingPriceFormatted={formatPrice(getCustomBrandingPrice(region), 'GBP', 'en-GB')}
        offerBrandingAddOn={offerBrandingAddOn}
        onTrack={(t) => dispatch({ type: 'SET_TRACK', track: t })}
        onTier={(id) => dispatch({ type: 'SET_TIER', tierId: id })}
        onPeriod={(p) => dispatch({ type: 'SET_PERIOD', period: p })}
        onBranding={(v) => dispatch({ type: 'SET_BRANDING', branding: v })}
      />
      <PlanChangeSummary
        current={currentSub}
        draft={draft}
        currentTier={currentTierObj}
        draftTier={draftTierObj}
        hasChanges={hasChanges}
        isCrossTrack={isCrossTrack}
        subscriptionStatus={subscriptionStatus}
        loading={confirm.isLoading}
        error={confirm.error}
        onConfirm={confirm.handleConfirm}
        onReset={() => dispatch({ type: 'RESET', initial: initialDraft })}
      />
      <ChangePlanDowngradeDialog
        open={confirm.showDowngradeDialog}
        onOpenChange={confirm.setShowDowngradeDialog}
        clientCount={statsClientCount}
        clientLimit={draftTierObj.clientLimit}
      />
    </div>
  );
}
