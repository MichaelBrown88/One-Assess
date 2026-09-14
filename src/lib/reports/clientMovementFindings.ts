/**
 * Structured movement-screen findings for the client AXIS report (compact, scannable).
 */

import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory } from '@/lib/scoring';
import { ASSESSMENT_LABELS, ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

const P4_LABELS = ASSESSMENT_LABELS.P4 as Record<string, string>;

export type MovementFindingTone = 'good' | 'concern' | 'critical';
type AssessmentOptionKey = keyof typeof ASSESSMENT_OPTIONS;

export interface ClientMovementFindingRow {
  label: string;
  value: string;
  tone: MovementFindingTone;
  optionKey?: AssessmentOptionKey;
  raw?: string;
  name: string;
}

export interface ClientMovementFindingGroup {
  id: 'ohs' | 'hinge' | 'lunge';
  title: string;
  tone: MovementFindingTone;
  rows: ClientMovementFindingRow[];
}

export interface ClientMovementFindingsModel {
  groups: ClientMovementFindingGroup[];
  hasPostureScan: boolean;
}

/** Form field paired with the ASSESSMENT_OPTIONS key that holds its labels
 *  (left/right lunge fields share the same option list). */

function optionLabel(field: AssessmentOptionKey, value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const options = ASSESSMENT_OPTIONS[field];
  if (!Array.isArray(options)) return null;
  const match = options.find((o) => o.value === value);
  return match?.label ?? value.replace(/-/g, ' ');
}

function isConcernValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('fair') ||
    v.includes('limited') ||
    v.includes('compensated') ||
    v.includes('moderate') ||
    v.includes('excessive') ||
    v.includes('quarter') ||
    v.includes('minimal') ||
    v.includes('no-depth')
  );
}

function isCriticalValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('poor') ||
    v.includes('severe') ||
    v.includes('valgus') ||
    v.includes('varus') ||
    v.includes('caves') ||
    v === 'yes' ||
    v.includes('high')
  );
}

function isGoodValue(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('excellent') ||
    v.includes('good') ||
    v.includes('full') ||
    v.includes('stable') ||
    v.includes('upright') ||
    v.includes('tracks') ||
    v.includes('neutral') ||
    v === 'none' ||
    v === 'no'
  );
}

export function toneForMovementValue(value: string): MovementFindingTone {
  if (isCriticalValue(value)) return 'critical';
  if (isConcernValue(value)) return 'concern';
  if (isGoodValue(value)) return 'good';
  return 'concern';
}

function worstTone(tones: MovementFindingTone[]): MovementFindingTone {
  if (tones.some((t) => t === 'critical')) return 'critical';
  if (tones.some((t) => t === 'concern')) return 'concern';
  return 'good';
}

/** Form field paired with the ASSESSMENT_OPTIONS key that holds its labels
 *  (left/right lunge fields share the same option list). */
interface MovementFieldSpec {
  field: keyof FormData & string;
  optionKey: AssessmentOptionKey;
}

const MOVEMENT_OHS_FIELDS: MovementFieldSpec[] = [
  { field: 'ohsSquatDepth', optionKey: 'ohsSquatDepth' },
  { field: 'ohsTorsoLean', optionKey: 'ohsTorsoLean' },
  { field: 'ohsShoulderMobility', optionKey: 'ohsShoulderMobility' },
  { field: 'ohsKneeAlignment', optionKey: 'ohsKneeAlignment' },
  { field: 'ohsHipShift', optionKey: 'ohsHipShift' },
  { field: 'ohsFeetPosition', optionKey: 'ohsFeetPosition' },
];

const MOVEMENT_HINGE_FIELDS: MovementFieldSpec[] = [
  { field: 'hingeDepth', optionKey: 'hingeDepth' },
  { field: 'hingeBackRounding', optionKey: 'hingeBackRounding' },
];

const MOVEMENT_LUNGE_FIELDS: MovementFieldSpec[] = [
  { field: 'lungeLeftBalance', optionKey: 'lungeBalance' },
  { field: 'lungeRightBalance', optionKey: 'lungeBalance' },
  { field: 'lungeLeftKneeAlignment', optionKey: 'lungeKneeAlignment' },
  { field: 'lungeRightKneeAlignment', optionKey: 'lungeKneeAlignment' },
];

