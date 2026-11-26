import type { ClientSideBalance } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

interface ClientStrengthBalanceProps {
  balances: ClientSideBalance[];
}

/** Strength pillar: material left/right gaps (grip, legs) and how training corrects them. */
export function ClientStrengthBalance({ balances }: ClientStrengthBalanceProps) {
  if (balances.length === 0) return null;
  return (
    <div className="mt-5" data-testid="strength-balance">
      <p className="text-xs font-semibold text-foreground-secondary">{CLIENT_REPORT_COPY.strengthBalanceHeading}</p>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {balances.map(({ kind, imbalance }) => {
          const { weakSide, strongSide, gapPct, weak, strong } = imbalance;
          return (
            <div key={kind} className="py-4 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
              <h4 className="text-sm font-semibold text-foreground">{CLIENT_REPORT_COPY.strengthBalanceTitle[kind]}</h4>
              <div>
                <p className="mt-1 text-sm leading-relaxed text-foreground-secondary sm:mt-0">
                  {CLIENT_REPORT_COPY.strengthBalanceFinding[kind](weakSide, strongSide, gapPct, weak, strong)}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">
                  <span className="font-medium">{CLIENT_REPORT_COPY.strengthBalanceFocus}: </span>
                  {CLIENT_REPORT_COPY.strengthBalancePlan[kind](weakSide, strongSide)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
