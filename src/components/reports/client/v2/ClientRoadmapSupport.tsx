import React from 'react';
import type { ClientNinetyDayTarget } from '@/lib/reports/clientNinetyDayTarget';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';

export function RoadmapTargetFigures({ target }: { target: ClientNinetyDayTarget }) {
  const items: { label: string; value: string; hint?: string }[] = [];

  if (target.targetWeightKg != null) {
    const deltaLabel =
      target.direction === 'maintain' || target.weightDeltaKg == null
        ? CLIENT_REPORT_COPY.v2RoadmapTargetMaintain
        : `${target.weightDeltaKg > 0 ? '+' : '\u2212'}${Math.abs(target.weightDeltaKg)} kg`;
    items.push({
      label: CLIENT_REPORT_COPY.v2RoadmapTargetWeight,
      value: `${target.targetWeightKg} kg`,
      hint: deltaLabel,
    });
  }
  if (target.calories != null) {
    items.push({
      label: CLIENT_REPORT_COPY.v2RoadmapTargetCalories,
      value: target.calories.toLocaleString(),
    });
  }
  if (target.proteinG != null) {
    items.push({
      label: CLIENT_REPORT_COPY.v2RoadmapTargetProtein,
      value: `${target.proteinG}g`,
    });
  }
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-lg font-semibold tabular-nums tracking-[-0.03em] text-foreground">
            {item.value}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {item.label}
            {item.hint ? ` · ${item.hint}` : ''}
          </p>
        </div>
      ))}
    </div>
  );
}

export function RoadmapSelfGuidedHabits({ habits }: { habits: string[] }) {
  if (habits.length === 0) return null;
  return (
    <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
      <span className="font-semibold text-foreground-secondary">
        {CLIENT_REPORT_COPY.v2SelfGuidedHeading}{' '}
      </span>
      {habits.map((habit) => sanitizeClientReportCopy(habit)).join(' · ')}
    </p>
  );
}
