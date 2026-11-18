import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { formatPrice } from '@/lib/utils/currency';
import type { OwnerPulse } from '@/types/ownerConsole';

interface OwnerPulseBandProps {
  pulse: OwnerPulse;
}

function Stat({
  label,
  value,
  lastWeek,
}: {
  label: string;
  value: string;
  lastWeek?: number;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-foreground-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {lastWeek != null ? (
        <p className="mt-1 text-xs tabular-nums text-foreground-secondary">
          {OWNER_CONSOLE_COPY.pulse.vsLastWeek(lastWeek)}
        </p>
      ) : null}
    </div>
  );
}

export function OwnerPulseBand({ pulse }: OwnerPulseBandProps) {
  const revenue = formatPrice(pulse.monthlyRevenueGbpPence / 100, 'GBP');
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-y-0">
        <Stat
          label={OWNER_CONSOLE_COPY.pulse.newStudios}
          value={String(pulse.thisWeek.newStudios)}
          lastWeek={pulse.lastWeek.newStudios}
        />
        <Stat
          label={OWNER_CONSOLE_COPY.pulse.firstAssessments}
          value={String(pulse.thisWeek.firstAssessments)}
          lastWeek={pulse.lastWeek.firstAssessments}
        />
        <Stat label={OWNER_CONSOLE_COPY.pulse.payingStudios} value={String(pulse.payingStudios)} />
        <Stat label={OWNER_CONSOLE_COPY.pulse.monthlyRevenue} value={revenue} />
        <Stat
          label={OWNER_CONSOLE_COPY.pulse.assessmentsCompleted}
          value={String(pulse.thisWeek.assessmentsCompleted)}
          lastWeek={pulse.lastWeek.assessmentsCompleted}
        />
      </div>
    </section>
  );
}
