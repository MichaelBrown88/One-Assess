/**
 * Strict parser for the OFS hand-off body. Only whitelisted ONE ASSESS form fields survive;
 * enum values outside ONE ASSESS's option lists are dropped rather than stored.
 */

export type NoteRow = { label: string; value: string };
export type MetricRow = { field: string; label: string; value: string; unit: string; date: string };

export type HandoffStringField =
  | 'fullName' | 'email' | 'phone' | 'gender' | 'heightCm' | 'trainingFrequency'
  | 'activityLevel' | 'trainingHistory' | 'medicationsFlag' | 'medicationsNotes';

export type HandoffFormData = Partial<Record<HandoffStringField, string>> & {
  fullName: string;
  clientGoals?: string[];
};

export interface HandoffPayload {
  version: 1;
  contactId: string;
  consultationId: string;
  sourceUrl: string;
  coachEmail: string;
  formData: HandoffFormData;
  healthNotes: NoteRow[];
  consultationNotes: NoteRow[];
  metrics: MetricRow[];
}

/** Mirrors ASSESSMENT_OPTIONS in src/constants/assessment.ts (functions cannot import app code). */
export const ALLOWED_VALUES = {
  gender: ['male', 'female'],
  trainingFrequency: ['0', '1', '2', '3', '4', '5+'],
  activityLevel: ['sedentary', 'lightly-active', 'moderately-active', 'very-active', 'extremely-active'],
  trainingHistory: ['beginner', 'intermediate', 'advanced'],
  medicationsFlag: ['yes', 'no'],
  clientGoals: ['build-muscle', 'weight-loss', 'body-recomposition', 'build-strength', 'improve-fitness', 'general-health'],
} as const;

const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const MAX_FIELD_LENGTH = 200;
const MAX_NOTE_LENGTH = 2000;
const MAX_ROWS = 30;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;

type Result = { ok: true; value: HandoffPayload } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.length <= max ? t : undefined;
}

function rows<T>(v: unknown, parse: (row: unknown) => T | null): T[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > MAX_ROWS) return null;
  const out: T[] = [];
  for (const row of v) {
    const parsed = parse(row);
    if (!parsed) return null;
    out.push(parsed);
  }
  return out;
}

function noteRow(row: unknown): NoteRow | null {
  if (!isRecord(row)) return null;
  const label = text(row.label, MAX_FIELD_LENGTH);
  const value = text(row.value, MAX_NOTE_LENGTH);
  return label && value ? { label, value } : null;
}

function metricRow(row: unknown): MetricRow | null {
  if (!isRecord(row)) return null;
  const out = {
    field: text(row.field, MAX_FIELD_LENGTH),
    label: text(row.label, MAX_FIELD_LENGTH),
    value: text(row.value, MAX_FIELD_LENGTH),
    unit: typeof row.unit === 'string' ? row.unit.trim().slice(0, MAX_FIELD_LENGTH) : '',
    date: text(row.date, MAX_FIELD_LENGTH),
  };
  return out.field && out.label && out.value && out.date ? (out as MetricRow) : null;
}

function enumValue(key: keyof typeof ALLOWED_VALUES, v: unknown): string | undefined {
  const t = text(v, MAX_FIELD_LENGTH);
  return t && (ALLOWED_VALUES[key] as readonly string[]).includes(t) ? t : undefined;
}

function parseFormData(raw: unknown): HandoffFormData | null {
  if (!isRecord(raw)) return null;
  const fullName = typeof raw.fullName === 'string' ? raw.fullName.trim().replace(/\s+/g, ' ') : '';
  if (fullName.length < MIN_NAME_LENGTH || fullName.length > MAX_NAME_LENGTH) return null;
  const height = text(raw.heightCm, MAX_FIELD_LENGTH);
  const heightNumber = height ? Number(height) : NaN;
  const goals = Array.isArray(raw.clientGoals)
    ? [...new Set(raw.clientGoals.map((g) => enumValue('clientGoals', g)).filter((g): g is string => Boolean(g)))]
    : [];
  const candidate: HandoffFormData = {
    fullName,
    email: text(raw.email, MAX_FIELD_LENGTH)?.toLowerCase(),
    phone: text(raw.phone, MAX_FIELD_LENGTH),
    gender: enumValue('gender', raw.gender),
    heightCm: heightNumber >= MIN_HEIGHT_CM && heightNumber <= MAX_HEIGHT_CM ? String(heightNumber) : undefined,
    trainingFrequency: enumValue('trainingFrequency', raw.trainingFrequency),
    activityLevel: enumValue('activityLevel', raw.activityLevel),
    trainingHistory: enumValue('trainingHistory', raw.trainingHistory),
    medicationsFlag: enumValue('medicationsFlag', raw.medicationsFlag),
    medicationsNotes: text(raw.medicationsNotes, MAX_NOTE_LENGTH),
    ...(goals.length ? { clientGoals: goals } : {}),
  };
  return Object.fromEntries(Object.entries(candidate).filter(([, v]) => v !== undefined)) as HandoffFormData;
}

export function parseHandoffPayload(raw: unknown): Result {
  if (!isRecord(raw) || raw.version !== 1) return { ok: false, error: 'unsupported_version' };
  const contactId = typeof raw.contactId === 'string' && ID_PATTERN.test(raw.contactId) ? raw.contactId : null;
  const consultationId =
    typeof raw.consultationId === 'string' && ID_PATTERN.test(raw.consultationId) ? raw.consultationId : null;
  if (!contactId || !consultationId) return { ok: false, error: 'invalid_ids' };
  const sourceUrl = text(raw.sourceUrl, MAX_FIELD_LENGTH);
  if (!sourceUrl || !sourceUrl.startsWith('https://')) return { ok: false, error: 'invalid_source_url' };
  const coachEmail = text(raw.coachEmail, MAX_FIELD_LENGTH)?.toLowerCase();
  if (!coachEmail || !/^[^@\s]+@[^@\s]+$/.test(coachEmail)) return { ok: false, error: 'invalid_coach_email' };
  const formData = parseFormData(raw.formData);
  if (!formData) return { ok: false, error: 'invalid_client_name' };
  const healthNotes = rows(raw.healthNotes, noteRow);
  const consultationNotes = rows(raw.consultationNotes, noteRow);
  const metrics = rows(raw.metrics, metricRow);
  if (!healthNotes || !consultationNotes || !metrics) return { ok: false, error: 'invalid_rows' };
  return {
    ok: true,
    value: { version: 1, contactId, consultationId, sourceUrl, coachEmail, formData, healthNotes, consultationNotes, metrics },
  };
}
