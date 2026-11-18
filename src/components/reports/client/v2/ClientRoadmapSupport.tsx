import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import { CLIENT_REPORT_COPY as COPY } from '@/constants/clientReport';

export function RoadmapTargetFigures({ target }: { target: ClientNinetyDayTarget }) {
  const figures: { value: string; label: string }[] = [];
  if (target.monthlyWeightChangeKg != null) figures.push({
    label: target.direction === 'maintain' ? COPY.v2RoadmapTargetWeightMaintain : COPY.v2RoadmapTargetWeight,
    value: target.direction === 'maintain' ? COPY.v2RoadmapTargetMaintain : `${target.monthlyWeightChangeKg < 0 ? '−' : '+'}${Math.abs(target.monthlyWeightChangeKg).toFixed(1)} kg`,
  });
  if (target.calories != null) figures.push({ value: target.calories.toLocaleString(), label: COPY.v2RoadmapTargetCalories });
  if (target.proteinG != null) figures.push({ value: `${target.proteinG} g`, label: COPY.v2RoadmapTargetProtein });
  if (target.carbsG != null) figures.push({ value: `${target.carbsG} g`, label: COPY.planCarbs });
  if (target.fatG != null) figures.push({ value: `${target.fatG} g`, label: COPY.planFat });
  if (!figures.length) return null;
  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-6">
        {figures.map(figure => (
          <div key={figure.label}>
            <dd className="text-xl font-semibold tracking-tight text-foreground tabular-nums">{figure.value}</dd>
            <dt className="mt-1 text-xs text-foreground-secondary">{figure.label}</dt>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-foreground-secondary">{target.fuelSessionsNote}</p>
      {target.macroNote ? <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">{target.macroNote}</p> : null}
    </div>
  );
}
