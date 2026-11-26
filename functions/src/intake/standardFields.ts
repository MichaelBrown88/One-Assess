/**
 * Standard intake fields, version 1 — shared by the public intake link and the CRM API.
 * Only these ONE ASSESS form fields are accepted; enum values outside ONE ASSESS's option
 * lists are dropped rather than stored. Option lists mirror ASSESSMENT_OPTIONS in
 * src/constants/assessment.ts (functions cannot import app code).
 */

export const INTAKE_FIELDS_VERSION = 1;

export type NoteRow = { label: string; value: string };
export type MetricRow = { field: string; label: string; value: string; unit: string; date: string };

const YES_NO = ['yes', 'no'] as const;

export const ENUM_FIELDS = {
  sleepHours: ['under-5', '5-6', '6-7', '7-9', 'over-9'],
  sleepRegularity: ['regular', 'varies-1h', 'varies-more'],
  stressFrequency: ['rarely', 'sometimes', 'often', 'always'],
  stressCoping: ['well', 'mostly', 'struggling', 'not-coping'],
  exerciseMinutesWeek: ['0', 'under-60', '60-149', '150-299', '300-plus'],
  strengthDaysWeek: ['0', '1', '2', '3-plus'],
  proteinMeals: ['rarely', 'some', 'most', 'every'],
  fruitVegPortions: ['0-1', '2-3', '4', '5-plus'],
  takeawaysWeek: ['0-1', '2-3', '4-6', '7-plus'],
  gender: ['male', 'female'],
  trainingHistory: ['beginner', 'intermediate', 'advanced'],
  recentActivity: ['currently-training', 'stopped-3-months', 'stopped-3-to-6-months', 'stopped-6-months'],
  activityLevel: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'],
  sleepArchetype: ['excellent', 'good', 'fair', 'poor'],
  stressLevel: ['very-low', 'low', 'moderate', 'high'],
  nutritionHabits: ['excellent', 'good', 'fair', 'poor'],
  hydrationHabits: ['excellent', 'good', 'fair', 'poor'],
  trainingFrequency: ['0', '1', '2', '3', '4', '5+'],
  medicationsFlag: YES_NO,
  parq1: YES_NO, parq2: YES_NO, parq3: YES_NO, parq4: YES_NO, parq5: YES_NO,
  parq6: YES_NO, parq7: YES_NO, parq12: YES_NO, parq13: YES_NO,
} as const satisfies Record<string, readonly string[]>;

export const CLIENT_GOALS = ['build-muscle', 'weight-loss', 'body-recomposition', 'build-strength', 'improve-fitness', 'general-health'] as const;
export const PARQ_KEYS = ['parq1', 'parq2', 'parq3', 'parq4', 'parq5', 'parq6', 'parq7', 'parq12', 'parq13'] as const;

const TEXT_FIELDS = ['fullName', 'email', 'phone', 'medicationsNotes', 'lastCaffeineIntake'] as const;
const NUMBER_FIELDS = {
  heightCm: [100, 250],
  stepsPerDay: [0, 60000],
  caffeineCupsPerDay: [0, 20],
} as const;
const DATE_FIELDS = ['dateOfBirth', 'goalDeadline'] as const;

type EnumField = keyof typeof ENUM_FIELDS;
type StringField = EnumField | (typeof TEXT_FIELDS)[number] | keyof typeof NUMBER_FIELDS | (typeof DATE_FIELDS)[number];

export type IntakeFormData = Partial<Record<StringField, string>> & { clientGoals?: string[] };

/** Every key the standard intake accepts (used as the link's allowed keys). */
export const STANDARD_INTAKE_KEYS: readonly string[] = [
  ...TEXT_FIELDS.filter(key => key !== 'medicationsNotes'), ...Object.keys(NUMBER_FIELDS), 'dateOfBirth', ...Object.keys(ENUM_FIELDS).filter(key => !key.startsWith('parq') && key !== 'medicationsFlag'), 'clientGoals',
];

