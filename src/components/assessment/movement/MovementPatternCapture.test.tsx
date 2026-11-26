import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { FormProvider, useFormContext } from '@/contexts/FormContext';
import { MovementPatternCapture } from './MovementPatternCapture';
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let captured: ReturnType<typeof useFormContext>;
const complete = vi.fn();
function Harness() { captured = useFormContext(); return <MovementPatternCapture sectionId="overhead-squat" sectionTitle="Overhead squat" onComplete={complete} />; }
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); sessionStorage.clear(); complete.mockClear(); container = document.createElement('div'); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); vi.unstubAllGlobals(); });
async function click(label: string) { const button = [...container.querySelectorAll('button')].find(el => el.textContent?.trim() === label); expect(button).toBeDefined(); await act(async () => button!.click()); }
it('saves observations immediately but waits for an explicit pain answer and Continue', async () => {
  await act(async () => root.render(<FormProvider><Harness /></FormProvider>));
  await click('Looks good');
  expect(complete).not.toHaveBeenCalled();
  expect(captured.formData.ohsKneeAlignment).toBe('stable');
  expect(captured.formData.ohsHasPain).toBe('');
  await click('Knees cave inward');
  expect(captured.formData.ohsKneeAlignment).toBe('valgus');
  expect(complete).not.toHaveBeenCalled();
  const painButton = [...container.querySelectorAll('button')].find(el => el.textContent?.trim().toLowerCase() === 'no pain');
  expect(painButton).toBeDefined();
  await act(async () => painButton!.click());
  expect(captured.formData.ohsHasPain).toBe('no');
  expect(complete).not.toHaveBeenCalled();
  const next = [...container.querySelectorAll('button')].find(el => /continue|complete/i.test(el.textContent ?? ''));
  expect(next?.disabled).toBe(false);
  await act(async () => next!.click());
  expect(complete).toHaveBeenCalledOnce();
});
it('reveals an optional measured ankle check only after the relevant observation', async () => {
  await act(async () => root.render(<FormProvider><Harness /></FormProvider>));
  expect(container.textContent).not.toContain('Optional ankle check');
  await click('Heels lift');
  expect(container.textContent).toContain('Optional ankle check');
  expect(captured.formData.ohsHeelsLift).toBe('yes');
});
