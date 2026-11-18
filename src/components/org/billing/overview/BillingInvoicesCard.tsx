import { Download } from 'lucide-react';
import { BillingSectionCard } from '@/components/org/billing/overview/BillingSectionCard';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { formatPrice } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import type { InvoiceSummary } from '@/types/platform';

interface BillingInvoicesCardProps {
  invoices: InvoiceSummary[];
  loading: boolean;
  hasStripeCustomer: boolean;
  portalLoading: boolean;
  onManagePayment: () => void;
}

export function BillingInvoicesCard({
  invoices,
  loading,
  hasStripeCustomer,
  portalLoading,
  onManagePayment,
}: BillingInvoicesCardProps) {
  return (
    <BillingSectionCard
      title={ORG_BILLING_COPY.invoicesSectionTitle}
      action={
        hasStripeCustomer && invoices.length > 0 ? (
          <button
            type="button"
            onClick={onManagePayment}
            disabled={portalLoading}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            {ORG_BILLING_COPY.invoicesViewAll}
          </button>
        ) : null
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.loadingPlan}</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{ORG_BILLING_COPY.invoicesEmpty}</p>
      ) : (
        <div className="divide-y divide-border -mx-5">
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xs tabular-nums text-muted-foreground w-[5.5rem] shrink-0">
                {new Date(inv.date * 1000).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
              <span className="text-sm font-medium tabular-nums text-foreground w-20 shrink-0">
                {formatPrice(inv.amountPaid / 100, inv.currency.toUpperCase(), 'en-GB')}
              </span>
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  inv.status === 'paid'
                    ? 'bg-score-green-light text-score-green-bold'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {inv.status ?? 'unknown'}
              </span>
              <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
                {inv.description}
              </span>
              {inv.pdfUrl ? (
                <a
                  href={inv.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                  title={ORG_BILLING_COPY.invoicesDownload}
                >
                  <Download className="h-4 w-4" aria-hidden />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </BillingSectionCard>
  );
}