export const LIMITS = {
  field: 200,
  note: 2000,
  rows: 30,
  nameMin: 2,
  nameMax: 80,
  bodyBytes: 32 * 1024,
} as const;

const MIN_AGE_YEARS = 10;
const MAX_AGE_YEARS = 100;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function text(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
}

export function normalizeName(v: unknown): string | null {
  const name = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
  return name.length >= LIMITS.nameMin && name.length <= LIMITS.nameMax ? name : null;
}

export function normalizeEmail(v: unknown): string | undefined {
  const t = text(v, LIMITS.field)?.toLowerCase();
  return t && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : undefined;
}

function isoDate(v: unknown, field: (typeof DATE_FIELDS)[number], now: Date): string | undefined {
  const t = text(v, LIMITS.field);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(`${t}T00:00:00Z`))) return undefined;
  if (field === 'dateOfBirth') {
    const age = now.getUTCFullYear() - Number(t.slice(0, 4));
    if (age < MIN_AGE_YEARS || age > MAX_AGE_YEARS) return undefined;
  }
  return t;
}

/** Keep only known fields with valid values. Never throws; returns {} for junk. */
export function sanitizeIntakeFields(raw: unknown, now: Date = new Date()): IntakeFormData {
  if (!isRecord(raw)) return {};
  const out: IntakeFormData = {};
  const name = normalizeName(raw.fullName);
  if (name) out.fullName = name;
  const email = normalizeEmail(raw.email);
  if (email) out.email = email;
  const phone = text(raw.phone, LIMITS.field);
  if (phone) out.phone = phone;
  const caffeineTime = text(raw.lastCaffeineIntake, 5);
  if (caffeineTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(caffeineTime)) out.lastCaffeineIntake = caffeineTime;
  const meds = text(raw.medicationsNotes, LIMITS.note);
  if (meds) out.medicationsNotes = meds;
  for (const [field, [min, max]] of Object.entries(NUMBER_FIELDS) as [keyof typeof NUMBER_FIELDS, readonly [number, number]][]) {
    const t = text(raw[field], LIMITS.field);
    const n = t === undefined ? NaN : Number(t);
    if (Number.isFinite(n) && n >= min && n <= max) out[field] = String(n);
  }
  for (const field of DATE_FIELDS) {
    const d = isoDate(raw[field], field, now);
    if (d) out[field] = d;
  }
  for (const [field, allowed] of Object.entries(ENUM_FIELDS) as [EnumField, readonly string[]][]) {
    const t = text(raw[field], LIMITS.field);
    if (t && allowed.includes(t)) out[field] = t;
  }
  const goalsRaw: unknown[] = Array.isArray(raw.clientGoals)
    ? raw.clientGoals
    : typeof raw.clientGoals === 'string' ? raw.clientGoals.split(',') : [];
  const goals = [...new Set(goalsRaw
    .map((g) => (typeof g === 'string' ? g.trim() : ''))
    .filter((g) => (CLIENT_GOALS as readonly string[]).includes(g)))];
  if (goals.length) out.clientGoals = goals;
  return out;
}

export function parseRows<T>(v: unknown, parse: (row: unknown) => T | null): T[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > LIMITS.rows) return null;
  const out: T[] = [];
  for (const row of v) {
    const parsed = parse(row);
    if (!parsed) return null;
    out.push(parsed);
  }
  return out;
}

export function noteRow(row: unknown): NoteRow | null {
  if (!isRecord(row)) return null;
  const label = text(row.label, LIMITS.field);
  const value = text(row.value, LIMITS.note);
  return label && value ? { label, value } : null;
}

export function metricRow(row: unknown): MetricRow | null {
  if (!isRecord(row)) return null;
  const field = text(row.field, LIMITS.field);
  const label = text(row.label, LIMITS.field);
  const value = text(row.value, LIMITS.field);
  const date = text(row.date, LIMITS.field);
  const unit = typeof row.unit === 'string' ? row.unit.trim().slice(0, LIMITS.field) : '';
  return field && label && value && date ? { field, label, value, unit, date } : null;
}
