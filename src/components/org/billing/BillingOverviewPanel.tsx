import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BillingPlanCard } from '@/components/org/billing/overview/BillingPlanCard';
import { BillingUsageCard } from '@/components/org/billing/overview/BillingUsageCard';
import { BillingPaymentCard } from '@/components/org/billing/overview/BillingPaymentCard';
import { BillingInvoicesCard } from '@/components/org/billing/overview/BillingInvoicesCard';
import { BillingCancelRow } from '@/components/org/billing/overview/BillingCancelRow';
import { useInvoices } from '@/hooks/useInvoices';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { formatPrice } from '@/lib/utils/currency';
import { billingFormattedPrice, normalizeBillingStatus, type BillingPrimaryCta } from '@/lib/billing/billingOverviewCopy';
import type { OrgBillingData } from '@/types/orgBilling';

export interface BillingOverviewPanelProps {
  orgData: OrgBillingData;
  organizationId: string;
  subscriptionPlanHeadline: string;
  subscriptionStatus: string;
  monthlyAmount: number;
  currency: string;
  locale: string;
  clientCapForDisplay: number;
  hasStripeCustomer: boolean;
  userEmail: string | undefined;
  portalLoading: boolean;
  canShowChangePlan: boolean;
  onChangePlan: () => void;
  onManagePayment: () => void;
  onCancelSubscription: () => void;
}

export function BillingOverviewPanel({
  orgData,
  organizationId,
  subscriptionPlanHeadline,
  subscriptionStatus,
  monthlyAmount,
  currency,
  locale,
  clientCapForDisplay,
  hasStripeCustomer,
  userEmail,
  portalLoading,
  canShowChangePlan,
  onChangePlan,
  onManagePayment,
  onCancelSubscription,
}: BillingOverviewPanelProps) {
  const priceFormatted = billingFormattedPrice({
    isInternal: orgData.isInternal,
    monthlyAmount,
    formattedPaid: formatPrice(monthlyAmount, currency, locale),
  });
  const status = normalizeBillingStatus(subscriptionStatus);
  const { invoices, loading: invoicesLoading } = useInvoices(
    !orgData.isInternal && hasStripeCustomer ? organizationId : null,
    5,
  );

  const handleCta = (cta: BillingPrimaryCta) => {
    if (cta === 'update_payment') {
      onManagePayment();
      return;
    }
    onChangePlan();
  };

  const showCancel = !orgData.isInternal && hasStripeCustomer && status === 'active';

  return (
    <div className="space-y-5 pb-16">
      {!orgData.isInternal && status === 'past_due' ? (
        <div className="flex flex-col gap-3 rounded-lg border border-score-red-muted bg-score-red-light/50 dark:bg-score-red-muted/10 p-4 sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-score-red-bold" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{ORG_BILLING_COPY.pastDueBannerTitle}</p>
            <p className="text-xs text-muted-foreground">{ORG_BILLING_COPY.pastDueBannerBody}</p>
          </div>
          <Button type="button" variant="destructive" size="sm" className="rounded-lg shrink-0" onClick={onManagePayment}>
            {ORG_BILLING_COPY.portalCtaOpen}
          </Button>
        </div>
      ) : null}

      <BillingPlanCard
        isInternal={orgData.isInternal}
        subscriptionPlanHeadline={subscriptionPlanHeadline}
        subscriptionStatus={subscriptionStatus}
        activeClients={orgData.statsClientCount}
        clientCap={clientCapForDisplay}
        priceFormatted={priceFormatted}
        canShowChangePlan={canShowChangePlan}
        trialEndsAt={orgData.trialEndsAt}
        onCta={handleCta}
      />
      <BillingUsageCard
        activeClients={orgData.statsClientCount}
        clientCap={clientCapForDisplay}
        coachCount={orgData.coachCount}
        isInternal={orgData.isInternal}
      />
      {orgData.isInternal ? null : (
        <>
          <BillingPaymentCard
            hasStripeCustomer={hasStripeCustomer}
            userEmail={userEmail}
            portalLoading={portalLoading}
            onManagePayment={onManagePayment}
          />
          <BillingInvoicesCard
            invoices={invoices}
            loading={invoicesLoading}
            hasStripeCustomer={hasStripeCustomer}
            portalLoading={portalLoading}
            onManagePayment={onManagePayment}
          />
        </>
      )}
      {showCancel ? <BillingCancelRow onCancelSubscription={onCancelSubscription} /> : null}
    </div>
  );
}
