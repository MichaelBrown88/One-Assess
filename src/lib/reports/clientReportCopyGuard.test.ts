import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildClientReportModel } from './buildClientReportModel';
import { CLIENT_COPY_FORBIDDEN } from './sanitizeClientReportCopy';
import { SAMPLE_PREVIEW_FORM, SAMPLE_PREVIEW_SCORES } from '@/constants/sampleClientReport';

const SRC = resolve(process.cwd(), 'src');

const CLIENT_REPORT_SOURCES = [
  'components/reports',
  'lib/reports',
  'lib/posture',
  'constants/clientReport.ts',
  'constants/clientPlanCopy.ts',
  'constants/clientPillarSummaryCopy.ts',
  'constants/postureFeedbackLibrary.ts',
  'pages/PublicReportViewer.tsx',
];

function sourceFiles(rel: string): string[] {
  const abs = join(SRC, rel);
  if (statSync(abs).isFile()) return [abs];
  return readdirSync(abs).flatMap((name) => sourceFiles(join(rel, name)));
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

describe('client report copy guard', () => {
  it('never ships an em dash in client report code or copy', () => {
    const files = CLIENT_REPORT_SOURCES.flatMap(sourceFiles).filter(
      (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f),
    );
    const offenders = files.flatMap((file) =>
      withoutComments(readFileSync(file, 'utf8'))
        .split('\n')
        .filter((line) => line.includes('\u2014'))
        .map((line) => `${file.replace(SRC, 'src')}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });

  it('builds a real report with no em dashes or banned wording anywhere', () => {
    const model = buildClientReportModel({
      scores: SAMPLE_PREVIEW_SCORES,
      formData: SAMPLE_PREVIEW_FORM,
      goals: SAMPLE_PREVIEW_FORM.clientGoals,
      gapAnalysisData: [],
      clientName: 'Sam',
      reportDate: 'Sep 8, 2026',
    });
    for (const text of collectStrings(model)) {
      expect(text, text).not.toContain('\u2014');
      expect(text, text).not.toMatch(CLIENT_COPY_FORBIDDEN);
      expect(text, text).not.toMatch(/everfit/i);
    }
  });

  it('includes plan SMART goals without Everfit branding', () => {
    const model = buildClientReportModel({
      scores: SAMPLE_PREVIEW_SCORES,
      formData: SAMPLE_PREVIEW_FORM,
      goals: SAMPLE_PREVIEW_FORM.clientGoals,
      gapAnalysisData: [],
      clientName: 'Sam',
      reportDate: 'Sep 8, 2026',
    });
    expect(model.planSmartGoals.length).toBeGreaterThan(0);
    for (const goal of model.planSmartGoals) {
      expect(goal.smartLine).not.toContain('\u2014');
      expect(goal.smartLine.toLowerCase()).not.toContain('everfit');
    }
  });
});
