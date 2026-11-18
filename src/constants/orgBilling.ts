/**
 * Organization admin Billing tab — coach-visible copy (i18n-ready).
 */

export const ORG_BILLING_COPY = {
  pageTitle: 'Billing',
  pageTitleChange: 'Change plan',
  breadcrumbStudio: 'Studio settings',
  planSectionTitle: 'Plan',
  usageSectionTitle: 'Usage',
  paymentSectionTitle: 'Payment',
  invoicesSectionTitle: 'Invoices',
  contactSectionTitle: 'Billing contact',
  internalPlanName: 'Free',
  internalPrice: '\u00a30',
  internalPlanLead: 'This organisation is on the internal plan. There is no charge.',
  portalOpenFailedTitle: 'Could not open Stripe',
  portalOpenFailedFallback: 'Could not open the billing portal.',
  trialLead: (active: number, cap: number) =>
    `Trial · ${active} of ${cap} client slots used.`,
  trialEndsOn: (date: string) => `Trial ends ${date}.`,
  activeLead: (price: string) => `${price} per month, billed automatically.`,
  activeLeadNoPrice: 'Your subscription is active. Open the billing portal for invoices and payment details.',
  pastDueLead: 'Your last payment failed. Update your payment method to keep the plan active.',
  cancelledLead: 'Your subscription is cancelled. Resubscribe to restore full access.',
  otherLead: 'Choose a plan to start billing.',
  priceNone: '\u2014',
  pricePerMonth: (price: string) => `${price} / month`,
  clientsUsed: (active: number, cap: number) => `${active} of ${cap} client slots used`,
  internalClientsUsed: (active: number) =>
    `${active} active client${active === 1 ? '' : 's'}`,
  noPaymentOnFile: 'No payment method on file yet. Choose a plan to add one at checkout.',
  paymentManagedViaStripe: 'Card details and billing emails are managed in the billing portal.',
  invoicesEmpty: 'Invoices appear here after your first payment.',
  invoicesViewAll: 'View all in portal',
  invoicesDownload: 'Download invoice',
  cancelPlan: 'Cancel subscription',
  cancelPlanHint: 'Cancel in the billing portal. Client data stays with you.',
  reactivateHint: 'Resubscribe to pick up where you left off.',
  adminOnlyTitle: 'Billing is admin-only',
  adminOnlyBody:
    'Billing is managed by your organisation admin. Ask them to adjust your plan or share an invoice.',
  loadingPlan: 'Loading your plan\u2026',
  goToDashboard: 'Go to dashboard',
  backToDashboard: 'Back to dashboard',
  continueSetup: 'Continue setup',
  retry: 'Retry',
  pastDueBannerTitle: 'Payment failed',
  pastDueBannerBody: 'Update your card now to avoid interruption.',
  stripeDisabledHint: 'Stripe is not configured in this environment. In production, payment management appears here.',

  billingPageIntroShort:
    'Your plan and usage are shown here. Change your client capacity in the packages section below.',

  billingPageYourPlanEyebrow: 'Your plan',
  billingPageAccountStripTitle: 'Billing contact',
  billingPageAccountStripLead:
    'This person receives billing emails. Payment method and invoices are managed through the billing portal.',

  billingPageMissingOrgTitle: "Your account isn't set up yet",
  billingPageMissingOrgBody:
    "It looks like your account setup isn't complete. Go back to onboarding to finish, or contact support if you're stuck.",

  billingPageLoadFailedTitle: "Couldn't load your billing details",
  billingPageLoadFailedBody:
    "Something went wrong loading your plan. Check your connection and try again — your data is safe.",

  billingPageOrgDocMissingTitle: "We couldn't find your account",
  billingPageOrgDocMissingBody:
    "This sometimes happens right after signing up — it just takes a moment to finish creating your account. Wait a few seconds and refresh. If the problem continues, contact support.",

  stripeDisabledTitle: 'Online checkout',
  stripeDisabledBody:
    'Stripe is not configured in this environment. In production, subscription management appears here.',
  portalCardTitle: 'Payment & invoices',
  portalCardLead:
    'Update your payment method, download invoices and receipts, or cancel your subscription.',
  portalCtaOpen: 'Manage billing',
  portalCtaOpening: 'Opening…',
  noCustomerLead:
    'No payment method on file yet. Choose a plan below to set up your subscription.',

  clientCapacityTitle: 'Client capacity',
  clientCapacityUsed: (active: number, limit: number) =>
    `${active} of ${limit} client slots used`,
  clientCapacityAtLimit:
    "You've reached your client limit. Upgrade your plan to add more active clients.",
  clientCapacityNearlyFull: (remaining: number) =>
    `Nearly full — ${remaining} client slot${remaining === 1 ? '' : 's'} remaining.`,
  clientCapacityCoaches: (n: number) =>
    `${n} ${n === 1 ? 'coach' : 'coaches'} in your organisation`,
  orgBillingLinkFullPage: 'Full billing page',
  orgBillingLinkFullPageHint: 'Plans, checkout, and invoices',
  orgBillingLinkFullPageCta: 'Open billing',

  billingPagePortalTitle: 'Payment & invoices',
  billingPagePortalLead:
    'Manage your payment method and access your invoices and receipts. To change your client capacity, use the plan section on this page.',
  billingPagePortalBulletPayment: 'Update the card on file or billing details',
  billingPagePortalBulletInvoices: 'View and download invoices and receipts',
  billingPagePortalBulletPlan: 'Cancel your subscription',
  billingPagePortalBulletCapacity: 'Switch between monthly and annual billing',
  billingPagePortalCta: 'Manage billing',
  billingPagePortalCtaLoading: 'Opening…',
  billingPagePortalFootnote:
    "You'll leave briefly to the billing portal and can return here when done.",
  billingPagePastDuePortalHint:
    'Your last payment failed. Open the billing portal to update your payment method and avoid interruption.',
  billingPageTrialWithCustomerHint:
    'You have a payment method on file. Subscribe using the plan section below, or add a payment method in the billing portal.',
  billingPageNoCustomerBody:
    'No payment method on file yet. Use the plan section below to subscribe.',

  /** When Firestore has no amount yet but status is still "trial" */
  billingPagePlanTrialNoPrice: "You're on a free trial. Choose a plan below when you're ready to subscribe.",
  /** Active org, Stripe customer, but amount not synced to Firestore yet */
  billingPagePlanActiveWithPortal:
    "You're subscribed. Change your client limit below, or open the billing portal for payment details and invoices.",
  /** Active but no Stripe customer and no price in app data */
  billingPagePlanActiveNoStripe:
    "You don't have an active subscription yet. Choose a plan below to get started.",
  /** cancelled, past_due, none, etc. with no amount */
  billingPagePlanOtherNoPrice: "Your billing isn't fully set up. Choose a plan below or contact support.",

  billingPageSectionYourSubscription: 'Your subscription',
  billingPageSectionManageStripe: 'Payment & invoices',
  billingPageSectionAccount: 'Account',

  billingPagePaymentCardTitle: 'Payment & invoices',
  billingPagePaymentCardBodyWithPortal:
    'Update your card, download invoices, or cancel in the billing portal. Change client capacity in the plan section below.',
  billingPagePaymentCardBulletOne: 'Payment method and billing details',
  billingPagePaymentCardBulletTwo: 'Invoices, receipts, and subscription changes',
  billingPagePaymentCardBodyNoPortal:
    "After you choose a plan below, you'll add a payment method on Stripe's checkout page.",
  billingPagePaymentOpenPortal: 'Manage billing',

  billingPageContactCardTitle: 'Billing contact',
  billingPageContactCardHint: 'Organisation admin receiving billing emails.',

  billingSubscriptionManagePlan: 'Manage billing',
  billingSubscriptionScrollToPackages: 'Change plan',
  billingPageStripePortalHonestCta: 'Manage billing',

  billingActiveSubSectionEyebrow: 'Change or cancel',
  billingActiveSubSectionTitle: 'To cancel or change billing period, use the billing portal',
  billingActiveSubSectionLead:
    'Client capacity changes happen directly in this page. To switch between monthly and annual, or to cancel your subscription, open the billing portal.',
  billingActiveSubBulletPortal:
    'Open the billing portal to update your card, download invoices, or cancel.',
  billingActiveSubBulletNoCompare:
    'Capacity upgrades and downgrades can be confirmed directly in the plan section below.',
  billingActiveSubClientsNote: 'You currently have {count} active clients in this organisation.',
  billingActiveSubContactCta: 'Contact support',

  billingPageIntroActiveLocked:
    "Your plan and usage are shown below. To change your client limit, pick a different tier. Use the billing portal to update your payment method or download invoices.",

  /** Toast when opening portal but Stripe lists no subscriptions for this customer */
  billingPagePortalNoSubscriptionToastTitle: 'No active subscription found',
  billingPagePortalNoSubscriptionToastBody:
    'You can still update your card in the billing portal. To start a subscription, choose a plan on this page.',

  /** Inline hint — customer exists but Firestore has no stripeSubscriptionId */
  billingPagePortalHintNoSubId:
    'Use the plan section below to set up or change your subscription.',

  /** Inline hint — org appears subscribed; portal misconfiguration is common */
  billingPagePortalHintDashboard:
    'To change your client capacity, use the plan section below.',
} as const;
