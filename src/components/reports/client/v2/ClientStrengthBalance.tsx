import type { GripImbalance } from '@/lib/scoring/gripImbalance';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

interface ClientStrengthBalanceProps {
  imbalance: GripImbalance;
}

/** Strength pillar: a material left/right grip gap and how training corrects it. */
export function ClientStrengthBalance({ imbalance }: ClientStrengthBalanceProps) {
  const { weakSide, strongSide, gapPct, weakKg, strongKg } = imbalance;
  return (
    <div className="mt-5" data-testid="strength-balance">
      <p className="text-xs font-semibold text-foreground-secondary">{CLIENT_REPORT_COPY.strengthBalanceHeading}</p>
      <div className="mt-3 border-y border-border py-4 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
        <h4 className="text-sm font-semibold text-foreground">{CLIENT_REPORT_COPY.strengthBalanceTitle}</h4>
        <div>
          <p className="mt-1 text-sm leading-relaxed text-foreground-secondary sm:mt-0">
            {CLIENT_REPORT_COPY.strengthBalanceFinding(weakSide, strongSide, gapPct, weakKg, strongKg)}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            <span className="font-medium">{CLIENT_REPORT_COPY.strengthBalanceFocus}: </span>
            {CLIENT_REPORT_COPY.strengthBalancePlan(weakSide, strongSide)}
          </p>
        </div>
      </div>
    </div>
  );
}
