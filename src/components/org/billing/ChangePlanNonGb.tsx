import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import { ROUTES } from '@/constants/routes';

interface ChangePlanNonGbProps {
  checkoutLocked: boolean;
  onBack: () => void;
}

export function ChangePlanNonGb({ checkoutLocked, onBack }: ChangePlanNonGbProps) {
  return (
    <div className="space-y-5 pb-16">
      <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5 -ml-2">
        <ArrowLeft className="h-4 w-4" />
        {CHECKOUT_FLOW_COPY.changePlanBackToOverview}
      </Button>
      <section className="rounded-lg border border-border bg-card p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">{CHECKOUT_FLOW_COPY.billingNonGbSectionTitle}</h2>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          {CHECKOUT_FLOW_COPY.billingNonGbSectionLead}
        </p>
        {checkoutLocked ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/20 p-4">
            {CHECKOUT_FLOW_COPY.billingNonGbActiveSubHint}
          </p>
        ) : null}
        <Button type="button" className="rounded-lg font-semibold" asChild>
          <Link to={ROUTES.CONTACT}>{CHECKOUT_FLOW_COPY.billingNonGbContactCta}</Link>
        </Button>
      </section>
    </div>
  );
}
