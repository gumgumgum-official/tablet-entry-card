import type { SubmitPoint } from "@/lib/submit/types";
import {
  INK_LINE_CAP,
  INK_LINE_JOIN,
  INK_MITER_LIMIT,
} from "@/lib/stroke/inkStyle";
import { pointsToQuadraticPathD } from "@/lib/stroke/smoothStroke";

export interface RedrawInkOptions {
  canvasWidth: number;
  canvasHeight: number;
  lineWidth: number;
  color: string;
}

/**
 * 스트로크 전체를 Quadratic path로 한 번에 그린다 (스트로크당 1회 stroke)
 */
export function redrawInkStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: SubmitPoint[][],
  options: RedrawInkOptions
): void {
  const { canvasWidth, canvasHeight, lineWidth, color } = options;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = INK_LINE_CAP;
  ctx.lineJoin = INK_LINE_JOIN;
  ctx.miterLimit = INK_MITER_LIMIT;

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const p = stroke[0]!;
      ctx.beginPath();
      ctx.arc(p.x, p.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const d = pointsToQuadraticPathD(stroke);
    const path = new Path2D(d);
    ctx.stroke(path);
  }
}
