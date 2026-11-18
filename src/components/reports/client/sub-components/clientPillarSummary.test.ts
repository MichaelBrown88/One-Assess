import { describe, expect, it } from 'vitest';
import { buildClientPillarSummary } from './clientPillarSummary';
import { SAMPLE_PREVIEW_SCORES } from '@/constants/sampleClientReport';
import { PILLAR_DETAIL_COPY } from '@/constants/clientPillarSummaryCopy';
import { CLIENT_COPY_FORBIDDEN } from '@/lib/reports/sanitizeClientReportCopy';
import type { ScoreCategory } from '@/lib/scoring';

const SCORING_LABEL_LEAKS =
  /identified as|bottleneck|limiting factor|structural priority|optimization|refinement|>\s*\d+\s*bpm|systemic|skeletal|visceral fat level/i;

function category(details: ScoreCategory['details'], score = 60): ScoreCategory {
  return {
    id: 'bodyComp',
    title: 'Body Composition',
    score,
    assessed: true,
    details,
    strengths: ['Strong skeletal muscle foundation'],
    weaknesses: ['Visceral Fat identified as a priority area'],
  };
}

describe('buildClientPillarSummary', () => {
  it('never repeats coach scoring labels for a real assessment', () => {
    for (const cat of SAMPLE_PREVIEW_SCORES.categories) {
      const text = buildClientPillarSummary(cat, null);
      expect(text, `${cat.id}: ${text}`).not.toMatch(SCORING_LABEL_LEAKS);
      expect(text, `${cat.id}: ${text}`).not.toMatch(CLIENT_COPY_FORBIDDEN);
      expect(text.length).toBeGreaterThan(20);
    }
  });

  it('pairs the best result with the weakest one and says why it matters', () => {
    const text = buildClientPillarSummary(
      category([
        { id: 'smm', label: 'Skeletal Muscle Mass', value: 31.5, score: 82 },
        { id: 'visceral', label: 'Visceral Fat Level', value: 11, score: 40 },
        { id: 'bf', label: 'Body Fat %', value: 31.2, score: 55 },
      ]),
      null,
    );
    expect(text).toBe(`${PILLAR_DETAIL_COPY.smm.strong} ${PILLAR_DETAIL_COPY.visceral.focus}`);
  });

  it('uses the gentler line when the weakest result is only a little off', () => {
    const text = buildClientPillarSummary(
      category([{ id: 'rhr', label: 'Resting HR', value: 68, score: 62 }]),
      null,
    );
    expect(text).toBe(PILLAR_DETAIL_COPY.rhr.nudge);
  });

  it('ignores metrics that were not captured', () => {
    const text = buildClientPillarSummary(
      category([
        { id: 'visceral', label: 'Visceral Fat Level', value: '-', score: 0 },
        { id: 'bf', label: 'Body Fat %', value: 18, score: 85 },
      ], 85),
      null,
    );
    expect(text).toBe(`${PILLAR_DETAIL_COPY.bf.strong} Keep doing what you're doing.`);
  });
});
