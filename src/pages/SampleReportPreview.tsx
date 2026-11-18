import { useSearchParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { computeScores } from '@/lib/scoring';
import { Seo } from '@/components/seo/Seo';
import { CLIENT_REPORT_COPY, CLIENT_PLAN_WEEKS } from '@/constants/clientReport';
import { ROUTES } from '@/constants/routes';
import {
  SAMPLE_PREVIEW_DATE,
  SAMPLE_PREVIEW_FORM,
  SAMPLE_PREVIEW_SCORES,
  FEMALE_PREVIEW_FORM,
  FEMALE_PREVIEW_SCORES,
} from '@/constants/sampleClientReport';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { COMPARISON_CURRENT_FORM, COMPARISON_CURRENT_SCORES, COMPARISON_PREVIEW, COMPARISON_PREVIOUS_FORM, COMPARISON_PREVIOUS_SCORES } from '@/constants/reportComparisonPreview';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

const EXAMPLE_OPTIONS = ['sample', 'female', 'progress'] as const;

export default function SampleReportPreview() {
  const [params, setParams] = useSearchParams();
  const example = params.get('example') === 'progress' ? 'progress' : params.get('example') === 'female' ? 'female' : 'sample';
  const [saved, setSaved] = useState<FormData | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV || example !== 'sample') return;
    const controller = new AbortController();
    void fetch('/__local_report/review', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.formData && !controller.signal.aborted) setSaved({ ...initialFormData, ...data.formData }); })
      .catch(() => { /* The public fixture remains available without a local snapshot. */ });
    return () => controller.abort();
  }, [example]);
  const formData = example === 'progress' ? COMPARISON_CURRENT_FORM : example === 'female' ? FEMALE_PREVIEW_FORM : saved ?? SAMPLE_PREVIEW_FORM;
  const scores = example === 'progress' ? COMPARISON_CURRENT_SCORES : example === 'female' ? FEMALE_PREVIEW_SCORES : saved ? computeScores(saved) : SAMPLE_PREVIEW_SCORES;

  return (
    <div className="min-h-screen bg-muted/40">
      <Seo
        pathname={ROUTES.SAMPLE_REPORT_PREVIEW}
        title={example === 'progress' ? 'Assessment progress example' : 'Sample assessment report review'}
        description={`Sample assessment report and ${CLIENT_PLAN_WEEKS}-week plan for local review.`}
        noindex
      />
      <div className="border-b border-border bg-card px-4 py-3 text-center sm:px-6">
        <p className="text-sm font-medium text-foreground">{CLIENT_REPORT_COPY.previewTitle}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {example === 'progress' ? 'Two synthetic assessments: 27 July and 16 November 2026. Demonstration only, not a real client’s history.' : example === 'female' ? CLIENT_REPORT_COPY.previewFemaleDetail : saved ? 'Saved client snapshot from this machine. Read-only local review.' : CLIENT_REPORT_COPY.previewDetail}
        </p>
        <div className="mt-2 inline-flex rounded-full border border-border bg-muted p-0.5">
          {EXAMPLE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setParams(option === 'sample' ? {} : { example: option })}
              aria-pressed={example === option}
              className={cn(
                'rounded-full px-3 py-1 text-[12px] font-medium',
                example === option ? 'bg-foreground text-background' : 'text-muted-foreground',
              )}
            >
              {option === 'sample' ? CLIENT_REPORT_COPY.previewSample : option === 'progress' ? 'Progress example' : CLIENT_REPORT_COPY.previewFemale}
            </button>
          ))}
        </div>
        <nav aria-label="Report review sections" className="mt-3 flex justify-center gap-4 text-sm">
          <a href="#your-plan" className="underline underline-offset-4">Full 16-week plan</a>
          {example === 'sample' && saved ? <a href="#posture-scan" className="underline underline-offset-4">Posture photos</a> : null}
        </nav>
      </div>
      <Suspense
        fallback={
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ClientReport
          scores={scores}
          comparison={example === 'progress' ? COMPARISON_PREVIEW : null}
          previousFormData={example === 'progress' ? COMPARISON_PREVIOUS_FORM : undefined}
          previousScores={example === 'progress' ? COMPARISON_PREVIOUS_SCORES : undefined}
          goals={formData.clientGoals}
          formData={formData}
          assessmentDate={formData.assessedAt ? new Date(formData.assessedAt) : SAMPLE_PREVIEW_DATE}
          standalone
          reportMeta={{ orgName: 'One Fitness' }}
        />
      </Suspense>
    </div>
  );
}
