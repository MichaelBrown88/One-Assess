import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssessmentNavigation } from './useAssessmentNavigation';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
import { markBaselineAssessmentSession, markRemoteIntakeResumeSession } from '@/lib/assessment/baselineSession';
import { writeAssessmentPhaseId, writeAssessmentPhaseIndex } from '@/lib/assessment/assessmentSessionStorage';
import { buildStudioBaselinePlan } from '@/lib/types/assessmentPlan';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let navigation: ReturnType<typeof useAssessmentNavigation>;
const captured = { ...createEmptyAssessmentForm(), fullName:'Saved Client', assessmentPlan:buildStudioBaselinePlan(), recentActivity:'active', trainingHistory:'experienced', activityLevel:'active' };
function Harness({ complete = true }: { complete?: boolean }) {
  navigation = useAssessmentNavigation({formData: complete ? captured : {...captured,recentActivity:'',trainingHistory:'',activityLevel:''}});
  return <div>{navigation.activePhase.id}</div>;
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sessionStorage.clear();
  markBaselineAssessmentSession('studio');
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => {await act(async () => root.unmount());vi.unstubAllGlobals();});
describe('assessment navigation through actual hook renders',()=>{
  it('restores a saved body-comp phase after intake steps are removed',async()=>{
    writeAssessmentPhaseIndex(5);writeAssessmentPhaseId('P2');
    markRemoteIntakeResumeSession();
    await act(async()=>root.render(<Harness/>));
    expect(container.textContent).toBe('P2');
    expect(navigation.activePhaseIdx).toBe(3);
    await act(async()=>navigation.setActivePhaseIdx(previous=>previous-1));
    expect(container.textContent).toBe('P5');
  });
  it('repairs an empty legacy step on the first render, before effects can autosave',async()=>{
    writeAssessmentPhaseIndex(5);writeAssessmentPhaseId('empty');
    await act(async()=>root.render(<Harness/>));
    expect(container.textContent).toBe('P2');
    expect(navigation.isResultsPhase).toBe(false);
  });
  it('stays on the same physical step when the visible list changes',async()=>{
    writeAssessmentPhaseIndex(5);writeAssessmentPhaseId('P2');
    await act(async()=>root.render(<Harness complete={false}/>));
    expect(navigation.activePhaseIdx).toBe(5);
    markRemoteIntakeResumeSession();
    await act(async()=>root.render(<Harness/>));
    expect(navigation.activePhaseIdx).toBe(3);
    expect(container.textContent).toBe('P2');
  });
});
