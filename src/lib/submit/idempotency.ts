/**
 * Idempotency Key Generator
 * 
 * 중복 전송 방지를 위한 고유 키 생성
 */

import type { SubmitPoint } from './types';

/** 간단한 해시 함수 (djb2) */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

/** Strokes 해시 생성 */
function hashStrokes(strokes: SubmitPoint[][]): string {
  // 첫 포인트와 마지막 포인트, 총 개수를 조합하여 해시
  const summary = strokes.map(stroke => {
    if (stroke.length === 0) return '0';
    const first = stroke[0];
    const last = stroke[stroke.length - 1];
    return `${stroke.length}:${Math.round(first.x)}:${Math.round(first.y)}:${Math.round(last.x)}:${Math.round(last.y)}`;
  }).join('|');
  
  return simpleHash(summary);
}

/** Idempotency Key 생성 */
export function generateIdempotencyKey(
  clientId: string,
  createdAt: string,
  strokes: SubmitPoint[][]
): string {
  const strokesHash = hashStrokes(strokes);
  return `${clientId}_${createdAt}_${strokesHash}`;
}
