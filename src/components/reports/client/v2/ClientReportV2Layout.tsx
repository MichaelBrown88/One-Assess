import React from 'react';
import type { ClientReportModel } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ClientReportHero } from './ClientReportHero';
import { ClientRoadmapSection } from './ClientRoadmapSection';
import { PostureFilmstrip } from './PostureFilmstrip';
import { ClientPillarBrief } from './ClientPillarBrief';
import { ClientPartialAssessmentBanner } from '../sub-components/ClientPartialAssessmentBanner';
import type { SectionId } from '../clientReportSections';
import { cn } from '@/lib/utils';

interface ClientReportV2LayoutProps {
  model: ClientReportModel;
  orgName?: string;
  showPartialAssessmentBanner?: boolean;
  baselineNarrative?: string;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

const BAND_PAD = 'px-6 py-8 sm:px-10 sm:py-9';
const BAND_SCORECARD = `${BAND_PAD} bg-muted`;
const BAND_PLAN = `${BAND_PAD} bg-score-green-light`;
const BAND_SCAN = `${BAND_PAD} bg-card-elevated`;

export function ClientReportV2Layout({
  model,
  orgName,
  showPartialAssessmentBanner = false,
  showActions,
  onDownloadPdf,
  onShare,
  onSendToClient,
}: ClientReportV2LayoutProps) {
  const activeSectionIds = model.pillars.map((p) => p.sectionId) as SectionId[];

  return (
    <div className="overflow-hidden rounded-sm border border-border">
      <div className="bg-card">
        <ClientReportHero
          clientName={model.clientName}
          reportDate={model.reportDate}
          overall={model.overall}
          previousOverall={model.previousOverall}
          welcome={model.welcome}
          radarData={model.radarData}
          previousRadarData={model.previousRadarData}
          orgName={orgName}
          showActions={showActions}
          onDownloadPdf={onDownloadPdf}
          onShare={onShare}
          onSendToClient={onSendToClient}
        />
      </div>

      <section className={cn(BAND_SCORECARD, 'border-t border-border')}>
        {showPartialAssessmentBanner ? (
          <ClientPartialAssessmentBanner activeSectionIds={activeSectionIds} />
        ) : null}
        <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground">
          {CLIENT_REPORT_COPY.v2ScorecardHeading}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {CLIENT_REPORT_COPY.v2ScorecardSubheading}
        </p>
        <div className="mt-4 divide-y divide-border">
          {model.pillars.map((pillar) => (
            <ClientPillarBrief key={pillar.sectionId} pillar={pillar} formData={model.formData} />
          ))}
        </div>
      </section>

      {model.roadmapCards.length > 0 ? (
        <div className={cn(BAND_PLAN, 'border-t border-border')}>
          <ClientRoadmapSection
            cards={model.roadmapCards}
            target={model.roadmapTarget}
            selfGuidedHabits={model.selfGuidedHabits}
            embedded
          />
        </div>
      ) : null}

      {model.posture ? (
        <div className={cn(BAND_SCAN, 'border-t border-border')}>
          <PostureFilmstrip posture={model.posture} embedded />
        </div>
      ) : null}

      <footer className="border-t border-border bg-muted/35 px-6 py-3 text-center">
        <p className="text-[10px] text-muted-foreground">
          {CLIENT_REPORT_COPY.v2DocumentTitle} · For coaching purposes only
        </p>
      </footer>
    </div>
  );
}
