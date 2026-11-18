import { COMPARISON_CURRENT_FORM, COMPARISON_CURRENT_SCORES, COMPARISON_PREVIEW } from '@/constants/reportComparisonPreview';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ClientReportV2Layout } from './ClientReportV2Layout';
import { buildClientReportModel } from '@/lib/reports/buildClientReportModel';
import { SAMPLE_PREVIEW_FORM, SAMPLE_PREVIEW_SCORES, FEMALE_PREVIEW_FORM, FEMALE_PREVIEW_SCORES } from '@/constants/sampleClientReport';
import { formatProgressionChange } from '@/lib/reports/formatProgressionChange';

function example(female = false) {
  const formData = female ? FEMALE_PREVIEW_FORM : SAMPLE_PREVIEW_FORM;
  return buildClientReportModel({ scores: female ? FEMALE_PREVIEW_SCORES : SAMPLE_PREVIEW_SCORES,
    formData, goals: formData.clientGoals, gapAnalysisData: [], clientName: formData.fullName, reportDate: 'Sep 8, 2026' });
}

describe('client report presentation', () => {
  it('renders the same single path and actions without comparisons or invented destinations', () => {
    const model = example();
    const html = renderToStaticMarkup(<ClientReportV2Layout model={model} />);
    expect(html).toContain('Your goals: Weight loss');
    expect(html).toContain('Estimated change from today');
    expect(html).not.toMatch(/AXIS|Most popular|× faster|3 sessions|three sessions|3, 4, or 5|starting on your own|Everfit|\u2014/i);
    expect(html).toContain('Overall score');
    expect(html).toContain('Your five areas');
    expect(html).toContain('Weeks 13–16');
    expect(html).toContain('Monday');
    for (const card of model.roadmapCards) {
      expect(html).toContain(card.track);
      expect(html).toContain(card.review);
    }
    expect(html).not.toContain(`>${model.roadmapTarget!.targetWeightKg}<`);
    expect(html).toContain('within those visits');
  });

  it('separates measured changes from estimates and hides them for an unverified baseline', () => {
    const input = { scores: COMPARISON_CURRENT_SCORES, formData: COMPARISON_CURRENT_FORM,
      goals: COMPARISON_CURRENT_FORM.clientGoals, gapAnalysisData: [],
      clientName: COMPARISON_CURRENT_FORM.fullName, reportDate: 'Nov 16, 2026' };
    const compared = renderToStaticMarkup(<ClientReportV2Layout model={buildClientReportModel({ ...input, comparison: COMPARISON_PREVIEW })} />);
    expect(compared).toContain('Measured change since 27 Jul 2026');
    expect(compared).toContain('aria-label="Measured change: −3.0 kg"');
    expect(compared).toContain('aria-label="Measured change: +5 reps"');
    expect(compared).toContain('Future columns are estimates.');
    const baseline = renderToStaticMarkup(<ClientReportV2Layout model={buildClientReportModel(input)} />);
    expect(baseline).not.toContain('Measured change since');
    expect(baseline).not.toContain('aria-label="Measured change:');
  });

  it('keeps female muscle-only guidance free from a weight-loss prescription', () => {
    const model = example(true);
    expect(model.welcome).toContain('women');
    expect(model.roadmapTarget?.direction).toBe('gain');
    expect(model.roadmapCards.map(c => c.smartGoal).join(' ')).not.toMatch(/lose|cut|loss/i);
    expect(model.formData?.inbodyWeightKg).toBe('64');
  });

  it('uses cumulative change and labels body-fat percentage points', () => {
    const row = { name: 'Body fat', unit: '%', current: '31.2', baseline: 31.2, changeAtPlan: -4.25, twelveWeeks: '27.0' };
    expect(formatProgressionChange(row, 'plan')).toEqual({ value: '−4.3', unit: 'percentage points' });
    expect(formatProgressionChange(row, 'month')).toEqual({ value: '−1.2', unit: 'percentage points' });
  });

  it('calculates the strength percentage and absolute change from the same unrounded baseline', () => {
    const row = { name: 'Upper-body strength and endurance', unit: 'reps', current: '28', baseline: 28,
      changeAtPlan: 8.4, twelveWeeks: '36' };
    expect(formatProgressionChange(row, 'plan')).toEqual({ value: '+30%', detail: '+8 reps' });
  });

  it('keeps peak heart rate as a captured reading and removes movement destinations', () => {
    const model = example();
    const peak = model.pillars.find(p => p.scoringId === 'cardio')?.progressionRows.find(r => r.name === 'Peak heart rate');
    expect(peak?.current).toBe('152');
    expect(formatProgressionChange(peak!, 'plan').value).toBe('–');
    const html = renderToStaticMarkup(<ClientReportV2Layout model={model} />);
    expect(html).toContain('What to practise');
    expect(html).not.toContain('>Limited<');
  });
});