function findingRowName(
  title: string,
  field: string,
  label: string,
): string {
  if (field.includes('Left')) return `${title} · Left ${label.toLowerCase()}`;
  if (field.includes('Right')) return `${title} · Right ${label.toLowerCase()}`;
  return `${title} · ${label}`;
}

function buildGroup(
  id: ClientMovementFindingGroup['id'],
  title: string,
  fields: MovementFieldSpec[],
  formData: FormData,
): ClientMovementFindingGroup | null {
  const rows: ClientMovementFindingRow[] = [];
  for (const { field, optionKey } of fields) {
    const raw = formData[field];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const label = P4_LABELS[field] ?? field;
    const value = optionLabel(optionKey, raw);
    if (!value) continue;
    rows.push({
      label,
      value,
      tone: toneForMovementValue(raw),
      optionKey,
      raw,
      name: findingRowName(title, field, label),
    });
  }
  if (rows.length === 0) return null;
  return {
    id,
    title,
    tone: worstTone(rows.map((r) => r.tone)),
    rows,
  };
}

export function buildMovementFindings(
  formData: FormData | undefined,
  category: ScoreCategory | undefined,
): ClientMovementFindingsModel {
  if (!formData) {
    return { groups: [], hasPostureScan: false };
  }

  const groups: ClientMovementFindingGroup[] = [];
  const ohs = buildGroup('ohs', 'Overhead squat', MOVEMENT_OHS_FIELDS, formData);
  const hinge = buildGroup('hinge', 'Hip hinge', MOVEMENT_HINGE_FIELDS, formData);
  const lunge = buildGroup('lunge', 'Split squat / lunge', MOVEMENT_LUNGE_FIELDS, formData);
  if (ohs) groups.push(ohs);
  if (hinge) groups.push(hinge);
  if (lunge) groups.push(lunge);

  const hasPostureScan =
    Boolean(formData.postureAiResults) && Object.keys(formData.postureAiResults ?? {}).length > 0;

  if (groups.length === 0 && category) {
    const rows = (category.weaknesses ?? []).slice(0, 4).map((line) => ({
      label: 'Focus',
      value: line,
      tone: 'concern' as const,
      name: line,
    }));
    if (rows.length > 0) {
      groups.push({
        id: 'ohs',
        title: 'Focus areas',
        tone: worstTone(rows.map((r) => r.tone)),
        rows,
      });
    }
  }

  return { groups, hasPostureScan };
}

/** Concern and critical cues only — the client page should not list every observed field. */
export function movementWorkOns(model: ClientMovementFindingsModel): Array<{
  pattern: string;
  detail: string;
  tone: MovementFindingTone;
}> {
  return model.groups
    .map((group) => {
      const flags = group.rows.filter((r) => r.tone !== 'good');
      if (flags.length === 0) return null;
      return {
        pattern: group.title,
        detail: flags.map((r) => `${r.label}: ${r.value}`).join(' · '),
        tone: worstTone(flags.map((r) => r.tone)),
      };
    })
    .filter((row): row is { pattern: string; detail: string; tone: MovementFindingTone } => row != null);
}

/** One row per marked pattern: coach grade now, one grade better in 12 weeks. */
export function movementProgressionRows(
  model: ClientMovementFindingsModel,
): Array<{ name: string; current: string; twelveWeeks: string }> {
  return model.groups.map((group) => ({
    name: group.title,
    current: gradeForTone(group.tone),
    twelveWeeks: gradeForTone(nextTone(group.tone)),
  }));
}

function gradeForTone(tone: MovementFindingTone): string {
  if (tone === 'critical') return CLIENT_REPORT_COPY.v2MovementGradeLimited;
  if (tone === 'concern') return CLIENT_REPORT_COPY.v2MovementGradeFair;
  return CLIENT_REPORT_COPY.v2MovementGradeStrong;
}

function nextTone(tone: MovementFindingTone): MovementFindingTone {
  if (tone === 'critical') return 'concern';
  return 'good';
}
