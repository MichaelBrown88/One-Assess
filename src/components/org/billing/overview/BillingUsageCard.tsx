import { BillingSectionCard } from '@/components/org/billing/overview/BillingSectionCard';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import {
  capacityUtilisationRatio,
  capacityUtilisationTone,
} from '@/lib/billing/capacityUtilisation';
import { cn } from '@/lib/utils';

const TONE_BAR: Record<string, string> = {
  ok: 'bg-score-green',
  warn: 'bg-score-amber',
  full: 'bg-score-red',
};

const TONE_TEXT: Record<string, string> = {
  ok: 'text-muted-foreground',
  warn: 'text-score-amber-bold',
  full: 'text-score-red-bold',
};

interface BillingUsageCardProps {
  activeClients: number;
  clientCap: number;
  coachCount: number;
  isInternal: boolean;
}

export function BillingUsageCard({
  activeClients,
  clientCap,
  coachCount,
  isInternal,
}: BillingUsageCardProps) {
  if (isInternal) {
    return (
      <BillingSectionCard title={ORG_BILLING_COPY.usageSectionTitle}>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {ORG_BILLING_COPY.internalClientsUsed(activeClients)}
          </p>
          <p className="text-xs text-muted-foreground">{ORG_BILLING_COPY.clientCapacityCoaches(coachCount)}</p>
        </div>
      </BillingSectionCard>
    );
  }

  const ratio = capacityUtilisationRatio(activeClients, clientCap);
  const tone = capacityUtilisationTone(ratio);
  const remaining = Math.max(0, clientCap - activeClients);

  return (
    <BillingSectionCard title={ORG_BILLING_COPY.usageSectionTitle}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">
            {ORG_BILLING_COPY.clientsUsed(activeClients, Math.max(1, clientCap))}
          </span>
          <span className={cn('tabular-nums font-semibold', TONE_TEXT[tone])}>
            {Math.round(ratio * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', TONE_BAR[tone])}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        {tone === 'full' ? (
          <p className="text-xs font-medium text-score-red-bold">{ORG_BILLING_COPY.clientCapacityAtLimit}</p>
        ) : null}
        {tone === 'warn' ? (
          <p className="text-xs text-score-amber-bold">
            {ORG_BILLING_COPY.clientCapacityNearlyFull(remaining)}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{ORG_BILLING_COPY.clientCapacityCoaches(coachCount)}</p>
      </div>
    </BillingSectionCard>
  );
}
