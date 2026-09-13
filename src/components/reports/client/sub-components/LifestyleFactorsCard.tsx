import React from 'react';
import type { FormData } from '@/contexts/FormContext';

interface LifestyleFactorsCardProps {
  formData?: FormData;
}

type Tone = 'good' | 'concern' | 'critical' | 'unknown';

interface Factor {
  id: string;
  label: string;
  value: string;
  tone: Tone;
}

/**
 * Lifestyle factor grid for the AXIS report — label, value, and status chip.
 * Alcohol is collected in assessment but not shown here.
 */
export const LifestyleFactorsCard: React.FC<LifestyleFactorsCardProps> = ({ formData }) => {
  if (!formData) {
    return (
      <p className="text-sm text-muted-foreground">
        Lifestyle inputs were not captured for this assessment.
      </p>
    );
  }

  const factors: Factor[] = [];

  const sleepArch = (formData.sleepArchetype || '').toLowerCase();
  const sleepQ = (formData.sleepQuality || '').toLowerCase();
  const sleepC = (formData.sleepConsistency || '').toLowerCase();
  const sleepDur = (formData.sleepDuration || '').toLowerCase();
  if (sleepArch || sleepQ || sleepDur) {
    const sleepLabel = sleepArch
      ? capitalise(sleepArch.replace(/[-_]/g, ' '))
      : [sleepDur, sleepQ].filter(Boolean).map(capitalise).join(' · ');
    let tone: Tone = 'good';
    if (sleepArch.includes('disrupted') || sleepArch.includes('insufficient') || sleepQ === 'poor') {
      tone = 'critical';
    } else if (sleepArch.includes('fragmented') || sleepQ === 'fair' || sleepC.includes('inconsistent')) {
      tone = 'concern';
    }
    factors.push({ id: 'sleep', label: 'Sleep', value: sleepLabel || '—', tone });
  }

  const stress = (formData.stressLevel || '').toLowerCase();
  if (stress) {
    let tone: Tone = 'good';
    if (stress === 'very-high' || stress === 'high') tone = 'critical';
    else if (stress === 'moderate' || stress.includes('moderate')) tone = 'concern';
    factors.push({ id: 'stress', label: 'Stress', value: capitalise(stress.replace(/-/g, ' ')), tone });
  }

  const nutrition = (formData.nutritionHabits || '').toLowerCase();
  if (nutrition) {
    let tone: Tone = 'good';
    if (nutrition === 'poor') tone = 'critical';
    else if (nutrition === 'fair') tone = 'concern';
    factors.push({ id: 'nutrition', label: 'Nutrition', value: capitalise(nutrition), tone });
  }

  const hydration = (formData.hydrationHabits || '').toLowerCase();
  if (hydration) {
    let tone: Tone = 'good';
    if (hydration === 'poor') tone = 'critical';
    else if (hydration === 'fair') tone = 'concern';
    factors.push({ id: 'hydration', label: 'Hydration', value: capitalise(hydration), tone });
  }

  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    let tone: Tone = 'good';
    if (steps < 5000) tone = 'critical';
    else if (steps < 7500) tone = 'concern';
    factors.push({
      id: 'activity',
      label: 'Activity',
      value: `${formatThousands(steps)} steps / day`,
      tone,
    });
  } else if (formData.activityLevel) {
    factors.push({
      id: 'activity',
      label: 'Activity level',
      value: capitalise((formData.activityLevel || '').replace(/-/g, ' ')),
      tone: 'good',
    });
  }

  const sedentary = parseFloat(formData.sedentaryHours || '0');
  if (sedentary > 0) {
    let tone: Tone = 'good';
    if (sedentary >= 10) tone = 'critical';
    else if (sedentary >= 8) tone = 'concern';
    factors.push({
      id: 'sedentary',
      label: 'Sedentary',
      value: `${sedentary.toFixed(sedentary % 1 === 0 ? 0 : 1)} h / day`,
      tone,
    });
  }

  const cups = parseFloat(formData.caffeineCupsPerDay || '0');
  const lastCaffeine = formData.lastCaffeineIntake || '';
  if (cups > 0 || lastCaffeine) {
    let tone: Tone = 'good';
    const cutoff = parseInt((lastCaffeine.split(':')[0] || '0'), 10);
    if (cups >= 5 || (lastCaffeine && cutoff >= 16)) tone = 'critical';
    else if (cups >= 3 || (lastCaffeine && cutoff >= 14)) tone = 'concern';
    const parts = [];
    if (cups > 0) parts.push(`${cups} cup${cups === 1 ? '' : 's'}`);
    if (lastCaffeine) parts.push(`last ${formatTime(lastCaffeine)}`);
    factors.push({ id: 'caffeine', label: 'Caffeine', value: parts.join(' · '), tone });
  }

  if (factors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Lifestyle inputs were not captured for this assessment.
      </p>
    );
  }

  return (
    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
      {factors.map((f) => (
        <FactorRow key={f.id} factor={f} />
      ))}
    </div>
  );
};

function FactorRow({ factor }: { factor: Factor }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5">
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-muted-foreground">
          {factor.label}
        </span>
        <span className="truncate text-[13px] font-semibold tracking-[-0.005em] text-foreground">
          {factor.value}
        </span>
      </span>
      <ToneChip tone={factor.tone} />
    </div>
  );
}

function clientStatusLabel(tone: Tone): string {
  if (tone === 'good') return 'On track';
  if (tone === 'concern') return 'Room to improve';
  if (tone === 'critical') return 'Worth focusing on';
  return '—';
}

function ToneChip({ tone }: { tone: Tone }) {
  const cls =
    tone === 'good'
      ? 'bg-score-green-light text-score-green-fg'
      : tone === 'concern'
        ? 'bg-score-amber-light text-score-amber-fg'
        : tone === 'critical'
          ? 'bg-score-red-light text-score-red-fg'
          : 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {clientStatusLabel(tone)}
    </span>
  );
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatThousands(n: number): string {
  return n.toLocaleString('en-GB');
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const hour = parseInt(h, 10);
  const minute = m ? parseInt(m, 10) : 0;
  if (Number.isNaN(hour)) return hhmm;
  const period = hour >= 12 ? 'pm' : 'am';
  const display = ((hour + 11) % 12) + 1;
  return minute > 0 ? `${display}:${String(minute).padStart(2, '0')} ${period}` : `${display} ${period}`;
}
