/**
 * Hook for managing assessment navigation state and logic
 * Extracted from MultiStepForm to improve performance and separation of concerns
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { resolveDraftPhaseIndex } from '@/lib/assessment/draftNavigation';
import { phaseDefinitions, type PhaseSection, type PhaseId, type PhaseField } from '@/lib/phaseConfig';
import type { FormData } from '@/contexts/FormContext';
import type { OrgSettings } from '@/services/organizations';
import { shouldShowField } from '@/lib/utils/equipmentFieldFilter';
import { logger } from '@/lib/utils/logger';
import {
  getPartialCategoryFromEditType,
  hasPartialAssessmentInSession,
  parseEditAssessmentPayload,
  writePartialAssessment,
  readSavedAssessmentPhaseIndex,
  readSavedAssessmentPhaseId,
  readPartialAssessmentRecord,
} from '@/lib/assessment/assessmentSessionStorage';
import { hasActiveBaselineSession, hasRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';
import { BODY_COMP_SECTION_IDS, modulesForSection } from '@/lib/assessment/moduleSectionMap';
import {
  filterPhasesForStudioBaseline,
  hasRemotePostureCaptureComplete,
  sortStudioPhaseIds,
} from '@/lib/assessment/studioSessionSteps';

interface UseAssessmentNavigationProps {
  formData: FormData;
  orgSettings?: Partial<OrgSettings>;
}

export function useAssessmentNavigation({ formData, orgSettings }: UseAssessmentNavigationProps) {
  // Partial assessment mode state (read from PARTIAL_ASSESSMENT or EDIT_ASSESSMENT for edit flow)
  const [isPartialAssessment, setIsPartialAssessment] = useState(() => {
    try {
      if (hasPartialAssessmentInSession()) return true;
      const parsed = parseEditAssessmentPayload();
      if (parsed && getPartialCategoryFromEditType(parsed.editType)) return true;
      return false;
    } catch {
      return false;
    }
  });

  const [partialCategory, setPartialCategory] = useState<string | null>(() => {
    try {
      const rec = readPartialAssessmentRecord();
      if (rec?.category != null) return rec.category;
      const parsed = parseEditAssessmentPayload();
      return getPartialCategoryFromEditType(parsed?.editType);
    } catch {
      return null;
    }
  });

  // Ensure partial mode is applied when editing a partial (EDIT_ASSESSMENT can be set before PARTIAL_ASSESSMENT)
  useEffect(() => {
    const parsed = parseEditAssessmentPayload();
    if (!parsed) return;
    const category = getPartialCategoryFromEditType(parsed.editType);
    if (!category) return;
    writePartialAssessment({
      category,
      clientName: typeof parsed.formData?.fullName === 'string' ? parsed.formData.fullName : '',
    });
    setIsPartialAssessment(true);
    setPartialCategory(category);
  }, []);

  const getInitialPhase = () => {
    try {
      if (hasPartialAssessmentInSession()) {
        return 1;
      }
      const parsed = parseEditAssessmentPayload();
      if (parsed && getPartialCategoryFromEditType(parsed.editType)) {
        return 1;
      }
      const savedIdx = readSavedAssessmentPhaseIndex();
      if (savedIdx !== null) return savedIdx;
    } catch (e) {
      logger.warn('Failed to parse partial assessment data:', e);
    }
    return 0;
  };

  const [position, setPosition] = useState(() => ({
    index: getInitialPhase(),
    id: readSavedAssessmentPhaseId(),
  }));

  // Filter phases based on organization settings and partial assessment mode
  const visiblePhases = useMemo(() => {
    const modules = orgSettings?.modules;
    let phases = phaseDefinitions;

    // Filter phases and sections by granular assessment toggles
    if (modules) {
      phases = phaseDefinitions.map(phase => {
        if (phase.id === 'P0' || phase.id === 'P7') {
          return phase;
        }

        const filteredSections = (phase.sections || []).filter(section => {
          const enabledAssessments = modulesForSection(section.id);

          return enabledAssessments.some(assessmentKey => modules[assessmentKey as keyof typeof modules] === true);
        });

        if (filteredSections.length === 0) {
          return null;
        }

        return {
          ...phase,
          sections: filteredSections
        } as typeof phase;
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // Modular plan: restrict to included phases (legacy = no plan → all phases)
    const planIds = formData.assessmentPlan?.includedPhaseIds;
    if (planIds?.length && (!isPartialAssessment || !partialCategory)) {
      const allowed = new Set(planIds);
      phases = phases.filter((p) => allowed.has(p.id));
    }

    if (
      hasActiveBaselineSession() &&
      !isPartialAssessment &&
      planIds?.length
    ) {
      const filteredIds = filterPhasesForStudioBaseline(
        planIds,
        hasRemoteIntakeResumeSession(),
      );
      const allowed = new Set(filteredIds);
      phases = phases
        .filter((p) => allowed.has(p.id))
        .sort((a, b) => sortStudioPhaseIds([a.id, b.id]).indexOf(a.id) - sortStudioPhaseIds([a.id, b.id]).indexOf(b.id));
    }

    if (hasRemotePostureCaptureComplete(formData)) {
      phases = phases.map((phase) => {
        if (phase.id !== 'P2' || !phase.sections) return phase;
        const filteredSections = phase.sections.filter((s) => s.id !== 'posture');
        if (filteredSections.length === 0) return null;
        return { ...phase, sections: filteredSections };
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }

    if (!isPartialAssessment) {
      const order = sortStudioPhaseIds(phases.map((p) => p.id));
      phases = [...phases].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }

    // Filter further if in partial assessment mode
    if (!isPartialAssessment || !partialCategory) {
      return phases;
    }

    const categoryConfig: Record<string, { phaseIds: PhaseId[]; sectionIds?: string[] }> = {
      'bodycomp': { 
        phaseIds: ['P0', 'P2', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', ...BODY_COMP_SECTION_IDS] 
      },
      'posture': { 
        phaseIds: ['P0', 'P2', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'posture'] 
      },
      'fitness': { 
        phaseIds: ['P0', 'P3', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'fitness-assessment'] 
      },
      'strength': { 
        phaseIds: ['P0', 'P5', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'strength-endurance'] 
      },
      'lifestyle': { 
        phaseIds: ['P0', 'P1', 'P7'], 
        sectionIds: ['basic-client-info', 'parq', 'lifestyle-overview'] 
      },
    };

    const config = categoryConfig[partialCategory] || { phaseIds: ['P0'] };

    return phases
      .filter(phase => (config.phaseIds as string[]).includes(phase.id))
      .map(phase => {
        if (!config.sectionIds) return phase;

        const filteredSections = (phase.sections || []).filter(section => {
          if (!config.sectionIds) return true;
          if (!config.sectionIds.includes(section.id)) return false;

          if (modules) {
            const sectionAssessments = modulesForSection(section.id);

            if (sectionAssessments.length > 0 && !sectionAssessments.some(key => modules[key as keyof typeof modules])) {
              return false;
            }
          }

          return true;
        });
        if (filteredSections.length === 0 && phase.id !== 'P7') return null;
        return {
          ...phase,
          sections: filteredSections
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [formData, isPartialAssessment, partialCategory, orgSettings?.modules]);

  const activePhaseIdx = resolveDraftPhaseIndex(visiblePhases.map((phase) => phase.id), position.id, position.index);
  const setActivePhaseIdx = useCallback((next: number | ((previous: number) => number)) => {
    setPosition((previous) => {
      const current = resolveDraftPhaseIndex(visiblePhases.map((phase) => phase.id), previous.id, previous.index);
      const index = typeof next === 'function' ? next(current) : next;
      return { index, id: visiblePhases[index]?.id ?? null };
    });
  }, [visiblePhases]);

  const isFieldVisible = useCallback((field: { id?: string; conditional?: { showWhen?: Record<string, unknown> } }, customData?: FormData) => {
    const data = customData || formData;
    
    // First check equipment-based filtering (e.g., grip strength disabled)
    if (field.id && orgSettings?.equipmentConfig) {
      const shouldShow = shouldShowField(field as PhaseField, orgSettings.equipmentConfig, data);
      if (!shouldShow) return false;
    }
    
    // Then check conditional logic
    if (!('conditional' in field) || !field.conditional || !field.conditional.showWhen) return true;
    const { showWhen } = field.conditional;
    const dependentValue = data[showWhen.field as keyof FormData];
    let ok = true;
    if (showWhen.exists !== undefined) {
      ok = ok && (dependentValue !== undefined && dependentValue !== null && String(dependentValue).trim() !== '');
    }
    if (showWhen.value !== undefined) ok = ok && dependentValue === showWhen.value;
    if (showWhen.notValue !== undefined) ok = ok && dependentValue !== showWhen.notValue;
    if (showWhen.includes !== undefined) {
      if (Array.isArray(dependentValue)) {
        ok = ok && (dependentValue as string[]).includes(String(showWhen.includes));
      } else if (typeof dependentValue === 'string') {
        ok = ok && dependentValue === String(showWhen.includes);
      } else {
        ok = false;
      }
    }
    return ok;
  }, [formData, orgSettings?.equipmentConfig]);

  const isSectionCompleted = useCallback((section: PhaseSection) => {
    const visibleFields = (section.fields as Array<{ id: string; conditional?: { showWhen?: Record<string, unknown> }; required?: boolean }>).filter(f => isFieldVisible(f));
    if (visibleFields.length === 0) return true;

    const requiredFields = visibleFields.filter(f => f.required);

    if (requiredFields.length > 0) {
      return requiredFields.every(field => {
        const value = formData[field.id as keyof FormData];
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== null && value !== '';
      });
    }

    return visibleFields.every(field => {
      const value = formData[field.id as keyof FormData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, isFieldVisible]);

  const isPhaseCompleted = useCallback((phaseIdx: number) => {
    const phase = visiblePhases[phaseIdx];
    if (!phase) return false;
    const sections = phase.sections || [];
    if (sections.length === 0) return true;
    return sections.every(sec => isSectionCompleted(sec as PhaseSection));
  }, [visiblePhases, isSectionCompleted]);

  const totalPhases = visiblePhases.length;
  const activePhase = useMemo(() => {
    return visiblePhases[activePhaseIdx] || {
      id: 'empty' as const,
      title: 'No Phases Available',
      summary: 'Phase definitions are currently being loaded or configured.',
      sections: [] as PhaseSection[]
    };
  }, [activePhaseIdx, visiblePhases]);

  const isResultsPhase = activePhase?.id === 'P7';

  const progressValue = useMemo(() => {
    if (isPartialAssessment) return 0;
    // Exclude P7 (results): counting it as "completed" with denominator (totalPhases - 1) produced >100%.
    const workIndices = visiblePhases
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.id !== 'P7')
      .map(({ i }) => i);
    if (workIndices.length === 0) return 0;
    const completedWork = workIndices.filter((i) => isPhaseCompleted(i)).length;
    return (completedWork / workIndices.length) * 100;
  }, [visiblePhases, isPhaseCompleted, isPartialAssessment]);

  return {
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
    isFieldVisible,
    isSectionCompleted,
    isPhaseCompleted,
    progressValue,
  };
}

