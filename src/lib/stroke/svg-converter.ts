/**
 * SVG Converter - 스트로크 데이터를 SVG로 변환
 *
 * Three.js SVGLoader와 호환되는 SVG 생성
 * ExtrudeGeometry로 3D 변환 가능한 path 구조
 */

import type { Stroke, StrokeData, SVGOptions } from "./types";

/** 기본 SVG 옵션 */
const DEFAULT_OPTIONS: SVGOptions = {
  baseStrokeWidth: 2,
  pressureMultiplier: 4,
  strokeColor: "#2E2E2E",
  padding: 10,
  precision: 2, // 소수점 2자리 (네트워크 최적화)
};

/**
 * 숫자를 지정된 정밀도로 반올림
 */
function round(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

/**
 * 스트로크 포인트들을 Catmull-Rom 스플라인(Cubic Bezier)으로 변환
 * 모든 점을 통과하면서 접선이 연속 → 자연스러운 필기 곡선
 */
function strokeToPathData(
  stroke: Stroke,
  options: SVGOptions
): string {
  const { points } = stroke;
  const { precision } = options;

  if (points.length === 0) return "";

  const r = (v: number) => round(v, precision);
  const pathParts: string[] = [];

  pathParts.push(`M ${r(points[0].x)} ${r(points[0].y)}`);

  if (points.length < 3) {
    for (let i = 1; i < points.length; i++) {
      pathParts.push(`L ${r(points[i].x)} ${r(points[i].y)}`);
    }
    return pathParts.join(" ");
  }

  // Catmull-Rom → Cubic Bezier: CP1 = P1 + (P2-P0)/6, CP2 = P2 - (P3-P1)/6
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    pathParts.push(`C ${r(cp1x)} ${r(cp1y)}, ${r(cp2x)} ${r(cp2y)}, ${r(p2.x)} ${r(p2.y)}`);
  }

  return pathParts.join(" ");
}

/**
 * Pressure 기반 가변 폭 path 생성 (선택적)
 * stroke-width 속성 대신 filled path로 두께 표현
 */
function dedupeStrokePoints(
  points: Stroke["points"],
  minDistSq: number
): Stroke["points"] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));
  const out: Stroke["points"] = [{ ...points[0]! }];
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    const q = out[out.length - 1]!;
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    if (dx * dx + dy * dy < minDistSq) continue;
    out.push({ ...p });
  }
  if (out.length < 2) {
    return [{ ...points[0]! }, { ...points[points.length - 1]! }];
  }
  return out;
}

function safeUnitNormal(dx: number, dy: number): { nx: number; ny: number } {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len <= 1e-6) return { nx: 0, ny: -1 };
  return { nx: -dy / len, ny: dx / len };
}

function joinedNormalAt(
  points: Stroke["points"],
  i: number
): { nx: number; ny: number; miterScale: number } {
  if (points.length <= 1) return { nx: 0, ny: -1, miterScale: 1 };
  if (i <= 0) {
    const p = points[0]!;
    const n = points[1]!;
    const u = safeUnitNormal(n.x - p.x, n.y - p.y);
    return { ...u, miterScale: 1 };
  }
  if (i >= points.length - 1) {
    const p = points[points.length - 2]!;
    const n = points[points.length - 1]!;
    const u = safeUnitNormal(n.x - p.x, n.y - p.y);
    return { ...u, miterScale: 1 };
  }

  const prev = points[i - 1]!;
  const curr = points[i]!;
  const next = points[i + 1]!;
  const n0 = safeUnitNormal(curr.x - prev.x, curr.y - prev.y);
  const n1 = safeUnitNormal(next.x - curr.x, next.y - curr.y);
  let jx = n0.nx + n1.nx;
  let jy = n0.ny + n1.ny;
  const jLen = Math.sqrt(jx * jx + jy * jy);
  if (jLen <= 1e-6) return { nx: n1.nx, ny: n1.ny, miterScale: 1 };
  jx /= jLen;
  jy /= jLen;

  const dot = Math.abs(jx * n1.nx + jy * n1.ny);
  const miterScale = Math.min(2.2, 1 / Math.max(dot, 0.45));
  return { nx: jx, ny: jy, miterScale };
}

