import type { PostureAnalysisResult } from '../ai/postureAnalysis';
import { CONFIG } from '@/config';
import { postureDeviationMarks } from './postureDeviationMarks';

/**
 * Draws deviations on the canvas based on posture analysis results
 */
export function drawDeviations(
  ctx: CanvasRenderingContext2D,
  view: string,
  analysis: PostureAnalysisResult,
  _centerX: number,
  _shoulderY: number,
  _hipY: number,
  clientFacing = false
): void {
  const marks = postureDeviationMarks(view, analysis);
  if (marks.length === 0) return;

  const style = CONFIG.POSTURE_OVERLAY.STYLE;
  const strokeColor = clientFacing
    ? style.CLIENT_DEVIATION_COLOR
    : style.DEVIATION_COLOR;
  const strokeWidth = clientFacing
    ? style.CLIENT_DEVIATION_WIDTH
    : style.DEVIATION_WIDTH;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const toCanvas = (p: { x: number; y: number }) => ({
    x: (p.x / 100) * w,
    y: (p.y / 100) * h,
  });

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const strokeMark = (
    mark: (typeof marks)[number],
    color: string,
    width: number,
    dashed: number[] | [],
  ) => {
    const pts = mark.points.map(toCanvas);
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dashed);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (mark.control) {
      const c = toCanvas(mark.control);
      ctx.quadraticCurveTo(c.x, c.y, pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
    }
    ctx.stroke();
  };

  for (const mark of marks) {
    if (mark.role === 'reference') {
      strokeMark(mark, 'rgba(15, 23, 42, 0.4)', Math.max(1, strokeWidth - 0.5), [4, 3]);
      continue;
    }
    if (clientFacing) {
      strokeMark(mark, 'rgba(15, 23, 42, 0.35)', strokeWidth + 0.8, []);
    }
    strokeMark(mark, strokeColor, strokeWidth, clientFacing ? [] : [5, 5]);
  }
}
