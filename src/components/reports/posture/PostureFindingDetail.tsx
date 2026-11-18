import React from 'react';
import type { PostureFindingRecord, PostureFindingSeverity } from '@/lib/types/postureFindings';
import { getPostureFeedbackDefinition } from '@/constants/postureFeedbackLibrary';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { cn } from '@/lib/utils';

interface PostureFindingDetailProps {
  finding: PostureFindingRecord;
}

function severityPillClass(sev: PostureFindingSeverity): string {
  if (sev === 'mild') return 'bg-score-amber-light text-score-amber-fg';
  if (sev === 'moderate') return 'bg-orange-500/15 text-orange-700 dark:text-orange-300';
  if (sev === 'significant') return 'bg-score-red-light text-score-red-fg';
  return 'bg-muted text-muted-foreground';
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p className="text-[12px] font-semibold text-foreground">{label}</p>
      <div className="mt-1 text-sm leading-relaxed text-foreground-secondary">{children}</div>
    </div>
  );
}

export function PostureFindingDetail({ finding }: PostureFindingDetailProps) {
  const fix = getPostureFeedbackDefinition(finding.id)?.fix;
  const severity = finding.severity === 'aligned' ? '' : CLIENT_REPORT_COPY.v2PostureSeverity[finding.severity];

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold text-foreground">{finding.name}</h3>
        {severity ? (
          <span
            className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', severityPillClass(finding.severity))}
          >
            {severity}
          </span>
        ) : null}
      </div>

      {finding.whatItMeans ? (
        <DetailBlock label={CLIENT_REPORT_COPY.v2PostureWhatItMeans}>
          <p>{finding.whatItMeans}</p>
        </DetailBlock>
      ) : null}

      {fix ? (
        <>
          <DetailBlock label={CLIENT_REPORT_COPY.v2PostureCause}>
            <p>{fix.cause}</p>
          </DetailBlock>
          <DetailBlock label={CLIENT_REPORT_COPY.v2PostureFix}>
            <p>{CLIENT_REPORT_COPY.v2PostureFixLine(fix.strengthen, fix.loosen)}</p>
            <ul className="mt-3 space-y-2.5 border-l-2 border-border pl-3">
              {fix.moves.map((move) => (
                <li key={move.name}>
                  <p className="text-sm font-medium text-foreground">{move.name}</p>
                  <p className="text-[13px] leading-snug text-foreground-secondary">{move.how}</p>
                </li>
              ))}
            </ul>
            {finding.severity === 'significant' && finding.whatWellDo ? (
              <p className="mt-3">{finding.whatWellDo}</p>
            ) : null}
          </DetailBlock>
        </>
      ) : finding.whatWellDo ? (
        <DetailBlock label={CLIENT_REPORT_COPY.v2PostureWhatWeDo}>
          <p>{finding.whatWellDo}</p>
        </DetailBlock>
      ) : null}
    </article>
  );
}
