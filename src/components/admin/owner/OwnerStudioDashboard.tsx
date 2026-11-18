import { assessmentCountLabel, formatOwnerDay, OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { formatPrice } from '@/lib/utils/currency';
import type { StudioSnapshot } from '@/types/ownerConsole';

interface OwnerStudioKpisProps {
  studio: StudioSnapshot;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-medium text-foreground-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}

export function OwnerStudioKpis({ studio }: OwnerStudioKpisProps) {
  const revenueValue =
    studio.payStatus === 'internal'
      ? OWNER_CONSOLE_COPY.payStatus.internal
      : formatPrice(studio.monthlyRevenueGbpPence / 100, 'GBP');

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Kpi label={OWNER_CONSOLE_COPY.studio.revenue} value={revenueValue} />
        <Kpi label={OWNER_CONSOLE_COPY.studio.assessments} value={assessmentCountLabel(studio.assessmentCount)} />
        <Kpi label={OWNER_CONSOLE_COPY.studio.thisWeek} value={String(studio.assessmentsThisWeek)} />
        <Kpi label={OWNER_CONSOLE_COPY.studio.seats} value={String(studio.seatCount)} />
      </div>
    </section>
  );
}

export function OwnerStudioFactList({
  title,
  facts,
}: {
  title: string;
  facts: Array<{ label: string; value: string }>;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="overflow-hidden rounded-lg border border-border bg-card">
        {facts.map((fact) => (
          <div key={fact.label} className="grid grid-cols-3 border-b border-border px-4 py-3 last:border-0">
            <dt className="text-sm text-foreground-secondary">{fact.label}</dt>
            <dd className="col-span-2 text-sm text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function studioMoneyFacts(studio: StudioSnapshot): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [
    { label: OWNER_CONSOLE_COPY.studio.email, value: studio.ownerEmail.trim() || OWNER_CONSOLE_COPY.studio.noneYet },
  ];
  if (studio.payStatus === 'trial' && studio.trialEndsAt) {
    facts.push({
      label: OWNER_CONSOLE_COPY.studio.trialEnds,
      value: formatOwnerDay(studio.trialEndsAt),
    });
  }
  return facts;
}

export function studioUsageFacts(studio: StudioSnapshot): Array<{ label: string; value: string }> {
  return [
    { label: OWNER_CONSOLE_COPY.studio.buyerType, value: OWNER_CONSOLE_COPY.buyerType[studio.buyerType] },
    { label: OWNER_CONSOLE_COPY.studio.joined, value: formatOwnerDay(studio.joinedAt) },
    {
      label: OWNER_CONSOLE_COPY.studio.firstAssessment,
      value: studio.firstAssessmentAt
        ? formatOwnerDay(studio.firstAssessmentAt)
        : OWNER_CONSOLE_COPY.studio.noneYet,
    },
    {
      label: OWNER_CONSOLE_COPY.studio.lastActivity,
      value: studio.lastActivityAt ? formatOwnerDay(studio.lastActivityAt) : OWNER_CONSOLE_COPY.studio.noneYet,
    },
  ];
}

export function studioHealthLabel(studio: StudioSnapshot): string | null {
  if (!studio.needsYou) return null;
  if (studio.needsYouReason) return OWNER_CONSOLE_COPY.needsYou[studio.needsYouReason];
  return OWNER_CONSOLE_COPY.studio.needsYou;
}
