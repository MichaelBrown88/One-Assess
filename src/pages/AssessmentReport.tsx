import { useState, lazy, Suspense, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAssessmentLogic } from '@/hooks/useAssessmentLogic';
import { useVersionSelector } from '@/hooks/useVersionSelector';
import { useReportShare } from '@/hooks/useReportShare';
import AssessmentVersionSelector from '@/components/reports/AssessmentVersionSelector';
import AppShell from '@/components/layout/AppShell';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Share2, MoreVertical, ArrowLeft, Edit2, Plus } from 'lucide-react';
import {
  removeAssessmentPhaseIndex,
  removeEditAssessment,
  removeIsDemoFlag,
  removePartialAssessment,
  removePrefillClient,
  writeEditAssessmentPayload,
} from '@/lib/assessment/assessmentSessionStorage';
import { isAssessmentSessionId } from '@/lib/assessment/editSaveTarget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareWithClientReportDialog } from '@/components/reports/ShareWithClientReportDialog';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

const ClientReport = lazy(() => import('@/components/reports/ClientReport'));

import { ROUTES, COACH_ASSESSMENT_QUERY } from '@/constants/routes';
import { COACH_ASSESSMENT_REPORT_NAV } from '@/constants/assessmentCopy';
import { UI_COMMAND_MENU } from '@/constants/ui';
const AssessmentReport = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    formData,
    scores,
    previousScores,
    comparison,
    previousFormData,
    loading,
    error,
    allSnapshots,
    assessmentDate,
  } = useAssessmentLogic(id);

  const versionSelector = useVersionSelector(allSnapshots);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [versionSelectorExpanded, setVersionSelectorExpanded] = useState(false);

  const scoreDelta = (scores && previousScores)
    ? (scores.overall - previousScores.overall)
    : undefined;

  const {
    handleCopyLink,
    handleEmailLink,
    handleSystemShare,
    handleWhatsAppShare,
    shareLoading,
  } = useReportShare({
    assessmentId: id,
    formData: formData ?? null,
    user,
    profile: profile ?? null,
    overallScore: scores?.overall,
    scoreDelta,
  });

  useEffect(() => {
    const wantsShare =
      searchParams.get(COACH_ASSESSMENT_QUERY.OPEN_SHARE_MODAL) ===
      COACH_ASSESSMENT_QUERY.OPEN_SHARE_VALUE;
    if (!wantsShare) return;
    if (loading || !formData || !scores) return;
    setShareModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete(COACH_ASSESSMENT_QUERY.OPEN_SHARE_MODAL);
    setSearchParams(next, { replace: true });
  }, [loading, formData, scores, searchParams, setSearchParams]);

  useEffect(() => {
    if (loading) return;
    const name = formData?.fullName?.trim();
    if (!name) return;
    if (searchParams.get('legacy') === '1') return;
    navigate(`/dashboard/clients/${encodeURIComponent(name)}/report`, { replace: true });
  }, [loading, formData?.fullName, navigate, searchParams]);

  if (loading) {
    return (
      <AppShell title="Assessment report">
        <div className="flex flex-col items-center justify-center py-20 bg-background rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground">Loading Assessment...</p>
        </div>
      </AppShell>
    );
  }

  if (!formData || !scores) {
    return (
      <AppShell title="Assessment report">
        <div className="space-y-4 rounded-lg border border-border bg-background p-6 text-sm text-foreground-secondary">
          <p>{error ?? 'Assessment not available.'}</p>
          <Button onClick={() => {
            removePartialAssessment();
            removeEditAssessment();
            removePrefillClient();
            removeIsDemoFlag();
            removeAssessmentPhaseIndex();
            navigate(ROUTES.ASSESSMENT);
          }}>New assessment</Button>
        </div>
      </AppShell>
    );
  }

  const navigateToDashboard = () => {
    if (formData?.fullName) {
      navigate(`/client/${encodeURIComponent(formData.fullName)}`);
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  const reportBackLabel = formData.fullName?.trim()
    ? COACH_ASSESSMENT_REPORT_NAV.BACK_TO_CLIENT_ARIA
    : COACH_ASSESSMENT_REPORT_NAV.BACK_TO_DASHBOARD_ARIA;

  const navigateToEdit = async () => {
    const editedForm = versionSelector.selectedFormData ?? formData;
    if (!editedForm?.fullName?.trim()) return;
    // assessmentId must be the client slug (org/clients/{slug}), not a session
    // timestamp from /coach/assessments/:id — otherwise edit save looks up a
    // missing summary doc and surfaces Sync Error. The session being edited is
    // carried separately as snapshotId.
    const { generateClientSlug } = await import('@/services/clientProfiles');
    const clientSlug = generateClientSlug(editedForm.fullName) || id || 'unnamed-client';
    const selectedId = allSnapshots[versionSelector.selectedIndex]?.id;
    const snapshotId = isAssessmentSessionId(selectedId) ? selectedId : undefined;
    writeEditAssessmentPayload({
      assessmentId: clientSlug,
      formData: editedForm,
      clientName: editedForm.fullName.trim(),
      ...(snapshotId ? { snapshotId } : {}),
    });
    removePartialAssessment();
    removePrefillClient();
    removeIsDemoFlag();
    navigate('/assessment');
  };

  const navigateToNew = () => {
    removePartialAssessment();
    removeEditAssessment();
    removePrefillClient();
    removeIsDemoFlag();
    navigate('/assessment');
  };

  return (
    <ErrorBoundary>
      <AppShell
        title=""
        variant="full-width"
        actions={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={navigateToDashboard}
              className="h-9 w-9 p-0"
              title={reportBackLabel}
              aria-label={reportBackLabel}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-9 rounded-lg bg-primary text-primary-foreground font-medium gap-1.5"
              onClick={() => setShareModalOpen(true)}
              disabled={shareLoading}
            >
              <Share2 className="h-4 w-4" />
              Share with client
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                <DropdownMenuItem onClick={navigateToEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit assessment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={navigateToNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  New assessment
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
    >
      {/* Breadcrumb + Header row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-3 pb-1">
        <Breadcrumb items={[
          { label: UI_COMMAND_MENU.HOME, href: ROUTES.DASHBOARD },
          ...(formData.fullName
            ? [{ label: formData.fullName, href: `/client/${encodeURIComponent(formData.fullName)}` }]
            : []),
          { label: 'Report' },
        ]} />
        <h1 className="text-base sm:text-lg font-bold text-foreground truncate">
          {formData.fullName || 'Assessment'}
        </h1>
      </div>

      <div
        className="transition-opacity duration-150"
        style={{
          opacity: versionSelector.isTransitioning ? 0 : 1,
          transitionTimingFunction: 'var(--easing-apple, cubic-bezier(0.25, 0.1, 0.25, 1))',
        }}
      >
        {/* Version selector — show when expanded or when user opens it */}
        {versionSelector.totalCount > 1 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pt-2 pb-3">
            {!versionSelectorExpanded ? (
              <button
                type="button"
                onClick={() => setVersionSelectorExpanded(true)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground-secondary"
              >
                Compare versions ({versionSelector.totalCount})
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AssessmentVersionSelector
                  snapshots={versionSelector.gridItems}
                  selectedIndex={versionSelector.selectedIndex}
                  totalCount={versionSelector.totalCount}
                  initialAssessment={versionSelector.initialAssessment}
                  initialAssessmentGlobalIndex={versionSelector.initialAssessmentGlobalIndex}
                  currentPage={versionSelector.currentPage}
                  totalPages={versionSelector.totalPages}
                  pageSize={versionSelector.pageSize}
                  onSelect={versionSelector.handleSelect}
                  onPageChange={versionSelector.handlePageChange}
                  getTrend={versionSelector.getTrend}
                />
                <button
                  type="button"
                  onClick={() => setVersionSelectorExpanded(false)}
                  className="text-xs text-muted-foreground hover:text-foreground-secondary"
                >
                  Hide
                </button>
              </div>
            )}
          </div>
        )}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-10 pb-8 sm:pb-12">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 bg-background rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Generating Report...</p>
            </div>
          }>
            <ClientReport
              comparison={versionSelector.selectedFormData ? versionSelector.comparison : comparison}
              scores={versionSelector.selectedScores ?? scores}
              goals={Array.isArray((versionSelector.selectedFormData ?? formData).clientGoals) ? (versionSelector.selectedFormData ?? formData).clientGoals : []}
              formData={versionSelector.selectedFormData ?? formData}
              previousScores={versionSelector.previousScores ?? previousScores}
              previousFormData={(versionSelector.previousFormData ?? previousFormData) ?? undefined}
              assessmentDate={allSnapshots[versionSelector.selectedIndex]?.date ?? assessmentDate}
              standalone={true}
              coachActions={{
                onShare: () => setShareModalOpen(true),
                onSendToClient: () => setShareModalOpen(true),
              }}
              reportMeta={{
                coachName: profile?.displayName ?? user?.displayName ?? undefined,
                assessmentNumber: allSnapshots?.length || undefined,
              }}
            />
          </Suspense>
        </div>
      </div>

      <ShareWithClientReportDialog
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        shareLoading={shareLoading}
        onCopyLink={handleCopyLink}
        onEmailLink={handleEmailLink}
        onSystemShare={handleSystemShare}
        onWhatsAppShare={handleWhatsAppShare}
      />
    </AppShell>
    </ErrorBoundary>
  );
};

export default AssessmentReport;


