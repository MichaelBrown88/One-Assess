import { describe, expect, it } from 'vitest';
import {
  billingFormattedPrice,
  billingPlanHeadline,
  billingPlanLead,
  billingPrimaryCta,
  canManageCheckout,
  normalizeBillingStatus,
} from '@/lib/billing/billingOverviewCopy';
import { parseOrgBilling } from '@/lib/billing/parseOrgBilling';
import { capacityUtilisationRatio, capacityUtilisationTone } from '@/lib/billing/capacityUtilisation';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

describe('normalizeBillingStatus', () => {
  it('maps Stripe canceled spelling to cancelled', () => {
    expect(normalizeBillingStatus('canceled')).toBe('cancelled');
  });

  it('maps trialing to trial', () => {
    expect(normalizeBillingStatus('trialing')).toBe('trial');
  });
});

describe('canManageCheckout', () => {
  it('blocks internal orgs even when Stripe is on', () => {
    expect(
      canManageCheckout({ isInternal: true, stripeEnabled: true, orgType: 'gym' }),
    ).toBe(false);
  });

  it('allows gym and solo coach orgs when Stripe is on', () => {
    expect(
      canManageCheckout({ isInternal: false, stripeEnabled: true, orgType: 'gym' }),
    ).toBe(true);
    expect(
      canManageCheckout({ isInternal: false, stripeEnabled: true, orgType: 'solo_coach' }),
    ).toBe(true);
  });
});

describe('billingPlanHeadline', () => {
  it('uses Free for internal orgs', () => {
    expect(
      billingPlanHeadline({ isInternal: true, subscriptionPlanHeadline: 'Studio 50' }),
    ).toBe(ORG_BILLING_COPY.internalPlanName);
  });
});

describe('billingPlanLead', () => {
  it('explains internal free billing', () => {
    expect(
      billingPlanLead({
        isInternal: true,
        status: 'cancelled',
        activeClients: 12,
        clientCap: 50,
        priceFormatted: '£99',
      }),
    ).toBe(ORG_BILLING_COPY.internalPlanLead);
  });

  it('does not invent a next-invoice calendar for trials', () => {
    const lead = billingPlanLead({
      isInternal: false,
      status: 'trial',
      activeClients: 3,
      clientCap: 10,
      priceFormatted: '£49',
    });
    expect(lead).toBe(ORG_BILLING_COPY.trialLead(3, 10));
    expect(lead.toLowerCase()).not.toContain('soon');
    expect(lead.toLowerCase()).not.toContain('today');
  });
});

describe('billingFormattedPrice', () => {
  it('shows £0 for internal orgs even when leftover Stripe amount exists', () => {
    expect(
      billingFormattedPrice({
        isInternal: true,
        monthlyAmount: 99,
        formattedPaid: '£99.00',
      }),
    ).toBe(ORG_BILLING_COPY.internalPrice);
  });

  it('uses an em dash when a paying org has no amount yet', () => {
    expect(
      billingFormattedPrice({
        isInternal: false,
        monthlyAmount: 0,
        formattedPaid: '£0.00',
      }),
    ).toBe(ORG_BILLING_COPY.priceNone);
  });
});

describe('billingPrimaryCta', () => {
  it('hides checkout CTAs for internal orgs', () => {
    expect(
      billingPrimaryCta({ isInternal: true, status: 'trial', canShowChangePlan: true }),
    ).toBeNull();
  });

  it('sends past_due to the payment portal', () => {
    expect(
      billingPrimaryCta({ isInternal: false, status: 'past_due', canShowChangePlan: true }),
    ).toBe('update_payment');
  });
});

describe('parseOrgBilling', () => {
  it('marks internal orgs and ignores leftover Stripe status for the snapshot flag', () => {
    const parsed = parseOrgBilling({
      name: 'One Fitness',
      type: 'gym',
      metadata: { isInternal: true },
      subscription: { status: 'cancelled', plan: 'starter', clientCap: 50 },
      stripe: { stripeCustomerId: 'cus_test' },
      stats: { clientCount: 8 },
    });
    expect(parsed.isInternal).toBe(true);
    expect(parsed.stripeCustomerId).toBe('cus_test');
    expect(parsed.statsClientCount).toBe(8);
    expect(parsed.orgType).toBe('gym');
    expect(parsed.packageTrack).toBe('gym');
  });

  it('prefers root org type over subscription type', () => {
    const parsed = parseOrgBilling({
      type: 'gym',
      subscription: { type: 'solo_coach', packageTrack: 'solo' },
    });
    expect(parsed.orgType).toBe('gym');
    expect(parsed.packageTrack).toBe('solo');
  });
});

describe('capacityUtilisationTone', () => {
  it('warns near the cap and marks full at the limit', () => {
    expect(capacityUtilisationTone(capacityUtilisationRatio(8, 10))).toBe('warn');
    expect(capacityUtilisationTone(capacityUtilisationRatio(10, 10))).toBe('full');
    expect(capacityUtilisationTone(capacityUtilisationRatio(2, 10))).toBe('ok');
  });
});
