import { Button } from '@/components/ui/button';
import { PlanBadge } from '@/components/org/billing/PlanBadge';
import { BillingSectionCard } from '@/components/org/billing/overview/BillingSectionCard';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import {
  billingPlanHeadline,
  billingPlanLead,
  billingPrimaryCta,
  billingPrimaryCtaLabel,
  normalizeBillingStatus,
  type BillingPrimaryCta,
} from '@/lib/billing/billingOverviewCopy';

interface BillingPlanCardProps {
  isInternal: boolean;
  subscriptionPlanHeadline: string;
  subscriptionStatus: string;
  activeClients: number;
  clientCap: number;
  priceFormatted: string;
  canShowChangePlan: boolean;
  trialEndsAt: Date | null;
  onCta: (cta: BillingPrimaryCta) => void;
}

export function BillingPlanCard({
  isInternal,
  subscriptionPlanHeadline,
  subscriptionStatus,
  activeClients,
  clientCap,
  priceFormatted,
  canShowChangePlan,
  trialEndsAt,
  onCta,
}: BillingPlanCardProps) {
  const headline = billingPlanHeadline({ isInternal, subscriptionPlanHeadline });
  const lead = billingPlanLead({
    isInternal,
    status: subscriptionStatus,
    activeClients,
    clientCap,
    priceFormatted,
  });
  const cta = billingPrimaryCta({ isInternal, status: subscriptionStatus, canShowChangePlan });
  const priceLine = isInternal
    ? ORG_BILLING_COPY.pricePerMonth(ORG_BILLING_COPY.internalPrice)
    : priceFormatted === ORG_BILLING_COPY.priceNone
      ? ORG_BILLING_COPY.priceNone
      : ORG_BILLING_COPY.pricePerMonth(priceFormatted);
  const trialEndLine =
    !isInternal && normalizeBillingStatus(subscriptionStatus) === 'trial' && trialEndsAt
      ? ORG_BILLING_COPY.trialEndsOn(
          trialEndsAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        )
      : null;

  return (
    <BillingSectionCard
      title={ORG_BILLING_COPY.planSectionTitle}
      action={<PlanBadge status={isInternal ? 'active' : subscriptionStatus} />}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-xl font-semibold tracking-tight text-foreground">{headline}</p>
          <p className="text-sm tabular-nums text-muted-foreground">{priceLine}</p>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{lead}</p>
          {trialEndLine ? <p className="text-sm text-muted-foreground">{trialEndLine}</p> : null}
        </div>
        {cta ? (
          <Button type="button" className="rounded-lg shrink-0" onClick={() => onCta(cta)}>
            {billingPrimaryCtaLabel(cta)}
          </Button>
        ) : null}
      </div>
    </BillingSectionCard>
  );
}
