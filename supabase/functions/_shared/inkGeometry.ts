/**
 * Edge Function용 잉크 기하 (클라이언트 smoothStroke / quadratic path와 동일 규칙 유지)
 */

export const INK_PATH_PRECISION = 2;
export const INK_SVG_STROKE_ATTRS =
  'stroke-linecap="round" stroke-linejoin="miter" stroke-miterlimit="5"';

export interface InkPoint {
  x: number;
  y: number;
  t: number;
  p?: number;
}

function roundCoord(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function chaikinOnceOpen(points: InkPoint[]): InkPoint[] {
  const n = points.length;
  if (n <= 2) return points.map((p) => ({ ...p }));

  const out: InkPoint[] = [{ ...points[0]! }];
  for (let i = 0; i < n - 1; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    out.push({
      x: 0.75 * p.x + 0.25 * q.x,
      y: 0.75 * p.y + 0.25 * q.y,
      t: 0.75 * p.t + 0.25 * q.t,
    });
    out.push({
      x: 0.25 * p.x + 0.75 * q.x,
      y: 0.25 * p.y + 0.75 * q.y,
      t: 0.25 * p.t + 0.75 * q.t,
    });
  }
  out.push({ ...points[n - 1]! });
  return out;
}

export function smoothStrokeInk(
  points: InkPoint[],
  iterations: number
): InkPoint[] {
  if (points.length <= 2 || iterations <= 0) {
    return points.map((p) => ({ ...p }));
  }
  let cur = points.map((p) => ({ ...p }));
  for (let k = 0; k < iterations; k++) {
    cur = chaikinOnceOpen(cur);
  }
  return cur;
}

export function pointsToQuadraticPathD(
  points: { x: number; y: number }[],
  precision: number = INK_PATH_PRECISION
): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0]!;
    const x = roundCoord(p.x, precision);
    const y = roundCoord(p.y, precision);
    return `M ${x} ${y} L ${roundCoord(x + 0.1, precision)} ${roundCoord(y + 0.1, precision)}`;
  }

  const parts: string[] = [];
  parts.push(
    `M ${roundCoord(points[0]!.x, precision)} ${roundCoord(points[0]!.y, precision)}`
  );

  if (points.length === 2) {
    parts.push(
      `L ${roundCoord(points[1]!.x, precision)} ${roundCoord(points[1]!.y, precision)}`
    );
    return parts.join(" ");
  }

  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i]!;
    const next = points[i + 1]!;
    const midX = roundCoord((curr.x + next.x) / 2, precision);
    const midY = roundCoord((curr.y + next.y) / 2, precision);
    parts.push(
      `Q ${roundCoord(curr.x, precision)} ${roundCoord(curr.y, precision)}, ${midX} ${midY}`
    );
  }

  const last = points[points.length - 1]!;
  const secondLast = points[points.length - 2]!;
  parts.push(
    `Q ${roundCoord(secondLast.x, precision)} ${roundCoord(secondLast.y, precision)}, ${roundCoord(last.x, precision)} ${roundCoord(last.y, precision)}`
  );

  return parts.join(" ");
}
