/**
 * Centralizes assessment flow state: phase/section/field index, section expand state,
 * partial vs full mode. Wraps useAssessmentNavigation and adds section/field-level state.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { PhaseSection } from '@/lib/phaseConfig';
import { useAssessmentNavigation } from '@/hooks/useAssessmentNavigation';
import {
  writeAssessmentPhaseId,
  writeAssessmentPhaseIndex,
} from '@/lib/assessment/assessmentSessionStorage';
import type { FormData } from '@/contexts/FormContext';
import type { OrgSettings } from '@/services/organizations';

export interface UseAssessmentFlowProps {
  formData: FormData;
  orgSettings?: Partial<OrgSettings>;
}

export function useAssessmentFlow({ formData, orgSettings }: UseAssessmentFlowProps) {
  const navigation = useAssessmentNavigation({ formData, orgSettings });
  const {
    activePhaseIdx,
    setActivePhaseIdx,
    visiblePhases,
    totalPhases,
    activePhase,
    isResultsPhase,
    isPartialAssessment,
    setIsPartialAssessment,
    partialCategory,
    setPartialCategory,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  } = navigation;

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeFieldIdx, setActiveFieldIdx] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const maxUnlockedPhaseIdx = useMemo(() => Math.max(0, totalPhases - 1), [totalPhases]);

  const setActivePhaseIdxAndPersist = useCallback(
    (value: number | ((prev: number) => number)) => {
      setActivePhaseIdx((prev) => {
        const next = typeof value === 'function' ? value(prev) : value;
        writeAssessmentPhaseIndex(next);
        const phaseId = visiblePhases[next]?.id;
        if (phaseId) writeAssessmentPhaseId(phaseId);
        return next;
      });
    },
    [setActivePhaseIdx, visiblePhases],
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      setIsReviewMode(true);
      const phaseIdx = visiblePhases.findIndex((p) => p.sections?.some((s) => s.id === sectionId));
      if (phaseIdx !== -1) {
        setActivePhaseIdxAndPersist(phaseIdx);
      }
      // Replace, don't merge: the flow renders the first `true` key, so merging
      // kept the phase's first section open and ignored the sidebar choice.
      setExpandedSections({ [sectionId]: true });
      setActiveFieldIdx(0);
    },
    [visiblePhases, setActivePhaseIdxAndPersist],
  );

  // Reset to the first section only when the phase (or its set of sections)
  // really changes. `activePhase.sections` gets a new array identity on every
  // answer when org modules are set, and resetting on that threw the coach
  // back to the first section/step after each answer.
  const sectionIds = (activePhase.sections || []).map((s: PhaseSection) => s.id);
  const sectionKey = `${activePhase.id}|${sectionIds.join(',')}`;
  useEffect(() => {
    const ids = sectionKey.split('|')[1]?.split(',').filter(Boolean) ?? [];
    const newExpanded: Record<string, boolean> = {};
    ids.forEach((id, index) => {
      newExpanded[id] = index === 0;
    });
    setExpandedSections(newExpanded);
  }, [activePhaseIdx, sectionKey]);

  const expandedKey = Object.keys(expandedSections).find((id) => expandedSections[id]) ?? '';
  useEffect(() => {
    setActiveFieldIdx(0);
  }, [activePhaseIdx, expandedKey]);

  return {
    ...navigation,
    setActivePhaseIdx: setActivePhaseIdxAndPersist,
    expandedSections,
    setExpandedSections,
    activeFieldIdx,
    setActiveFieldIdx,
    isReviewMode,
    setIsReviewMode,
    maxUnlockedPhaseIdx,
    toggleSection,
  };
}
