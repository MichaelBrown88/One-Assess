import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsultationNotesPanel } from './ConsultationNotesPanel';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('ConsultationNotesPanel', () => {
  it('renders nothing without notes', async () => {
    await act(async () => root.render(<ConsultationNotesPanel notes={undefined} />));
    expect(container.innerHTML).toBe('');
    await act(async () => root.render(<ConsultationNotesPanel notes={[]} />));
    expect(container.innerHTML).toBe('');
  });

  it('shows each note as plain text', async () => {
    await act(async () => root.render(
      <ConsultationNotesPanel notes={[{ label: 'Why now', value: '<b>Example</b> reason' }, { label: 'Barriers', value: 'Example barrier' }]} />,
    ));
    expect(container.textContent).toContain('From consultation');
    expect(container.textContent).toContain('Why now');
    expect(container.textContent).toContain('<b>Example</b> reason');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelectorAll('dt')).toHaveLength(2);
  });
});
