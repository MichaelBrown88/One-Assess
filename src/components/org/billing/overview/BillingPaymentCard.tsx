import { Button } from '@/components/ui/button';
import { BillingSectionCard } from '@/components/org/billing/overview/BillingSectionCard';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { STRIPE_CONFIG } from '@/constants/platform';

interface BillingPaymentCardProps {
  hasStripeCustomer: boolean;
  userEmail: string | undefined;
  portalLoading: boolean;
  onManagePayment: () => void;
}

export function BillingPaymentCard({
  hasStripeCustomer,
  userEmail,
  portalLoading,
  onManagePayment,
}: BillingPaymentCardProps) {
  const stripeReady = STRIPE_CONFIG.isEnabled;
  const body = !stripeReady
    ? ORG_BILLING_COPY.stripeDisabledHint
    : hasStripeCustomer
      ? ORG_BILLING_COPY.paymentManagedViaStripe
      : ORG_BILLING_COPY.noPaymentOnFile;

  return (
    <BillingSectionCard
      title={ORG_BILLING_COPY.paymentSectionTitle}
      action={
        stripeReady && hasStripeCustomer ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={onManagePayment}
            disabled={portalLoading}
          >
            {portalLoading ? ORG_BILLING_COPY.billingPagePortalCtaLoading : ORG_BILLING_COPY.portalCtaOpen}
          </Button>
        ) : null
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        {userEmail ? (
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">{ORG_BILLING_COPY.contactSectionTitle}: </span>
            {userEmail}
          </p>
        ) : null}
      </div>
    </BillingSectionCard>
  );
}
