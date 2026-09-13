/**
 * Coach debrief copy for the cardio “is this good?” reference chart.
 * Bands live in `src/lib/cardio/cardioReference.ts`.
 */

export const CARDIO_REFERENCE_COPY = {
  trigger: 'Is this good?',
  title: 'How you compare',
  subtitle: (bracket: string) => `${bracket} — typical ranges`,
  footnote:
    'Resting HR and 1-minute recovery use published fitness bands. Walk heart rate is how hard this standard 3-minute incline walk was for you — a lower share of max means fitter. This is a fitness score, not lab VO₂ max.',
  yourValue: 'You',
  bands: {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
  },
  metrics: {
    rhr: {
      label: 'Resting heart rate',
      unit: 'bpm',
      hint: 'Lower is better',
    },
    peak: {
      label: 'Walk heart rate',
      unit: 'bpm',
      hint: 'Same walk for everyone — lower % of max is fitter',
    },
    hrr: {
      label: '1-minute recovery',
      unit: 'bpm drop',
      hint: 'Bigger drop is better',
    },
  },
  missing: 'Not recorded',
  percentOfMax: (pct: number) => `${pct}% of estimated max`,
  recoveryNeedsPeak: 'Enter peak heart rate first to see this client\'s drop.',
} as const;
