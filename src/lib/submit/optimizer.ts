/**
 * Payload Optimizer
 * 
 * 전송 전 strokes 데이터 경량화
 */

import type { SubmitPoint } from './types';
import { OPTIMIZER_CONFIG } from './config';

/** 거리 계산 */
function distance(p1: SubmitPoint, p2: SubmitPoint): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** 거리 기반 샘플링 */
function sampleByDistance(points: SubmitPoint[], minDist: number): SubmitPoint[] {
  if (points.length <= 2) return points;
  
  const result: SubmitPoint[] = [points[0]];
  let lastAdded = points[0];
  
  for (let i = 1; i < points.length - 1; i++) {
    if (distance(points[i], lastAdded) >= minDist) {
      result.push(points[i]);
      lastAdded = points[i];
    }
  }
  
  // 마지막 포인트는 항상 포함
  result.push(points[points.length - 1]);
  
  return result;
}

/** 단일 stroke 최적화 */
function optimizeStroke(points: SubmitPoint[]): SubmitPoint[] {
  const {
    minDistDefault,
    minDistHigh,
    maxPointsPerStroke,
    highPointsThreshold,
    pressurePrecision,
  } = OPTIMIZER_CONFIG;
  
  // 1. 샘플링 거리 결정
  const minDist = points.length > highPointsThreshold ? minDistHigh : minDistDefault;
  
  // 2. 거리 기반 샘플링
  let sampled = sampleByDistance(points, minDist);
  
  // 3. 최대 포인트 수 제한
  if (sampled.length > maxPointsPerStroke) {
    const ratio = maxPointsPerStroke / sampled.length;
    const newSampled: SubmitPoint[] = [sampled[0]];
    
    for (let i = 1; i < sampled.length - 1; i++) {
      if (Math.random() < ratio) {
        newSampled.push(sampled[i]);
      }
    }
    
    newSampled.push(sampled[sampled.length - 1]);
    sampled = newSampled;
  }
  
  // 4. 값 정규화 (정수 반올림, pressure 소수점 제한)
  const factor = Math.pow(10, pressurePrecision);
  
  return sampled.map(p => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
    t: Math.round(p.t),
    p: Math.round(p.p * factor) / factor,
  }));
}

/** 전체 strokes 최적화 */
export function optimizeStrokes(strokes: SubmitPoint[][]): SubmitPoint[][] {
  return strokes
    .filter(stroke => stroke.length > 0)
    .map(optimizeStroke);
}

/** 최적화 통계 */
export interface OptimizeStats {
  originalStrokes: number;
  optimizedStrokes: number;
  originalPoints: number;
  optimizedPoints: number;
  payloadBytes: number;
  reductionPercent: number;
}

/** 최적화 통계 계산 */
export function getOptimizeStats(
  original: SubmitPoint[][],
  optimized: SubmitPoint[][]
): OptimizeStats {
  const originalPoints = original.reduce((sum, s) => sum + s.length, 0);
  const optimizedPoints = optimized.reduce((sum, s) => sum + s.length, 0);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(optimized)).length;
  
  return {
    originalStrokes: original.length,
    optimizedStrokes: optimized.length,
    originalPoints,
    optimizedPoints,
    payloadBytes,
    reductionPercent: originalPoints > 0 
      ? ((originalPoints - optimizedPoints) / originalPoints) * 100 
      : 0,
  };
}