function strokeToVariableWidthPath(
  stroke: Stroke,
  options: SVGOptions
): string {
  const { points: rawPoints } = stroke;
  const { baseStrokeWidth, pressureMultiplier, precision } = options;

  if (rawPoints.length < 2) return "";

  const minDist = Math.max(baseStrokeWidth * 0.12, 0.5);
  const points = dedupeStrokePoints(rawPoints, minDist * minDist);
  if (points.length < 2) return "";

  const upperPath: { x: number; y: number }[] = [];
  const lowerPath: { x: number; y: number }[] = [];
  const halfWidths: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const pr = Number.isFinite(point.pressure) ? point.pressure : 0;
    let width = (baseStrokeWidth + pr * pressureMultiplier) / 2;

    // 내부 꺾임점에서만 self-intersection 방지 캡 적용 (끝점은 full width 유지)
    if (i > 0 && i < points.length - 1) {
      const a = points[i - 1]!;
      const b = points[i + 1]!;
      const dx0 = point.x - a.x, dy0 = point.y - a.y;
      const dx1 = b.x - point.x, dy1 = b.y - point.y;
      const prevLen = Math.sqrt(dx0 * dx0 + dy0 * dy0);
      const nextLen = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const segShort = Math.min(prevLen, nextLen);
      if (segShort > 1e-6) {
        const capW = segShort * 0.47;
        if (width > capW) width = capW;
      }
    }

    halfWidths.push(width);

    const join = joinedNormalAt(points, i);
    const joinW = width * join.miterScale;
    upperPath.push({
      x: round(point.x + join.nx * joinW, precision),
      y: round(point.y + join.ny * joinW, precision),
    });
    lowerPath.push({
      x: round(point.x - join.nx * joinW, precision),
      y: round(point.y - join.ny * joinW, precision),
    });
  }

  // 상단 → 끝 둥근캡 → 하단(역순) → 시작 둥근캡 → Z
  const pathParts: string[] = [];
  const startR = round(halfWidths[0]!, precision);
  const endR = round(halfWidths[halfWidths.length - 1]!, precision);
  const n = upperPath.length;

  pathParts.push(`M ${upperPath[0].x} ${upperPath[0].y}`);
  for (let i = 1; i < n; i++) {
    pathParts.push(`L ${upperPath[i].x} ${upperPath[i].y}`);
  }
  // 끝점 반원 캡: upper→lower, 행진 방향 기준 오른쪽(바깥) sweep (clockwise=1)
  pathParts.push(`A ${endR} ${endR} 0 0 1 ${lowerPath[n - 1].x} ${lowerPath[n - 1].y}`);
  for (let i = n - 2; i >= 0; i--) {
    pathParts.push(`L ${lowerPath[i].x} ${lowerPath[i].y}`);
  }
  // 시작점 반원 캡: lower→upper, 행진 반대 방향 바깥 sweep (counter-clockwise=0)
  pathParts.push(`A ${startR} ${startR} 0 0 0 ${upperPath[0].x} ${upperPath[0].y}`);
  pathParts.push("Z");

  return pathParts.join(" ");
}

/**
 * 바운딩 박스 계산
 */
function calculateBoundingBox(
  strokes: Stroke[]
): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }

  // 기본값 (스트로크가 없는 경우)
  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }

  return { minX, minY, maxX, maxY };
}

/**
 * StrokeData를 SVG 문자열로 변환
 */
export function strokesToSVG(
  strokeData: StrokeData,
  options: Partial<SVGOptions> = {},
  useVariableWidth: boolean = false
): string {
  const opts: SVGOptions = { ...DEFAULT_OPTIONS, ...options };
  const { strokes, width, height } = strokeData;
  const { padding, strokeColor, baseStrokeWidth, pressureMultiplier } = opts;

  if (strokes.length === 0) {
    return createEmptySVG(width, height);
  }

  // viewBox 계산
  const bbox = calculateBoundingBox(strokes);
  const viewBoxX = Math.floor(bbox.minX - padding);
  const viewBoxY = Math.floor(bbox.minY - padding);
  const viewBoxWidth = Math.ceil(bbox.maxX - bbox.minX + padding * 2);
  const viewBoxHeight = Math.ceil(bbox.maxY - bbox.minY + padding * 2);

  /** 화면·래스터용 (#strokes) */
  const displayPaths: string[] = [];
  /** gum Stage3 Extrude 전용 닫힌 fill (#extrude-outlines, display:none) */
  const extrudePaths: string[] = [];

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    if (useVariableWidth) {
      const pathData = strokeToVariableWidthPath(stroke, opts);
      if (pathData) {
        const row = `  <path d="${pathData}" fill="${stroke.color || strokeColor}" stroke="none"/>`;
        displayPaths.push(row);
        extrudePaths.push(row);
      }
    } else {
      const avgPressure =
        stroke.points.reduce((sum, p) => sum + p.pressure, 0) /
        stroke.points.length;
      const strokeWidth =
        baseStrokeWidth + avgPressure * pressureMultiplier;

      if (stroke.points.length === 1) {
        const p = stroke.points[0];
        const cx = round(p.x, opts.precision);
        const cy = round(p.y, opts.precision);
        const r = round(strokeWidth / 2, opts.precision);
        const circle = `  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${stroke.color || strokeColor}"/>`;
        displayPaths.push(circle);
        extrudePaths.push(circle);
        continue;
      }

      const pathData = strokeToPathData(stroke, opts);
      if (pathData) {
        displayPaths.push(
          `  <path d="${pathData}" fill="none" stroke="${stroke.color || strokeColor}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      }
      const ribbonStroke: Stroke = {
        ...stroke,
        points: stroke.points.map((pt) => ({ ...pt, pressure: 0 })),
      };
      const fillD = strokeToVariableWidthPath(ribbonStroke, opts);
      if (fillD) {
        extrudePaths.push(
          `  <path d="${fillD}" fill="${stroke.color || strokeColor}" stroke="none"/>`
        );
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${width}" height="${height}">
  <g id="strokes">
${displayPaths.join("\n")}
  </g>
  <g id="extrude-outlines" data-handwriting-extrude="true" style="display:none" aria-hidden="true">
${extrudePaths.join("\n")}
  </g>
</svg>`;
}

/**
 * 빈 SVG 생성
 */
function createEmptySVG(width: number, height: number): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <g id="strokes"></g>
  <g id="extrude-outlines" data-handwriting-extrude="true" style="display:none" aria-hidden="true"></g>
</svg>`;
}

/**
 * SVG를 Blob으로 변환 (업로드용)
 */
export function svgToBlob(svgString: string): Blob {
  return new Blob([svgString], { type: "image/svg+xml" });
}

/**
 * SVG를 File 객체로 변환 (업로드용)
 */
export function svgToFile(svgString: string, filename: string): File {
  const blob = svgToBlob(svgString);
  return new File([blob], filename, { type: "image/svg+xml" });
}
