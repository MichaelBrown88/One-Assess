import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

export type BillingOverviewStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'other';

export type BillingPrimaryCta = 'choose' | 'change' | 'update_payment' | 'resubscribe';

const CHECKOUT_ORG_TYPES = new Set(['gym', 'gym_chain', 'solo_coach']);

export function normalizeBillingStatus(status: string): BillingOverviewStatus {
  const key = status.trim().toLowerCase();
  if (key === 'trial' || key === 'trialing') return 'trial';
  if (key === 'active') return 'active';
  if (key === 'past_due') return 'past_due';
  if (key === 'cancelled' || key === 'canceled') return 'cancelled';
  return 'other';
}

export function canManageCheckout(input: {
  isInternal: boolean;
  stripeEnabled: boolean;
  orgType: string;
}): boolean {
  if (input.isInternal || !input.stripeEnabled) return false;
  return CHECKOUT_ORG_TYPES.has(input.orgType);
}

export function billingPlanHeadline(input: {
  isInternal: boolean;
  subscriptionPlanHeadline: string;
}): string {
  if (input.isInternal) return ORG_BILLING_COPY.internalPlanName;
  return input.subscriptionPlanHeadline;
}

export function billingPlanLead(input: {
  isInternal: boolean;
  status: string;
  activeClients: number;
  clientCap: number;
  priceFormatted: string;
}): string {
  if (input.isInternal) return ORG_BILLING_COPY.internalPlanLead;
  const status = normalizeBillingStatus(input.status);
  if (status === 'trial') {
    return ORG_BILLING_COPY.trialLead(input.activeClients, input.clientCap);
  }
  if (status === 'past_due') return ORG_BILLING_COPY.pastDueLead;
  if (status === 'cancelled') return ORG_BILLING_COPY.cancelledLead;
  if (status === 'active') {
    return input.priceFormatted === ORG_BILLING_COPY.priceNone
      ? ORG_BILLING_COPY.activeLeadNoPrice
      : ORG_BILLING_COPY.activeLead(input.priceFormatted);
  }
  return ORG_BILLING_COPY.otherLead;
}

export function billingPrimaryCta(input: {
  isInternal: boolean;
  status: string;
  canShowChangePlan: boolean;
}): BillingPrimaryCta | null {
  if (input.isInternal || !input.canShowChangePlan) return null;
  const status = normalizeBillingStatus(input.status);
  if (status === 'past_due') return 'update_payment';
  if (status === 'cancelled') return 'resubscribe';
  if (status === 'trial' || status === 'other') return 'choose';
  return 'change';
}

export function billingPrimaryCtaLabel(cta: BillingPrimaryCta): string {
  if (cta === 'choose') return CHECKOUT_FLOW_COPY.overviewChoosePlanCta;
  if (cta === 'change') return CHECKOUT_FLOW_COPY.overviewChangePlanCta;
  if (cta === 'update_payment') return CHECKOUT_FLOW_COPY.overviewUpdatePaymentCta;
  return CHECKOUT_FLOW_COPY.overviewResubscribeCta;
}

/** Internal orgs always show £0 — leftover Stripe test amounts must not appear. */
export function billingFormattedPrice(input: {
  isInternal: boolean;
  monthlyAmount: number;
  formattedPaid: string;
}): string {
  if (input.isInternal) return ORG_BILLING_COPY.internalPrice;
  if (input.monthlyAmount <= 0) return ORG_BILLING_COPY.priceNone;
  return input.formattedPaid;
}
