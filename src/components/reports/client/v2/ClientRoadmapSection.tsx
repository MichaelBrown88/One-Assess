import type { ClientRoadmapCard } from '@/lib/reports/clientRoadmapCards';
import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import type { ReportTrainingWeek } from '@/lib/reports/plannedTraining';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { CLIENT_PLAN_COPY as COPY } from '@/constants/clientPlanCopy';
import { RoadmapTargetFigures } from './ClientRoadmapSupport';
import { cn } from '@/lib/utils';

interface ClientRoadmapSectionProps {
  cards: ClientRoadmapCard[];
  target?: ClientNinetyDayTarget | null;
  embedded?: boolean;
  trainingWeek: ReportTrainingWeek;
}
export function ClientRoadmapSection({ cards, target, embedded = false, trainingWeek }: ClientRoadmapSectionProps) {
  if (!cards.length) return null;
  return (
    <section id="your-plan" className={cn('scroll-mt-24', !embedded && 'bg-card px-6 py-8 sm:px-10')}>
      <header>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{CLIENT_REPORT_COPY.v2RoadmapHeading}</h2>
        <p className="mt-2 text-sm font-medium text-foreground">{COPY.weekHeading}</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-foreground-secondary">{COPY.liftingWeek(trainingWeek.visits)}</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-foreground-secondary">
          {trainingWeek.conditioningSessions ? COPY.conditioningWeek : COPY.strengthOnlyWeek}
        </p>
      </header>
      {trainingWeek.visits === 4 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground">{COPY.exampleWeekHeading}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COPY.exampleWeekFour(trainingWeek.conditioningSessions > 0).map(day => (
              <div key={day.day} className="border-l border-border pl-3">
                <dt className="text-xs font-medium text-muted-foreground">{day.day}</dt>
                <dd className="mt-1 text-sm text-foreground">{day.activity}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{COPY.exampleWeekNote}</p>
        </div>
      ) : null}
      <div className="mt-6 divide-y divide-border border-y border-border">
        {cards.map(card => (
          <article key={card.goalId} className="py-5 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <h3 className="text-base font-semibold text-foreground">{card.label}</h3>
            <div className="mt-2 sm:mt-0">
              <p className="font-medium leading-snug text-foreground">{card.smartGoal}</p>
              <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                <PlanLine label={COPY.eachWeek} text={card.how} />
                <PlanLine label={COPY.track} text={card.track} />
                <PlanLine label={COPY.review} text={card.review} />
              </dl>
            </div>
          </article>
        ))}
      </div>
      {target ? <div className="mt-6"><RoadmapTargetFigures target={target} /></div> : null}
      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-base font-semibold text-foreground">{COPY.checkpointsHeading}</h3>
        <ol className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {COPY.checkpoints.map(checkpoint => (
            <li key={checkpoint.when}>
              <p className="text-xs font-medium text-muted-foreground">{checkpoint.when}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{checkpoint.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">{checkpoint.action}</p>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground">{COPY.cta}</p>
      </div>
    </section>
  );
}
function PlanLine({ label, text }: { label: string; text: string }) {
  return <div><dt className="inline font-medium text-foreground">{label}: </dt><dd className="inline text-foreground-secondary">{text}</dd></div>;
}
