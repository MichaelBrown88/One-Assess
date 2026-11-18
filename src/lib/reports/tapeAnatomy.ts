/**
 * Tape sites on the front silhouette.
 * The person faces the reader, so their left is on the reader's right.
 * `anchor` is the site as a percentage of figure height.
 * `layoutTapeLabels` then spreads labels so two-line callouts do not collide.
 */

export type TapeCalloutSide = 'left' | 'right';
export type TapeFigureGender = 'male' | 'female';

/** Trimmed asset aspect (width / height) so callouts meet the body, not a fixed box. */
export const TAPE_FIGURE_ASPECT: Record<TapeFigureGender, number> = {
  male: 426 / 1133,
  female: 320 / 1074,
};

export interface TapeSite {
  side: TapeCalloutSide;
  anchor: number;
}

export interface PlacedTapeLabel extends TapeSite {
  name: string;
  /** Label centre, as a percentage of figure height. May differ from `anchor`. */
  label: number;
}

/** Minimum centre-to-centre gap so a name + value stack clears the next callout. */
const MIN_LABEL_GAP = 13;
const LABEL_PAD = 8;

const MALE: Record<string, TapeSite> = {
  Shoulders: { side: 'left', anchor: 22 },
  Chest: { side: 'right', anchor: 27 },
  'Right arm': { side: 'left', anchor: 33 },
  'Left arm': { side: 'right', anchor: 33 },
  Waist: { side: 'left', anchor: 40 },
  Hips: { side: 'right', anchor: 49 },
  'Right thigh': { side: 'left', anchor: 60 },
  'Left thigh': { side: 'right', anchor: 58 },
  'Right calf': { side: 'left', anchor: 79 },
  'Left calf': { side: 'right', anchor: 79 },
};

const FEMALE: Record<string, TapeSite> = {
  Shoulders: { side: 'left', anchor: 21 },
  Chest: { side: 'right', anchor: 27 },
  'Right arm': { side: 'left', anchor: 33 },
  'Left arm': { side: 'right', anchor: 33 },
  Waist: { side: 'left', anchor: 38 },
  Hips: { side: 'right', anchor: 46 },
  'Right thigh': { side: 'left', anchor: 60 },
  'Left thigh': { side: 'right', anchor: 57 },
  'Right calf': { side: 'left', anchor: 78 },
  'Left calf': { side: 'right', anchor: 78 },
};

export function tapeFigureGender(gender: string | undefined): TapeFigureGender {
  return gender?.toLowerCase() === 'female' ? 'female' : 'male';
}

export function tapeSite(name: string, gender: TapeFigureGender = 'male'): TapeSite | null {
  return (gender === 'female' ? FEMALE : MALE)[name] ?? null;
}

export function tapeCallout(name: string, gender: TapeFigureGender = 'male'): TapeSite | null {
  return tapeSite(name, gender);
}

export function layoutTapeLabels(names: string[], gender: TapeFigureGender = 'male'): PlacedTapeLabel[] {
  const placed: PlacedTapeLabel[] = [];
  for (const side of ['left', 'right'] as const) {
    const group = names
      .map((name) => {
        const site = tapeSite(name, gender);
        return site?.side === side ? { name, side, anchor: site.anchor, label: site.anchor } : null;
      })
      .filter((item): item is PlacedTapeLabel => item != null)
      .sort((a, b) => a.anchor - b.anchor);
    const labels = spreadLabelPositions(group.map((item) => item.anchor));
    group.forEach((item, index) => {
      placed.push({ ...item, label: labels[index] ?? item.anchor });
    });
  }
  return placed;
}

function spreadLabelPositions(anchors: number[]): number[] {
  if (anchors.length === 0) return [];
  const labels = anchors.map((anchor) => clampLabel(anchor));
  for (let index = 1; index < labels.length; index += 1) {
    const previous = labels[index - 1] ?? LABEL_PAD;
    const current = labels[index] ?? previous;
    if (current - previous < MIN_LABEL_GAP) {
      labels[index] = previous + MIN_LABEL_GAP;
    }
  }
  const last = labels[labels.length - 1] ?? LABEL_PAD;
  const overflow = last - (100 - LABEL_PAD);
  if (overflow > 0) {
    for (let index = 0; index < labels.length; index += 1) {
      labels[index] = (labels[index] ?? LABEL_PAD) - overflow;
    }
  }
  for (let index = labels.length - 2; index >= 0; index -= 1) {
    const next = labels[index + 1] ?? 100 - LABEL_PAD;
    const current = labels[index] ?? next;
    if (next - current < MIN_LABEL_GAP) {
      labels[index] = next - MIN_LABEL_GAP;
    }
  }
  return labels.map((value) => clampLabel(value));
}

function clampLabel(value: number): number {
  return Math.min(100 - LABEL_PAD, Math.max(LABEL_PAD, value));
}
