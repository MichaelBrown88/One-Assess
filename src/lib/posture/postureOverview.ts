import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import type { PostureFindingRecord, PostureFindingViewId } from '@/lib/types/postureFindings';
import { getPostureFeedbackDefinition } from '@/constants/postureFeedbackLibrary';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { aggregatePostureFindings, sortFindingsForDisplay } from '@/lib/posture/aggregatePostureInsights';
import { isReportablePostureFinding } from '@/lib/posture/buildStructuredPostureFindings';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';

const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function countWord(n: number): string {
  return COUNT_WORDS[n] ?? String(n);
}

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Findings worth showing the client across all views, most important first, with current copy. */
export function reportablePostureFindings(
  results: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>,
): PostureFindingRecord[] {
  return sortFindingsForDisplay(aggregatePostureFindings(results).filter(isReportablePostureFinding));
}

/** The short paragraph under the posture photos. */
export function buildPostureOverview(sorted: PostureFindingRecord[], hasAnalysis: boolean): string {
  if (!hasAnalysis) return CLIENT_REPORT_COPY.v2PostureImagesOnlyHeadline;
  if (sorted.length === 0) return CLIENT_REPORT_COPY.v2PostureBalancedHeadline;

  const names = sorted.slice(0, 3).map((f) => lowerFirst(sanitizeClientReportCopy(f.name)));
  if (sorted.length === 1) {
    const impact = getPostureFeedbackDefinition(sorted[0].id)?.impact ?? '';
    return CLIENT_REPORT_COPY.v2PostureOverviewOne(names[0], impact);
  }

  const list = formatList(names);
  const intro =
    sorted.length > 3
      ? CLIENT_REPORT_COPY.v2PostureOverviewMany(countWord(sorted.length), list)
      : CLIENT_REPORT_COPY.v2PostureOverviewFew(countWord(sorted.length), list);
  const areas = [
    ...new Set(
      sorted
        .map((f) => getPostureFeedbackDefinition(f.id)?.area)
        .filter((a): a is NonNullable<typeof a> => a != null),
    ),
  ].slice(0, 3);
  return areas.length > 0 ? `${intro} ${CLIENT_REPORT_COPY.v2PostureOverviewWhy(formatList(areas))}` : intro;
}
