import { useState, type ReactNode } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrgBilling } from '@/hooks/useOrgBilling';
import { useStripeCustomerPortal } from '@/hooks/useStripeCustomerPortal';
import { DEFAULT_CURRENCY, DEFAULT_REGION } from '@/constants/pricing';
import { getLocaleForRegion } from '@/lib/utils/currency';
import { ROUTES } from '@/constants/routes';
import { getAppShellSeoForPathname } from '@/constants/seo';
import { STRIPE_CONFIG } from '@/constants/platform';
import { subscriptionPlanDisplayHeadline } from '@/lib/pricing/subscriptionPlanDisplay';
import { resolveSubscriptionClientLimit } from '@/lib/pricing/resolveSubscriptionClientLimit';
import { canManageCheckout } from '@/lib/billing/billingOverviewCopy';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CancellationSurveyDialog } from '@/components/org/billing/CancellationSurveyDialog';
import { BillingOverviewPanel } from '@/components/org/billing/BillingOverviewPanel';
import { ChangePlanPanel } from '@/components/org/billing/ChangePlanPanel';
import { BillingWorkspaceFrame } from '@/components/org/billing/overview/BillingWorkspaceFrame';
import {
  BillingAdminOnly,
  BillingLoadFailed,
  BillingLoading,
  BillingMissingDoc,
  BillingNoOrg,
} from '@/components/org/billing/overview/BillingStatusScreens';

function BillingPage() {
  const { user, profile, loading: authLoading, effectiveOrgId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'change' ? 'change' : 'overview';
  const [billingRefreshKey, setBillingRefreshKey] = useState(0);
  const [showCancelSurvey, setShowCancelSurvey] = useState(false);

  const resolvedOrgId = effectiveOrgId ?? profile?.organizationId ?? null;
  const { orgData, loading, loadProblem } = useOrgBilling(
    authLoading ? null : resolvedOrgId,
    billingRefreshKey,
  );
  const { portalLoading, openPortal } = useStripeCustomerPortal(resolvedOrgId);

  const billingSeo = getAppShellSeoForPathname(location.pathname);
  const pageTitle = view === 'change' ? ORG_BILLING_COPY.pageTitleChange : ORG_BILLING_COPY.pageTitle;
  const trail = view === 'change' ? [ORG_BILLING_COPY.pageTitle] : undefined;

  const frame = (body: ReactNode) => (
    <BillingWorkspaceFrame
      pathname={location.pathname}
      title={billingSeo.title}
      description={billingSeo.description}
      noindex={billingSeo.noindex ?? true}
      pageTitle={pageTitle}
      trail={trail}
    >
      {body}
    </BillingWorkspaceFrame>
  );

  if (profile && profile.role !== 'org_admin') {
    return frame(<BillingAdminOnly onDashboard={() => navigate(ROUTES.DASHBOARD)} />);
  }
  if (authLoading || loading) return frame(<BillingLoading />);
  if (loadProblem === 'no_org') {
    return frame(<BillingNoOrg onSetup={() => navigate(ROUTES.ONBOARDING)} />);
  }
  if (loadProblem === 'missing_doc') {
    return frame(<BillingMissingDoc onDashboard={() => navigate(ROUTES.DASHBOARD)} />);
  }
  if (loadProblem === 'error' || !orgData || !resolvedOrgId) {
    return frame(<BillingLoadFailed />);
  }

  const currency = orgData.subscription.currency ?? DEFAULT_CURRENCY;
  const amountCents = orgData.subscription.amountCents ?? orgData.subscription.amountFils ?? 0;
  const monthlyAmount = currency === 'KWD' ? amountCents / 1000 : amountCents / 100;
  const region = orgData.subscription.region ?? DEFAULT_REGION;
  const locale = getLocaleForRegion(region);
  const hasStripeCustomer = Boolean(orgData.stripeCustomerId?.trim());
  const subscriptionStatus = orgData.subscription.status ?? 'trial';
  const clientCapForDisplay = resolveSubscriptionClientLimit({
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap: orgData.subscription.clientCap,
    clientCount: orgData.subscription.clientCount,
    clientSeats: orgData.subscription.clientSeats,
    plan: orgData.subscription.plan,
    subscriptionStatus: orgData.subscription.status,
  });
  const subscriptionPlanHeadline = subscriptionPlanDisplayHeadline({
    plan: orgData.subscription.plan ?? 'starter',
    capacityTierId: orgData.subscription.capacityTierId,
    clientCap: clientCapForDisplay,
    packageTrack: orgData.packageTrack,
  });
  const canShowChangePlan = canManageCheckout({
    isInternal: orgData.isInternal,
    stripeEnabled: STRIPE_CONFIG.isEnabled,
    orgType: orgData.orgType,
  });

  return frame(
    <ErrorBoundary>
      {view === 'change' ? (
        <ChangePlanPanel
          organizationId={resolvedOrgId}
          region={region}
          subscriptionStatus={subscriptionStatus}
          stripeSubscriptionId={orgData.stripeSubscriptionId}
          currentTrack={orgData.packageTrack}
          currentClientLimit={clientCapForDisplay}
          currentTierId={orgData.subscription.capacityTierId}
          statsClientCount={orgData.statsClientCount}
          offerBrandingAddOn={region === 'GB' && orgData.customBrandingEnabled === false}
          onBack={() => setSearchParams({})}
          onSubscriptionUpdated={() => setBillingRefreshKey((k) => k + 1)}
          onManagePayment={openPortal}
        />
      ) : (
        <BillingOverviewPanel
          orgData={orgData}
          organizationId={resolvedOrgId}
          subscriptionPlanHeadline={subscriptionPlanHeadline}
          subscriptionStatus={subscriptionStatus}
          monthlyAmount={monthlyAmount}
          currency={currency}
          locale={locale}
          clientCapForDisplay={clientCapForDisplay}
          hasStripeCustomer={hasStripeCustomer}
          userEmail={user?.email ?? undefined}
          portalLoading={portalLoading}
          canShowChangePlan={canShowChangePlan}
          onChangePlan={() => setSearchParams({ view: 'change' })}
          onManagePayment={() => void openPortal()}
          onCancelSubscription={() => setShowCancelSurvey(true)}
        />
      )}
      {user?.uid ? (
        <CancellationSurveyDialog
          open={showCancelSurvey}
          onOpenChange={setShowCancelSurvey}
          organizationId={resolvedOrgId}
          coachUid={user.uid}
          onProceedToPortal={() => void openPortal()}
        />
      ) : null}
    </ErrorBoundary>,
  );
}

export default BillingPage;
