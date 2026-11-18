import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';

interface ChangePlanStatusBannersProps {
  subscriptionStatus: string;
  onManagePayment: () => Promise<void>;
}

export function ChangePlanStatusBanners({
  subscriptionStatus,
  onManagePayment,
}: ChangePlanStatusBannersProps) {
  if (subscriptionStatus === 'past_due') {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-score-red-muted bg-score-red-light/50 dark:bg-score-red-muted/10 p-4 sm:flex-row sm:items-center">
        <AlertTriangle className="h-5 w-5 shrink-0 text-score-red-bold" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{CHECKOUT_FLOW_COPY.pastDueBannerTitle}</p>
          <p className="text-xs text-muted-foreground">{CHECKOUT_FLOW_COPY.pastDueBannerBody}</p>
        </div>
        <Button type="button" variant="destructive" size="sm" className="rounded-lg shrink-0" onClick={() => void onManagePayment()}>
          {CHECKOUT_FLOW_COPY.pastDueUpdateCardCta}
        </Button>
      </div>
    );
  }
  if (subscriptionStatus === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <Info className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
        <p className="text-sm text-foreground">{CHECKOUT_FLOW_COPY.changePlanCancelledBanner}</p>
      </div>
    );
  }
  return null;
}
