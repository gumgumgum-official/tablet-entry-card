/**
 * Edge Function용 잉크 기하 (클라이언트 smoothStroke / quadratic path와 동일 규칙 유지)
 */

export const INK_PATH_PRECISION = 2;
export const INK_SVG_STROKE_ATTRS =
  'stroke-linecap="round" stroke-linejoin="round"';

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

function distSq2D(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

/** 너무 촘촘한 점 제거 — 리본 자가교차 완화 */
function dedupeConsecutiveInkPoints(
  stroke: InkPoint[],
  minDistSq: number
): InkPoint[] {
  if (stroke.length <= 2) return stroke.map((p) => ({ ...p }));
  const out: InkPoint[] = [{ ...stroke[0]! }];
  for (let i = 1; i < stroke.length; i++) {
    const p = stroke[i]!;
    const prev = out[out.length - 1]!;
    if (distSq2D(p.x, p.y, prev.x, prev.y) < minDistSq) continue;
    out.push({ ...p });
  }
  if (out.length < 2) {
    return [
      { ...stroke[0]! },
      { ...stroke[stroke.length - 1]! },
    ];
  }
  return out;
}

function safeUnitNormal(dx: number, dy: number): { nx: number; ny: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len <= 1e-6) return { nx: 0, ny: -1 };
  return { nx: -dy / len, ny: dx / len };
}

function joinedNormalAt(
  pts: InkPoint[],
  i: number
): { nx: number; ny: number; miterScale: number } {
  if (pts.length <= 1) return { nx: 0, ny: -1, miterScale: 1 };
  if (i <= 0) {
    const p = pts[0]!;
    const n = pts[1]!;
    const u = safeUnitNormal(n.x - p.x, n.y - p.y);
    return { ...u, miterScale: 1 };
  }
  if (i >= pts.length - 1) {
    const p = pts[pts.length - 2]!;
    const n = pts[pts.length - 1]!;
    const u = safeUnitNormal(n.x - p.x, n.y - p.y);
    return { ...u, miterScale: 1 };
  }

  const prev = pts[i - 1]!;
  const curr = pts[i]!;
  const next = pts[i + 1]!;
  const n0 = safeUnitNormal(curr.x - prev.x, curr.y - prev.y);
  const n1 = safeUnitNormal(next.x - curr.x, next.y - curr.y);
  let jx = n0.nx + n1.nx;
  let jy = n0.ny + n1.ny;
  const jLen = Math.sqrt(jx * jx + jy * jy);
  if (jLen <= 1e-6) {
    return { nx: n1.nx, ny: n1.ny, miterScale: 1 };
  }
  jx /= jLen;
  jy /= jLen;

  const dot = Math.abs(jx * n1.nx + jy * n1.ny);
  const miterScale = Math.min(2.2, 1 / Math.max(dot, 0.45));
  return { nx: jx, ny: jy, miterScale };
}

/**
 * 중심선 폴리라인 → 닫힌 filled path `d` (ExtrudeGeometry / SVGLoader toShapes 용).
 * 압력 없으면 p=0으로 균일 두께 (baseWidth + p*mul)/2 per side.
 *
 * 짧은 세그먼트에서 반폭이 커지면 폴리곤이 자가교차하고 Extrude cap 삼각분할이
 * "거미줄"이 되므로, 인접 세그먼트 길이로 반폭을 상한 클램프한다.
 */
export function strokePolylineToFilledPathD(
  stroke: InkPoint[],
  baseWidth: number,
  pressureMultiplier: number = 4
): string {
  if (stroke.length < 2) return "";

  const minDist = Math.max(baseWidth * 0.12, 0.5);
  const work = dedupeConsecutiveInkPoints(stroke, minDist * minDist);
  if (work.length < 2) return "";

  const upperPath: { x: number; y: number }[] = [];
  const lowerPath: { x: number; y: number }[] = [];

  for (let i = 0; i < work.length; i++) {
    const point = work[i]!;
    const pressure =
      typeof point.p === "number" && Number.isFinite(point.p) ? point.p : 0;
    let width = (baseWidth + pressure * pressureMultiplier) / 2;

    let prevLen = Number.POSITIVE_INFINITY;
    let nextLen = Number.POSITIVE_INFINITY;
    if (i > 0) {
      const a = work[i - 1]!;
      prevLen = Math.sqrt(distSq2D(a.x, a.y, point.x, point.y));
    }
    if (i < work.length - 1) {
      const b = work[i + 1]!;
      nextLen = Math.sqrt(distSq2D(point.x, point.y, b.x, b.y));
    }
    const segShort = Math.min(prevLen, nextLen);
    if (Number.isFinite(segShort) && segShort > 1e-6) {
      const capW = segShort * 0.47;
      if (width > capW) width = capW;
    }

    const join = joinedNormalAt(work, i);
    const joinW = width * join.miterScale;
    upperPath.push({
      x: roundCoord(point.x + join.nx * joinW, INK_PATH_PRECISION),
      y: roundCoord(point.y + join.ny * joinW, INK_PATH_PRECISION),
    });
    lowerPath.push({
      x: roundCoord(point.x - join.nx * joinW, INK_PATH_PRECISION),
      y: roundCoord(point.y - join.ny * joinW, INK_PATH_PRECISION),
    });
  }

  const pathParts: string[] = [];
  pathParts.push(`M ${upperPath[0]!.x} ${upperPath[0]!.y}`);
  for (let i = 1; i < upperPath.length; i++) {
    pathParts.push(`L ${upperPath[i]!.x} ${upperPath[i]!.y}`);
  }
  for (let i = lowerPath.length - 1; i >= 0; i--) {
    pathParts.push(`L ${lowerPath[i]!.x} ${lowerPath[i]!.y}`);
  }
  pathParts.push("Z");
  return pathParts.join(" ");
}
