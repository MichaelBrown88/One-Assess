import React from 'react';
import type { ClientReportModel, ClientReportPillarModel } from '@/lib/reports/buildClientReportModel';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { ClientReportHero } from './ClientReportHero';
import { ClientRoadmapSection } from './ClientRoadmapSection';
import { PostureFilmstrip } from './PostureFilmstrip';
import { ClientPillarBrief } from './ClientPillarBrief';
import { ClientPartialAssessmentBanner } from '../sub-components/ClientPartialAssessmentBanner';
import type { SectionId } from '../clientReportSections';

interface ClientReportV2LayoutProps {
  model: ClientReportModel;
  orgName?: string;
  showPartialAssessmentBanner?: boolean;
  showActions?: boolean;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

const BAND_PAD = 'px-6 py-8 sm:px-10 sm:py-9';
const BAND_GREY = `${BAND_PAD} bg-report-band`;
const BAND_WHITE = `${BAND_PAD} bg-card`;
const BAND_PLAN = `${BAND_PAD} bg-score-green-light`;

const PILLAR_BAND_ORDER: ClientReportPillarModel['scoringId'][] = [
  'bodyComp',
  'strength',
  'cardio',
  'movementQuality',
  'lifestyle',
];

const PILLAR_BAND: Record<ClientReportPillarModel['scoringId'], string> = {
  bodyComp: BAND_GREY,
  strength: BAND_WHITE,
  cardio: BAND_GREY,
  movementQuality: BAND_WHITE,
  lifestyle: BAND_GREY,
};

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
  const pillars = [...model.pillars].sort(
    (a, b) => PILLAR_BAND_ORDER.indexOf(a.scoringId) - PILLAR_BAND_ORDER.indexOf(b.scoringId),
  );
  const movementAssessed = pillars.some((p) => p.scoringId === 'movementQuality');

  return (
    <div className="overflow-hidden border-y border-border xl:rounded-sm xl:border">
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

      {pillars.map((pillar, index) => (
        <section key={pillar.sectionId} className={PILLAR_BAND[pillar.scoringId]}>
          {showPartialAssessmentBanner && index === 0 ? (
            <ClientPartialAssessmentBanner activeSectionIds={activeSectionIds} />
          ) : null}
          <ClientPillarBrief pillar={pillar} formData={model.formData} />
          {pillar.scoringId === 'movementQuality' && model.posture ? (
            <div className="mt-8 border-t border-border pt-8">
              <PostureFilmstrip posture={model.posture} embedded />
            </div>
          ) : null}
        </section>
      ))}

      {model.posture && !movementAssessed ? (
        <div className={BAND_WHITE}>
          <PostureFilmstrip posture={model.posture} embedded />
        </div>
      ) : null}

      {model.roadmapCards.length > 0 ? (
        <div className={BAND_PLAN}>
          <ClientRoadmapSection
            cards={model.roadmapCards}
            target={model.roadmapTarget}
            embedded
          />
        </div>
      ) : null}

      <footer className="bg-muted/35 px-6 py-3 text-center">
        <p className="text-[10px] text-muted-foreground">
          {CLIENT_REPORT_COPY.v2DocumentTitle} · For coaching purposes only
        </p>
      </footer>
    </div>
  );
}
