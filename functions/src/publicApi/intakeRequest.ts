/**
 * Body of POST /api/v1/assessment-intakes → StandardIntake. Public contract:
 * docs/api/assessment-intakes.md. Unknown fields and values are dropped, never stored.
 */
import type { StandardIntake } from '../intake/mergeDraft';
import {
  INTAKE_FIELDS_VERSION, isRecord, LIMITS, metricRow, noteRow, normalizeEmail, normalizeName,
  parseRows, sanitizeIntakeFields, text,
} from '../intake/standardFields';

const PROVIDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,39}$/;
const EXTERNAL_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
/** Names that would impersonate a ONE ASSESS-internal source. */
const RESERVED_PROVIDERS = new Set(['intake-link', 'one-assess', 'oneassess']);

export type IntakeRequest = {
  intake: StandardIntake;
  clientName: string;
  coachEmail?: string;
};

export type ParseResult = { ok: true; value: IntakeRequest } | { ok: false; code: string; message: string };

const fail = (code: string, message: string): ParseResult => ({ ok: false, code, message });

export function parseIntakeRequest(raw: unknown, now: Date = new Date()): ParseResult {
  if (!isRecord(raw)) return fail('invalid_body', 'Body must be a JSON object.');
  const provider = typeof raw.provider === 'string' ? raw.provider.trim() : '';
  if (!PROVIDER_PATTERN.test(provider) || RESERVED_PROVIDERS.has(provider.toLowerCase())) {
    return fail('invalid_provider', 'provider is required: your system\'s name, 1–40 letters, digits, spaces, dots, dashes.');
  }
  let externalClientId: string | undefined;
  if (raw.externalClientId !== undefined) {
    if (typeof raw.externalClientId !== 'string' || !EXTERNAL_ID_PATTERN.test(raw.externalClientId)) {
      return fail('invalid_external_client_id', 'externalClientId must be 1–100 of A–Z a–z 0–9 . _ : -');
    }
    externalClientId = raw.externalClientId;
  }
  let sourceUrl: string | undefined;
  if (raw.sourceUrl !== undefined) {
    sourceUrl = text(raw.sourceUrl, LIMITS.field);
    if (!sourceUrl || !sourceUrl.startsWith('https://')) return fail('invalid_source_url', 'sourceUrl must be an https URL.');
  }

  const client = isRecord(raw.client) ? raw.client : null;
  const clientName = normalizeName(client?.fullName);
  if (!clientName) return fail('invalid_client_name', 'client.fullName is required (2–80 characters).');
  if (client?.email !== undefined && !normalizeEmail(client.email)) return fail('invalid_client_email', 'client.email is not a valid email address.');

  const fields = raw.fields === undefined ? {} : raw.fields;
  if (!isRecord(fields)) return fail('invalid_fields', 'fields must be an object.');
  if (fields.version !== undefined && fields.version !== INTAKE_FIELDS_VERSION) {
    return fail('unsupported_fields_version', `fields.version must be ${INTAKE_FIELDS_VERSION}.`);
  }

  const notes = raw.notes === undefined ? {} : raw.notes;
  if (!isRecord(notes)) return fail('invalid_notes', 'notes must be an object.');
  const healthNotes = parseRows(notes.health, noteRow);
  const consultationNotes = parseRows(notes.consultation, noteRow);
  const metrics = parseRows(raw.measurements, metricRow);
  if (!healthNotes || !consultationNotes) return fail('invalid_notes', `Each note needs a label and a value; at most ${LIMITS.rows} per list.`);
  if (!metrics) return fail('invalid_measurements', `Each measurement needs field, label, value and date; at most ${LIMITS.rows}.`);

  const coachEmail = raw.coachEmail === undefined ? undefined : normalizeEmail(raw.coachEmail);
  if (raw.coachEmail !== undefined && !coachEmail) return fail('invalid_coach_email', 'coachEmail is not a valid email address.');

  // client.* wins over the same keys inside fields.
  const formData = sanitizeIntakeFields({ ...fields, ...client, fullName: clientName }, now);
  return {
    ok: true,
    value: {
      clientName,
      ...(coachEmail ? { coachEmail } : {}),
      intake: {
        provider,
        ...(externalClientId ? { externalClientId } : {}),
        ...(sourceUrl ? { sourceUrl } : {}),
        formData,
        healthNotes,
        consultationNotes,
        metrics,
      },
    },
  };
}
