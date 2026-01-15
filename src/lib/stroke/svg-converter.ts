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
 * 스트로크 포인트들을 SVG path d 속성으로 변환
 * Catmull-Rom 스플라인 → Bezier 곡선 변환으로 부드러운 곡선 생성
 */
function strokeToPathData(
  stroke: Stroke,
  options: SVGOptions
): string {
  const { points } = stroke;
  const { precision } = options;

  if (points.length === 0) return "";
  if (points.length === 1) {
    // 단일 점은 작은 원으로 표현
    const p = points[0];
    const x = round(p.x, precision);
    const y = round(p.y, precision);
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }

  const pathParts: string[] = [];

  // 시작점
  pathParts.push(`M ${round(points[0].x, precision)} ${round(points[0].y, precision)}`);

  if (points.length === 2) {
    // 두 점은 직선
    pathParts.push(`L ${round(points[1].x, precision)} ${round(points[1].y, precision)}`);
  } else {
    // 3개 이상: Quadratic Bezier 곡선으로 부드럽게 연결
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];

      // 중간점 계산 (부드러운 곡선을 위해)
      const midX = round((curr.x + next.x) / 2, precision);
      const midY = round((curr.y + next.y) / 2, precision);

      // Quadratic Bezier: Q controlX controlY, endX endY
      pathParts.push(`Q ${round(curr.x, precision)} ${round(curr.y, precision)}, ${midX} ${midY}`);
    }

    // 마지막 점까지 연결
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    pathParts.push(`Q ${round(secondLast.x, precision)} ${round(secondLast.y, precision)}, ${round(last.x, precision)} ${round(last.y, precision)}`);
  }

  return pathParts.join(" ");
}

/**
 * Pressure 기반 가변 폭 path 생성 (선택적)
 * stroke-width 속성 대신 filled path로 두께 표현
 */
function strokeToVariableWidthPath(
  stroke: Stroke,
  options: SVGOptions
): string {
  const { points } = stroke;
  const { baseStrokeWidth, pressureMultiplier, precision } = options;

  if (points.length < 2) return "";

  // 상단 경계와 하단 경계를 따로 계산
  const upperPath: { x: number; y: number }[] = [];
  const lowerPath: { x: number; y: number }[] = [];

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const width = (baseStrokeWidth + point.pressure * pressureMultiplier) / 2;

    // 방향 벡터 계산
    let dx: number, dy: number;
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

    // 수직 벡터 (정규화)
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) {
      upperPath.push({ x: point.x, y: point.y - width });
      lowerPath.push({ x: point.x, y: point.y + width });
    } else {
      const nx = -dy / length;
      const ny = dx / length;

      upperPath.push({
        x: round(point.x + nx * width, precision),
        y: round(point.y + ny * width, precision),
      });
      lowerPath.push({
        x: round(point.x - nx * width, precision),
        y: round(point.y - ny * width, precision),
      });
    }
  }

  // 상단 → 끝 → 하단(역순) → 시작으로 닫힌 path 생성
  const pathParts: string[] = [];

  // 상단 경로
  pathParts.push(`M ${upperPath[0].x} ${upperPath[0].y}`);
  for (let i = 1; i < upperPath.length; i++) {
    pathParts.push(`L ${upperPath[i].x} ${upperPath[i].y}`);
  }

  // 하단 경로 (역순)
  for (let i = lowerPath.length - 1; i >= 0; i--) {
    pathParts.push(`L ${lowerPath[i].x} ${lowerPath[i].y}`);
  }

  pathParts.push("Z"); // 닫힌 path

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

  // SVG 문자열 생성
  const pathElements: string[] = [];

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;

    if (useVariableWidth) {
      // 가변 폭 path (filled)
      const pathData = strokeToVariableWidthPath(stroke, opts);
      if (pathData) {
        pathElements.push(
          `  <path d="${pathData}" fill="${stroke.color || strokeColor}" stroke="none"/>`
        );
      }
    } else {
      // 고정 폭 path (stroked)
      const pathData = strokeToPathData(stroke, opts);
      const avgPressure = stroke.points.reduce((sum, p) => sum + p.pressure, 0) / stroke.points.length;
      const strokeWidth = baseStrokeWidth + avgPressure * pressureMultiplier;

      if (pathData) {
        pathElements.push(
          `  <path d="${pathData}" fill="none" stroke="${stroke.color || strokeColor}" stroke-width="${strokeWidth.toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}" width="${width}" height="${height}">
  <g id="strokes">
${pathElements.join("\n")}
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
