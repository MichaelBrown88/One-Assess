import type { PlanSmartGoal, PlanSmartGoalCategory } from '@/lib/reports/planSmartGoals';
import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ClientProgressionTable } from './ClientProgressionTable';
import { RoadmapTargetFigures } from './ClientRoadmapSupport';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { cn } from '@/lib/utils';

interface PlanSmartGoalsProps {
  goals: PlanSmartGoal[];
  target?: ClientNinetyDayTarget | null;
  embedded?: boolean;
}

const SECTION_COPY: Record<PlanSmartGoalCategory, string> = {
  'body-comp': CLIENT_REPORT_COPY.planSmartGoalsSectionBody,
  tape: CLIENT_REPORT_COPY.planSmartGoalsSectionTape,
  performance: CLIENT_REPORT_COPY.planSmartGoalsSectionPerformance,
};

const SECTION_ORDER: PlanSmartGoalCategory[] = ['body-comp', 'tape', 'performance'];

function toProgressionRows(goals: PlanSmartGoal[]): ClientReportProgressionRow[] {
  return goals.map((goal) => ({
    name: goal.label,
    current: goal.current,
    oneMonth: goal.at1Month,
    twelveWeeks: goal.at16Weeks,
    unit: goal.unit || undefined,
  }));
}

export function PlanSmartGoals({ goals, target, embedded = false }: PlanSmartGoalsProps) {
  if (goals.length === 0 && !target) return null;

  return (
    <section className={cn(embedded ? '' : 'scroll-mt-24 rounded-sm border border-border bg-card px-6 py-8 sm:px-10')}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
            {CLIENT_REPORT_COPY.planSmartGoalsHeading}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {CLIENT_REPORT_COPY.planSmartGoalsSubheading}
          </p>
        </div>
        {target ? <RoadmapTargetFigures target={target} /> : null}
      </div>

      {goals.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{CLIENT_REPORT_COPY.planSmartGoalsEmpty}</p>
      ) : (
        <div className="mt-6 space-y-8">
          {SECTION_ORDER.map((category) => {
            const sectionGoals = goals.filter((g) => g.category === category);
            if (sectionGoals.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {SECTION_COPY[category]}
                </h3>
                <ClientProgressionTable rows={toProgressionRows(sectionGoals)} className="mt-2" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
