import React from 'react';
import type { FormData } from '@/contexts/FormContext';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import {
  buildLifestyleFactorRows,
  lifestyleStatusLabel,
  type LifestyleFactorRow,
  type LifestyleFactorTone,
  type LifestyleNutritionTargets,
} from '@/lib/reports/clientLifestyleFactors';
import { cn } from '@/lib/utils';

interface LifestyleFactorsCardProps {
  formData?: FormData;
  nutritionTargets?: LifestyleNutritionTargets;
}

/**
 * Lifestyle factor grid for the AXIS report — label, value, status, and a short tip.
 * Alcohol is collected in assessment but not shown here.
 */
export const LifestyleFactorsCard: React.FC<LifestyleFactorsCardProps> = ({
  formData,
  nutritionTargets,
}) => {
  const factors = buildLifestyleFactorRows(formData, nutritionTargets);

  if (factors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{CLIENT_REPORT_COPY.v2LifestyleEmpty}</p>
    );
  }

  return (
    <div className="overflow-hidden border border-border-medium bg-card">
      {factors.map((factor, index) => (
        <FactorRow key={factor.id} factor={factor} index={index} />
      ))}
    </div>
  );
};

function FactorRow({ factor, index }: { factor: LifestyleFactorRow; index: number }) {
  return (
    <div
      className={cn(
        'px-3 py-3 sm:px-4',
        index > 0 && 'border-t border-border-medium',
        index % 2 === 1 && 'bg-muted',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-px">
          <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
            {factor.label}
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-foreground">
            {factor.value}
          </span>
        </span>
        <ToneChip tone={factor.tone} />
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-foreground-secondary">{factor.advice}</p>
    </div>
  );
}

function ToneChip({ tone }: { tone: LifestyleFactorTone }) {
  const cls =
    tone === 'good'
      ? 'bg-score-green-light text-score-green-fg'
      : tone === 'concern'
        ? 'bg-score-amber-light text-score-amber-fg'
        : tone === 'critical'
          ? 'bg-score-red-light text-score-red-fg'
          : 'bg-muted text-muted-foreground';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}
    >
      {lifestyleStatusLabel(tone)}
    </span>
  );
}
