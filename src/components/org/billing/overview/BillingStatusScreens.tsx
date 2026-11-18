import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

interface BillingMessageProps {
  title: string;
  body: string;
  action: ReactNode;
}

function BillingMessage({ title, body, action }: BillingMessageProps) {
  return (
    <div className="max-w-md space-y-4 py-8">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      {action}
    </div>
  );
}

export function BillingAdminOnly({ onDashboard }: { onDashboard: () => void }) {
  return (
    <BillingMessage
      title={ORG_BILLING_COPY.adminOnlyTitle}
      body={ORG_BILLING_COPY.adminOnlyBody}
      action={
        <Button type="button" variant="link" onClick={onDashboard}>
          {ORG_BILLING_COPY.goToDashboard}
        </Button>
      }
    />
  );
}

export function BillingLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <div className="h-10 w-10 rounded-full border-4 border-border border-t-primary animate-spin" aria-hidden />
      <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.loadingPlan}</p>
    </div>
  );
}

export function BillingNoOrg({ onSetup }: { onSetup: () => void }) {
  return (
    <BillingMessage
      title={ORG_BILLING_COPY.billingPageMissingOrgTitle}
      body={ORG_BILLING_COPY.billingPageMissingOrgBody}
      action={
        <Button type="button" className="rounded-lg font-semibold" onClick={onSetup}>
          {ORG_BILLING_COPY.continueSetup}
        </Button>
      }
    />
  );
}

export function BillingMissingDoc({ onDashboard }: { onDashboard: () => void }) {
  return (
    <BillingMessage
      title={ORG_BILLING_COPY.billingPageOrgDocMissingTitle}
      body={ORG_BILLING_COPY.billingPageOrgDocMissingBody}
      action={
        <Button type="button" variant="outline" className="rounded-lg" onClick={onDashboard}>
          {ORG_BILLING_COPY.backToDashboard}
        </Button>
      }
    />
  );
}

export function BillingLoadFailed() {
  return (
    <BillingMessage
      title={ORG_BILLING_COPY.billingPageLoadFailedTitle}
      body={ORG_BILLING_COPY.billingPageLoadFailedBody}
      action={
        <Button type="button" className="rounded-lg font-semibold" onClick={() => window.location.reload()}>
          {ORG_BILLING_COPY.retry}
        </Button>
      }
    />
  );
}
