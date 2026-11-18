import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PostureViewExpandedSheet } from './PostureViewExpandedSheet';
import type { PostureFindingRecord } from '@/lib/types/postureFindings';

vi.mock('./PostureMarkedImage', () => ({ PostureMarkedImage: () => <div>Saved photo</div> }));
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});
const finding = (id: string): PostureFindingRecord => ({
  id, name: id, view: 'front', measuredValue: 4, unit: 'degrees', severity: 'mild',
  priority: 'low', whatItMeans: `${id} explanation`, whatWellDo: `${id} action`,
});
const clickButton = (name: string) => {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent?.trim() === name);
  expect(button).toBeDefined();
  act(() => button!.click());
};

describe('posture view feedback', () => {
  it('shows one finding at a time and makes the remaining findings selectable', () => {
    const onClose = vi.fn();
    act(() => root.render(<PostureViewExpandedSheet view="front" imageUrl="saved-photo" findings={[finding('First'), finding('Second')]} onClose={onClose} />));
    expect(document.body.textContent).toContain('First explanation');
    expect(document.body.textContent).not.toContain('Second explanation');
    clickButton('Second');
    expect(document.body.textContent).toContain('Second explanation');
    expect(document.body.textContent).not.toContain('First explanation');
    clickButton('Close');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call an unanalyzed photograph balanced', () => {
    act(() => root.render(<PostureViewExpandedSheet view="front" imageUrl="saved-photo" findings={[]} onClose={vi.fn()} />));
    expect(document.body.textContent).toContain('Photo saved. Feedback is not available for this view yet.');
    expect(document.body.textContent).not.toContain('Nothing to flag from this angle.');
  });
});
