import { Button } from '@/components/ui/button';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';

interface BillingCancelRowProps {
  onCancelSubscription: () => void;
}

export function BillingCancelRow({ onCancelSubscription }: BillingCancelRowProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
      <p className="text-xs text-muted-foreground max-w-md">{ORG_BILLING_COPY.cancelPlanHint}</p>
      <Button type="button" variant="ghost" size="sm" className="rounded-lg shrink-0" onClick={onCancelSubscription}>
        {ORG_BILLING_COPY.cancelPlan}
      </Button>
    </div>
  );
}
