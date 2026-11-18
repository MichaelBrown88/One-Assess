import { describe, expect, it } from 'vitest';
import { POSTURE_FEEDBACK_LIBRARY } from '@/constants/postureFeedbackLibrary';
import { withCurrentPostureCopy } from '@/lib/posture/buildStructuredPostureFindings';
import { aggregatePostureFindings } from '@/lib/posture/aggregatePostureInsights';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';
import type { PostureFindingRecord } from '@/lib/types/postureFindings';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';

const CLINICAL_TERMS =
  /anterior|posterior|pelvic|pelvis|valgus|varus|pronation|supination|thoracic|lumbar|lumbopelvic|cervical|scapula|flexor|glute med|tibialis|unilateral|bilateral|clinical|kyphosis|lordosis|abductor|adductor|asymmetr|deviation|girdle/i;

const legacyFinding: PostureFindingRecord = {
  id: 'anterior_pelvic_tilt',
  view: 'side-right',
  measuredValue: 13,
  unit: 'degrees',
  severity: 'moderate',
  name: 'Anterior Pelvic Tilt',
  whatItMeans: 'A moderate anterior tilt can pair with an arched lower back in standing.',
  whatWellDo: 'A structured lumbopelvic programme before heavy squats and hinges.',
  priority: 'high',
};

describe('posture copy for clients', () => {
  it('keeps every name, impact line and tier free of clinical terms', () => {
    for (const def of Object.values(POSTURE_FEEDBACK_LIBRARY)) {
      const lines = [
        def.name,
        def.impact,
        ...Object.values(def.feedback).flatMap((t) => [t.what_it_means, t.what_well_do]),
      ];
      for (const line of lines) {
        expect(line, `${def.id}: ${line}`).not.toMatch(CLINICAL_TERMS);
        expect(line, `${def.id}: ${line}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
      }
    }
  });

  it('explains the cause and fix for every finding in plain words, with 2 or 3 moves', () => {
    for (const def of Object.values(POSTURE_FEEDBACK_LIBRARY)) {
      const { cause, strengthen, loosen, moves } = def.fix;
      expect(moves.length, def.id).toBeGreaterThanOrEqual(2);
      expect(moves.length, def.id).toBeLessThanOrEqual(3);
      const lines = [cause, strengthen, loosen, ...moves.flatMap((m) => [m.name, m.how])];
      for (const line of lines) {
        expect(line.trim(), def.id).not.toBe('');
        expect(line, `${def.id}: ${line}`).not.toMatch(CLINICAL_TERMS);
        expect(line, `${def.id}: ${line}`).not.toMatch(/\d+\s*(sets?|reps?)\b|\bx\s*\d+/i);
      }
    }
  });

  it('re-reads saved findings so old reports show the current wording', () => {
    const current = withCurrentPostureCopy(legacyFinding);
    expect(current.name).toBe('Arched lower back');
    expect(current.whatItMeans).toBe(POSTURE_FEEDBACK_LIBRARY.anterior_pelvic_tilt.feedback.moderate.what_it_means);
    expect(current.whatWellDo).not.toMatch(CLINICAL_TERMS);
    expect(current.measuredValue).toBe(13);
  });

  it('leaves aligned or unknown findings untouched', () => {
    const unknown = { ...legacyFinding, id: 'not_in_library' };
    expect(withCurrentPostureCopy(unknown)).toEqual(unknown);
    const aligned = { ...legacyFinding, severity: 'aligned' as const };
    expect(withCurrentPostureCopy(aligned)).toEqual(aligned);
  });

  it('aggregates saved findings with the current copy', () => {
    const results = {
      'side-right': { structuredFindings: [legacyFinding] },
    } as unknown as Partial<Record<'side-right', PostureAnalysisResult>>;
    // Only structuredFindings is read by the aggregator; the rest of the analysis is irrelevant here.
    const [finding] = aggregatePostureFindings(results);
    expect(finding?.name).toBe('Arched lower back');
  });
});
