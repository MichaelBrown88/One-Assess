/** Capture limits catch unit mistakes and extra digits before they reach a report. */
const LIMITS: Record<string, readonly [number, number, string]> = {
  pushupsOneMinuteReps: [0, 150, 'push-ups in one minute'],
  squatsOneMinuteReps: [0, 150, 'squats in one minute'],
  singleLegStandLeftReps: [0, 60, 'left-leg repetitions in 30 seconds'],
  singleLegStandRightReps: [0, 60, 'right-leg repetitions in 30 seconds'],
  plankDurationSeconds: [0, 600, 'plank seconds'],
  kneeToWallLeftCm: [0, 30, 'left knee-to-wall distance in cm'],
  kneeToWallRightCm: [0, 30, 'right knee-to-wall distance in cm'],
  gripLeftKg: [0, 150, 'left grip in kg'],
  gripRightKg: [0, 150, 'right grip in kg'],
  cardioRestingHr: [25, 180, 'resting heart rate in bpm'],
  cardioPeakHr: [30, 240, 'end-of-walk heart rate in bpm'],
  cardioPost1MinHr: [25, 240, 'recovery heart rate in bpm'],
  heightCm: [80, 250, 'height in cm'],
  inbodyWeightKg: [20, 400, 'weight in kg'],
  inbodyBodyFatPct: [2, 70, 'body fat percentage'],
  skeletalMuscleMassKg: [5, 120, 'muscle mass in kg'],
  waistHipRatio: [0.4, 2, 'waist-to-hip ratio'],
  visceralFatLevel: [1, 60, 'visceral fat level'],
  stepsPerDay: [0, 100000, 'daily steps'],
  caffeineCupsPerDay: [0, 30, 'cups per day'],
};

export function numericIssue(id: string, value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const limit = LIMITS[id] ?? (/^(shoulders|chest|armLeft|armRight|waist|hips|thighLeft|thighRight|calfLeft|calfRight)Cm$/.test(id)
    ? [5, 250, 'measurement in cm'] as const : null);
  if (!limit) return null;
  const number = Number(value);
  const [min, max, label] = limit;
  if (!Number.isFinite(number) || number < min || number > max) {
    return `Check ${label}: enter a number from ${min} to ${max}.`;
  }
  if ((id.endsWith('Reps') || id.startsWith('cardio') || id === 'stepsPerDay') && !Number.isInteger(number)) {
    return `Check ${label}: enter a whole number.`;
  }
  return null;
}

export function numericIssues(form: object): string[] {
  return Object.entries(form).flatMap(([id, value]) => {
    const issue = numericIssue(id, value);
    return issue ? [issue] : [];
  });
}

/** Broadly possible readings may still be a unit mistake. Warn without blocking a coach's confirmed value. */
export function numericWarning(id: string, value: unknown): string | null {
  if (value === '' || value == null || numericIssue(id, value)) return null;
  const n = Number(value);
  const typical: Record<string, readonly [number, number]> = {
    cardioRestingHr: [35, 110], cardioPeakHr: [60, 210], cardioPost1MinHr: [35, 190],
    gripLeftKg: [5, 90], gripRightKg: [5, 90], inbodyBodyFatPct: [5, 60],
    plankDurationSeconds: [0, 180], pushupsOneMinuteReps: [0, 100], singleLegStandLeftReps: [0, 30], singleLegStandRightReps: [0, 30],
  };
  const range = typical[id];
  return range && (n < range[0] || n > range[1]) ? `Check this reading: ${value}. Confirm the number and units before continuing.` : null;
}
