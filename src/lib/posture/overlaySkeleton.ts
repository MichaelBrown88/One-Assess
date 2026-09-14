import { CONFIG } from '@/config';
import type { PostureView } from './types';
import { resolveAlignmentSource } from './resolveAlignmentSource';
import { createOverlayMap, mapNormToOverlay, type OverlayPt } from './overlayTransform';

export type { OverlayPt };

/** Compact pose points in aligned overlay space (0–100). Persisted; raw MediaPipe is not. */
export interface OverlaySkeleton {
  ear?: OverlayPt;
  eye?: OverlayPt;
  nose?: OverlayPt;
  shoulder?: OverlayPt;
  shoulderL?: OverlayPt;
  shoulderR?: OverlayPt;
  hip?: OverlayPt;
  hipL?: OverlayPt;
  hipR?: OverlayPt;
  knee?: OverlayPt;
  ankle?: OverlayPt;
  elbow?: OverlayPt;
}

type RawPt = { x: number; y: number; visibility?: number };

type SideIdx = {
  ear: number;
  eye: number;
  shoulder: number;
  hip: number;
  knee: number;
  ankle: number;
  elbow: number;
};

function take(raw: RawPt[] | undefined, idx: number): RawPt | undefined {
  const pt = raw?.[idx];
  if (!pt) return undefined;
  if (typeof pt.visibility === 'number' && pt.visibility < 0.2) return undefined;
  return pt;
}

function mid(a: OverlayPt | undefined, b: OverlayPt | undefined): OverlayPt | undefined {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return a ?? b;
}

function namedSideIdx(right: boolean): SideIdx {
  return right
    ? { ear: 8, eye: 6, shoulder: 12, hip: 24, knee: 26, ankle: 28, elbow: 14 }
    : { ear: 7, eye: 3, shoulder: 11, hip: 23, knee: 25, ankle: 27, elbow: 13 };
}

function visOf(raw: RawPt[] | undefined, idx: number): number {
  return take(raw, idx)?.visibility ?? 0;
}

/** True when ear sits behind the outer eye (Frankfurt), not on a cap visor. */
function earIsBehindEye(ear: RawPt, eye: RawPt, view: PostureView): boolean {
  return view === 'side-left' ? ear.x >= eye.x - 0.01 : ear.x <= eye.x + 0.01;
}

function resolveSideIdx(raw: RawPt[] | undefined, view: PostureView): SideIdx {
  const named = namedSideIdx(view === 'side-right');
  const alt = namedSideIdx(view !== 'side-right');
  const namedEar = take(raw, named.ear);
  const namedEye = take(raw, named.eye);
  const altEar = take(raw, alt.ear);
  const altEye = take(raw, alt.eye);
  const namedBehind = namedEar && namedEye ? earIsBehindEye(namedEar, namedEye, view) : false;
  const altBehind = altEar && altEye ? earIsBehindEye(altEar, altEye, view) : false;
  if (!namedBehind && altBehind) return alt;
  const namedScore = Math.min(visOf(raw, named.ear), visOf(raw, named.eye));
  const altScore = Math.min(visOf(raw, alt.ear), visOf(raw, alt.eye));
  if (!namedBehind && altScore > namedScore + 0.12) return alt;
  return named;
}

function pickSkeleton(
  raw: RawPt[] | undefined,
  view: PostureView,
  to: (idx: number) => OverlayPt | undefined,
): OverlaySkeleton | undefined {
  if (view === 'side-left' || view === 'side-right') {
    const idx = resolveSideIdx(raw, view);
    const ear = to(idx.ear);
    const eye = to(idx.eye);
    const shoulder = to(idx.shoulder);
    const hip = to(idx.hip);
    const knee = to(idx.knee);
    const ankle = to(idx.ankle);
    const elbow = to(idx.elbow);
    if (!ear && !shoulder && !hip) return undefined;
    return { ear, eye, shoulder, hip, knee, ankle, elbow };
  }

  const nose = to(0);
  const shoulderL = to(11);
  const shoulderR = to(12);
  const hipL = to(23);
  const hipR = to(24);
  return {
    nose,
    ear: mid(to(7), to(8)),
    eye: mid(to(3), to(6)),
    shoulderL,
    shoulderR,
    shoulder: mid(shoulderL, shoulderR),
    hipL,
    hipR,
    hip: mid(hipL, hipR),
    knee: mid(to(25), to(26)),
    ankle: mid(to(27), to(28)),
  };
}

/**
 * Landmarks already live in the displayed photo (0–1 of that JPEG).
 * Use this for report images that are already grid-aligned — do not run
 * the capture alignment transform again.
 */
export function overlayFromNormalizedLandmarks(
  raw: RawPt[] | undefined,
  view: PostureView,
): OverlaySkeleton | undefined {
  if (!raw?.length) return undefined;
  return pickSkeleton(raw, view, (idx) => {
    const pt = take(raw, idx);
    return pt ? { x: pt.x * 100, y: pt.y * 100 } : undefined;
  });
}

/**
 * Project capture-time landmarks onto the aligned report canvas.
 */
export function buildOverlaySkeleton(
  raw: RawPt[] | undefined,
  view: PostureView,
  imgW: number,
  imgH: number,
): OverlaySkeleton | undefined {
  if (!raw?.length || imgW < 2 || imgH < 2) return undefined;
  const source = resolveAlignmentSource(view, { raw }, imgW, imgH);
  if (!source) return undefined;
  const map = createOverlayMap(
    source,
    CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.WIDTH,
    CONFIG.POSTURE_OVERLAY.CANVAS_SIZE.HEIGHT,
  );
  if (!map) return undefined;

  return pickSkeleton(raw, view, (idx) => {
    const pt = take(raw, idx);
    return pt ? mapNormToOverlay(map, pt, imgW, imgH) : undefined;
  });
}
