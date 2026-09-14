import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingViewId } from '@/lib/types/postureFindings';
import { useEnrichedPostureAnalysis } from '@/hooks/useReportPostureOverlay';
import { postureDeviationMarks, type DeviationMark } from '@/lib/posture/postureDeviationMarks';
import { cn } from '@/lib/utils';

interface PostureMarkedImageProps {
  url: string;
  view: PostureFindingViewId;
  analysis?: PostureAnalysisResult;
  className?: string;
}

const STROKE = 'hsl(var(--score-red))';
const REFERENCE = 'hsl(var(--foreground) / 0.4)';

function markPath(mark: DeviationMark): string {
  const pts = mark.points;
  if (pts.length < 2) return '';
  if (mark.control) {
    return `M ${pts[0].x} ${pts[0].y} Q ${mark.control.x} ${mark.control.y} ${pts[1].x} ${pts[1].y}`;
  }
  return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
}

export function PostureMarkedImage({ url, view, analysis, className }: PostureMarkedImageProps) {
  const markedAnalysis = useEnrichedPostureAnalysis(url, view, analysis);
  const marks = markedAnalysis ? postureDeviationMarks(view, markedAnalysis) : [];

  return (
    <div className={cn('relative inline-block max-h-full max-w-full leading-none', className)}>
      <img src={url} alt="" className="block h-auto max-h-full w-auto max-w-full" />
      {marks.length > 0 ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {marks.map((mark, i) => {
            const d = markPath(mark);
            if (!d) return null;
            const isRef = mark.role === 'reference';
            return (
              <path
                key={`${view}-${i}`}
                d={d}
                fill="none"
                stroke={isRef ? REFERENCE : STROKE}
                strokeWidth={isRef ? 0.16 : 0.22}
                strokeLinecap={mark.control ? 'round' : 'butt'}
                strokeLinejoin="round"
                strokeDasharray={isRef ? '1.2 1.1' : undefined}
              />
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}
