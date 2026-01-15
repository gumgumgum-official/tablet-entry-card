/**
 * Ramer-Douglas-Peucker (RDP) Algorithm for Stroke Simplification
 *
 * 스트로크의 점 개수를 50~70% 압축하여 렌더링 부하 방지
 * Reference: https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
 */

import type { StrokePoint, Stroke } from "./types";

/**
 * 점과 선분 사이의 수직 거리 계산
 */
function perpendicularDistance(
  point: StrokePoint,
  lineStart: StrokePoint,
  lineEnd: StrokePoint
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // 선분의 길이가 0인 경우 (시작점과 끝점이 같은 경우)
  const lineLengthSquared = dx * dx + dy * dy;
  if (lineLengthSquared === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  // 수직 거리 계산 (면적 공식 사용)
  const numerator = Math.abs(
    dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  const denominator = Math.sqrt(lineLengthSquared);

  return numerator / denominator;
}

/**
 * RDP 알고리즘으로 포인트 배열 단순화 (재귀)
 */
function rdpSimplify(
  points: StrokePoint[],
  epsilon: number
): StrokePoint[] {
  if (points.length < 3) {
    return points;
  }

  // 시작점과 끝점을 잇는 선분에서 가장 먼 점 찾기
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // 최대 거리가 epsilon보다 크면 분할 후 재귀
  if (maxDistance > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIndex + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIndex), epsilon);

    // 중복 제거 (maxIndex 점이 양쪽에 포함됨)
    return [...left.slice(0, -1), ...right];
  }

  // epsilon보다 작으면 시작점과 끝점만 유지
  return [start, end];
}

/**
 * 적응형 epsilon 계산
 * 스트로크의 바운딩 박스 크기에 따라 epsilon 조정
 */
function calculateAdaptiveEpsilon(
  points: StrokePoint[],
  targetReduction: number = 0.6 // 60% 압축 목표
): number {
  if (points.length < 3) return 1;

  // 바운딩 박스 계산
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.sqrt(width * width + height * height);

  // 대각선 길이의 0.5~2% 정도를 epsilon으로 사용
  // 목표 압축률에 따라 조정
  const baseEpsilon = diagonal * 0.01 * (targetReduction / 0.5);

  return Math.max(baseEpsilon, 0.5); // 최소 0.5px
}

/**
 * 단일 스트로크 단순화
 */
export function simplifyStroke(
  stroke: Stroke,
  epsilon?: number
): Stroke {
  const adaptiveEpsilon = epsilon ?? calculateAdaptiveEpsilon(stroke.points);
  const simplifiedPoints = rdpSimplify(stroke.points, adaptiveEpsilon);

  return {
    ...stroke,
    points: simplifiedPoints,
  };
}

/**
 * 여러 스트로크 일괄 단순화
 */
export function simplifyStrokes(
  strokes: Stroke[],
  epsilon?: number
): Stroke[] {
  return strokes.map((stroke) => simplifyStroke(stroke, epsilon));
}

/**
 * 압축 통계 계산
 */
export function getCompressionStats(
  original: Stroke[],
  simplified: Stroke[]
): {
  originalPoints: number;
  simplifiedPoints: number;
  reductionPercent: number;
} {
  const originalPoints = original.reduce((sum, s) => sum + s.points.length, 0);
  const simplifiedPoints = simplified.reduce((sum, s) => sum + s.points.length, 0);
  const reductionPercent = originalPoints > 0
    ? ((originalPoints - simplifiedPoints) / originalPoints) * 100
    : 0;

  return {
    originalPoints,
    simplifiedPoints,
    reductionPercent,
  };
}
