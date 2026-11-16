import { Button } from '@/components/ui/button';
import { useResumeAssessment } from '@/hooks/useResumeAssessment';
import { ASSESSMENT_DRAFT_COPY } from '@/constants/assessmentDraft';

export function ResumeAssessmentButton({ clientKey }: { clientKey: string }) {
  const { resumeAssessment, resuming } = useResumeAssessment();
  return (
    <Button type="button" variant="outline" className="min-h-11 rounded-full px-4 text-xs" disabled={resuming}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); void resumeAssessment(clientKey); }}>
      {resuming ? ASSESSMENT_DRAFT_COPY.RESUMING : ASSESSMENT_DRAFT_COPY.RESUME}
    </Button>
  );
}
