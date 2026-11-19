/**
 * Pure fill-blanks merge of an OFS hand-off into an assessment draft.
 * Coach-entered values always win; the hand-off only fills what is still blank.
 */
import type { HandoffPayload } from './payload';

/** Mirrors buildStudioBaselinePlan() in src/lib/types/assessmentPlan.ts. */
export const STUDIO_BASELINE_PLAN = {
  templateId: 'full_holistic',
  includedPhaseIds: ['P0', 'P1', 'P3', 'P4', 'P5', 'P2', 'P7'],
};

/** Mirrors the required fields of src/lib/phases/phaseP0.ts and phaseP1.ts. */
export const REQUIRED_BY_PHASE: ReadonlyArray<{ id: string; fields: readonly string[] }> = [
  { id: 'P0', fields: ['fullName', 'dateOfBirth', 'gender', 'trainingHistory', 'recentActivity'] },
  { id: 'P1', fields: ['activityLevel'] },
];
/** First physical step of the studio order (STUDIO_PHYSICAL_PHASE_ORDER). */
const FIRST_PHYSICAL_PHASE = 'P3';

export const OFS_NOTES_MARKER = 'From consultation (OFS):';

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
  /** `externalImport`, or `externalImportOfs` when another provider (e.g. Everfit) already owns it. */
  importKey: 'externalImport' | 'externalImportOfs';
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
  return phase?.id ?? FIRST_PHYSICAL_PHASE;
}

function healthBlock(payload: HandoffPayload): string | null {
  if (!payload.healthNotes.length) return null;
  return [OFS_NOTES_MARKER, ...payload.healthNotes.map((n) => `- ${n.label}: ${n.value}`)].join('\n');
}

export function mergeHandoffIntoDraft(existing: DraftLike, payload: HandoffPayload, nowIso: string): MergedDraft {
  const formData: Record<string, unknown> = { ...(existing?.formData ?? {}) };
  const fill = (key: string, value: unknown) => {
    if (!isBlank(value) && isBlank(formData[key])) formData[key] = value;
  };

  for (const [key, value] of Object.entries(payload.formData)) fill(key, value);
  fill('consultationNotes', payload.consultationNotes);
  fill('assessmentPlan', STUDIO_BASELINE_PLAN);
  fill('assessmentIntakeMode', 'studio');

  const block = healthBlock(payload);
  const notes = typeof formData.parqNotes === 'string' ? formData.parqNotes.trim() : '';
  if (block && !notes.includes(OFS_NOTES_MARKER)) {
    formData.parqNotes = notes ? `${notes}\n\n${block}` : block;
  }

  const hasPosition =
    (typeof existing?.activePhaseId === 'string' && existing.activePhaseId !== '') ||
    typeof existing?.activePhaseIdx === 'number';

  const current = existing?.externalImport;
  const otherProvider =
    typeof current === 'object' && current !== null && (current as { provider?: unknown }).provider !== 'OFS';

  return {
    formData,
    importKey: otherProvider ? 'externalImportOfs' : 'externalImport',
    ...(hasPosition ? {} : { activePhaseId: firstIncompletePhase(formData), activePhaseIdx: 0 }),
    externalImport: {
      provider: 'OFS',
      clientId: payload.contactId,
      consultationId: payload.consultationId,
      sourceUrl: payload.sourceUrl,
      importedAt: nowIso,
      metrics: payload.metrics,
    },
  };
}
