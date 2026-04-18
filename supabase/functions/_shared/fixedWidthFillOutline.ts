/**
 * Fixed-width stroke → closed filled SVG path `d` (ExtrudeGeometry-friendly).
 * Shared by Edge `handwriting-to-svg` and client `svg-converter` (via src re-export).
 */

export function roundCoord(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/** Open polyline → quadratic path (same spirit as client strokeToPathData). */
function polylineToQuadraticPathD(
  points: readonly { x: number; y: number }[],
  precision: number,
): string {
  const r = (v: number) => roundCoord(v, precision);
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${r(points[0].x)} ${r(points[0].y)} L ${r(points[1].x)} ${r(points[1].y)}`;
  }
  const parts: string[] = [];
  parts.push(`M ${r(points[0].x)} ${r(points[0].y)}`);
  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const midX = r((curr.x + next.x) / 2);
    const midY = r((curr.y + next.y) / 2);
    parts.push(`Q ${r(curr.x)} ${r(curr.y)}, ${midX} ${midY}`);
  }
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  parts.push(
    `Q ${r(secondLast.x)} ${r(secondLast.y)}, ${r(last.x)} ${r(last.y)}`,
  );
  return parts.join(" ");
}

function polylineToLinePathD(
  points: readonly { x: number; y: number }[],
  precision: number,
): string {
  const r = (v: number) => roundCoord(v, precision);
  if (points.length < 2) return "";
  const parts: string[] = [`M ${r(points[0].x)} ${r(points[0].y)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${r(points[i].x)} ${r(points[i].y)}`);
  }
  return parts.join(" ");
}

function offsetRibbonPoints(
  points: readonly { x: number; y: number }[],
  halfWidth: number,
  precision: number,
): { upper: { x: number; y: number }[]; lower: { x: number; y: number }[] } {
  const upper: { x: number; y: number }[] = [];
  const lower: { x: number; y: number }[] = [];
  const r = (v: number) => roundCoord(v, precision);

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    let dx: number;
    let dy: number;
    if (i === 0) {
      dx = points[1].x - point.x;
      dy = points[1].y - point.y;
    } else if (i === points.length - 1) {
      dx = point.x - points[i - 1].x;
      dy = point.y - points[i - 1].y;
    } else {
      dx = points[i + 1].x - points[i - 1].x;
      dy = points[i + 1].y - points[i - 1].y;
    }

    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      upper.push({ x: point.x, y: r(point.y - halfWidth) });
      lower.push({ x: point.x, y: r(point.y + halfWidth) });
    } else {
      const nx = -dy / length;
      const ny = dx / length;
      upper.push({
        x: r(point.x + nx * halfWidth),
        y: r(point.y + ny * halfWidth),
      });
      lower.push({
        x: r(point.x - nx * halfWidth),
        y: r(point.y - ny * halfWidth),
      });
    }
  }

  return { upper, lower };
}

export type ClosedFillPathOptions = {
  /** Use quadratic segments on upper/lower ribbons (smoother extrusion). Default true. */
  smooth?: boolean;
};

/**
 * Polyline centerline + full stroke width → closed `d` with fill rule non-zero.
 * @param fullStrokeWidth — same as SVG stroke-width (Edge: meta.baseStrokeWidth)
 */
export function strokePolylineToClosedFillPathD(
  points: readonly { x: number; y: number }[],
  fullStrokeWidth: number,
  precision: number,
  options: ClosedFillPathOptions = {},
): string {
  const smooth = options.smooth !== false;
  if (points.length < 2) return "";
  const halfWidth = fullStrokeWidth / 2;
  const { upper, lower } = offsetRibbonPoints(points, halfWidth, precision);

  const upperD = smooth
    ? polylineToQuadraticPathD(upper, precision)
    : polylineToLinePathD(upper, precision);
  if (!upperD) return "";

  const r = (v: number) => roundCoord(v, precision);
  const parts: string[] = [upperD];
  const lastL = lower[lower.length - 1];
  parts.push(`L ${r(lastL.x)} ${r(lastL.y)}`);
  for (let i = lower.length - 2; i >= 0; i--) {
    parts.push(`L ${r(lower[i].x)} ${r(lower[i].y)}`);
  }
  parts.push("Z");
  return parts.join(" ");
}
