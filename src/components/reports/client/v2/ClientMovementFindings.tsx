import { movementPatternDetail, type ClientMovementFindingsModel } from '@/lib/reports/clientMovementFindings';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { CLIENT_PLAN_COPY } from '@/constants/clientPlanCopy';
import { cn } from '@/lib/utils';

interface ClientMovementFindingsProps { findings: ClientMovementFindingsModel; className?: string }
export function ClientMovementFindings({ findings, className }: ClientMovementFindingsProps) {
  const groups = findings.groups.filter(group => group.tone !== 'good');
  if (!groups.length) return null;
  return (
    <div className={cn('mt-5', className)}>
      <p className="text-xs font-semibold text-foreground-secondary">{CLIENT_REPORT_COPY.v2MovementFindingsHeading}</p>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {groups.map(group => (
          <div key={group.id} className="py-4 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
            <div>
              <p className="mt-1 text-sm leading-relaxed text-foreground-secondary sm:mt-0">{movementPatternDetail(group) || group.rows.filter(r => r.tone !== 'good').map(r => r.value).join('. ')}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground"><span className="font-medium">{CLIENT_PLAN_COPY.movementFocus}: </span>{CLIENT_PLAN_COPY.movementActions[group.id]}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
