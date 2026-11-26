/**
 * Pure fill-blanks merge of a standard intake into an assessment draft.
 * Coach-entered values always win; an intake only fills what is still blank.
 */
import { PARQ_KEYS, type IntakeFormData, type MetricRow, type NoteRow } from './standardFields';

export type StandardIntake = {
  /** 'intake-link' or the CRM's name (e.g. 'OFS'). */
  provider: string;
  externalClientId?: string;
  sourceUrl?: string;
  formData: IntakeFormData;
  healthNotes: NoteRow[];
  consultationNotes: NoteRow[];
  metrics: MetricRow[];
};

/** Mirrors buildStudioBaselinePlan() in src/lib/types/assessmentPlan.ts. */
export const STUDIO_BASELINE_PLAN = {
  templateId: 'full_holistic',
  includedPhaseIds: ['P0', 'P1', 'P3', 'P4', 'P5', 'P2', 'P7'],
};

/** Mirrors the required fields of src/lib/phases/phaseP0.ts and phaseP1.ts. */
export const REQUIRED_BY_PHASE: ReadonlyArray<{ id: string; fields: readonly string[] }> = [
  { id: 'P0', fields: ['fullName', 'dateOfBirth', 'gender', 'trainingHistory', 'recentActivity'] },
  { id: 'P1', fields: ['activityLevel', 'clientGoals'] },
];
/** First physical step of the studio order (STUDIO_PHYSICAL_PHASE_ORDER). */
const FIRST_PHYSICAL_PHASE = 'P3';

export const NOTES_MARKER = (provider: string) => `From ${provider}:`;

export type DraftLike = {
  formData?: Record<string, unknown>;
  activePhaseId?: string | null;
  activePhaseIdx?: number | null;
  externalImport?: unknown;
} | null;

export type MergedDraft = {
  formData: Record<string, unknown>;
  activePhaseId?: string;
  activePhaseIdx?: number;
  /** Field path for the import record: `externalImport`, or `externalImports.{provider}` when another provider owns it. */
  importPath: string;
  externalImport: Record<string, unknown>;
};

export function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

export function firstIncompletePhase(formData: Record<string, unknown>): string {
  const phase = REQUIRED_BY_PHASE.find(({ fields }) => fields.some((field) => isBlank(formData[field])));
  if (phase) return phase.id;
  const answered = (fields: string[]) => fields.every(field => !isBlank(formData[field]));
  const habits = ['sleepHours', 'sleepRegularity', 'stressFrequency', 'stressCoping', 'exerciseMinutesWeek', 'strengthDaysWeek', 'proteinMeals', 'fruitVegPortions', 'takeawaysWeek'];
  const legacy = ['sleepArchetype', 'stressLevel', 'nutritionHabits', 'hydrationHabits'];
  return answered(habits) || answered(legacy) ? FIRST_PHYSICAL_PHASE : 'P1';
}

function importPathFor(existing: DraftLike, provider: string): string {
  const current = existing?.externalImport;
  const owner = typeof current === 'object' && current !== null ? (current as { provider?: unknown }).provider : undefined;
  if (owner === undefined || owner === provider) return 'externalImport';
  return `externalImports.${provider.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

export function mergeIntakeIntoDraft(existing: DraftLike, intake: StandardIntake, nowIso: string): MergedDraft {
  const formData: Record<string, unknown> = { ...(existing?.formData ?? {}) };
  const fill = (key: string, value: unknown) => {
    if (!isBlank(value) && isBlank(formData[key])) formData[key] = value;
  };

  const before = PARQ_KEYS.filter((k) => !isBlank(formData[k])).length;
  for (const [key, value] of Object.entries(intake.formData)) fill(key, value);
  if (PARQ_KEYS.filter((k) => !isBlank(formData[k])).length > before) {
    // Self-reported answers: the coach confirms them in the studio (parqConfirmedAt).
    fill('parqSource', 'client');
  }
  fill('consultationNotes', intake.consultationNotes);
  fill('assessmentPlan', STUDIO_BASELINE_PLAN);
  fill('assessmentIntakeMode', 'studio');

  if (intake.healthNotes.length) {
    const marker = NOTES_MARKER(intake.provider);
    const notes = typeof formData.parqNotes === 'string' ? formData.parqNotes.trim() : '';
    if (!notes.includes(marker)) {
      const block = [marker, ...intake.healthNotes.map((n) => `- ${n.label}: ${n.value}`)].join('\n');
      formData.parqNotes = notes ? `${notes}\n\n${block}` : block;
    }
  }

  const hasPosition =
    (typeof existing?.activePhaseId === 'string' && existing.activePhaseId !== '') ||
    typeof existing?.activePhaseIdx === 'number';

  return {
    formData,
    ...(hasPosition ? {} : { activePhaseId: firstIncompletePhase(formData), activePhaseIdx: 0 }),
    importPath: importPathFor(existing, intake.provider),
    externalImport: {
      provider: intake.provider,
      ...(intake.externalClientId ? { externalClientId: intake.externalClientId } : {}),
      ...(intake.sourceUrl ? { sourceUrl: intake.sourceUrl } : {}),
      importedAt: nowIso,
      metrics: intake.metrics,
    },
  };
}
