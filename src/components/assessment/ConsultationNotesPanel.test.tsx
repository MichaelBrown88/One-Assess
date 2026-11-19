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

describe('ConsultationNotesPanel client PAR-Q', () => {
  it('flags yes answers and records the coach confirmation', async () => {
    const onConfirm = vi.fn();
    await act(async () => root.render(<ConsultationNotesPanel notes={[]} parq={{ answers: { parq1: 'no', parq2: 'yes' }, onConfirm }} />));
    expect(container.textContent).toContain('health answers to confirm');
    expect(container.textContent).toContain('Yes: Do you feel pain in your chest');
    expect(container.querySelector('details')?.open).toBe(true);
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Confirmed with client');
    await act(async () => button?.click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows a confirmed, all-clear PAR-Q without a button', async () => {
    await act(async () => root.render(<ConsultationNotesPanel notes={undefined} parq={{ answers: { parq1: 'no', parq2: 'no' }, confirmedAt: '2026-11-19T10:00:00Z', onConfirm: () => {} }} />));
    expect(container.textContent).toContain('No to all 2 questions.');
    expect(container.textContent).toContain('Confirmed with the client');
    expect(container.querySelector('button')).toBeNull();
  });
});
