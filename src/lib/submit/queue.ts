/**
 * Offline Queue
 * 
 * 전송 실패 시 로컬 저장소에 대기열 저장
 */

import type { QueueItem, SubmitPayload } from './types';
import { STORAGE_KEYS } from './config';

/** 큐 가져오기 */
export function getQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.offlineQueue);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** 큐 저장 */
function saveQueue(queue: QueueItem[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEYS.offlineQueue, JSON.stringify(queue));
  } catch (error) {
    console.error('[OfflineQueue] Failed to save:', error);
  }
}

/** 큐에 아이템 추가 */
export function addToQueue(payload: SubmitPayload): QueueItem {
  const queue = getQueue();
  
  // 동일한 idempotencyKey가 있으면 업데이트
  const existingIndex = queue.findIndex(
    item => item.payload.idempotencyKey === payload.idempotencyKey
  );
  
  const item: QueueItem = {
    id: existingIndex >= 0 ? queue[existingIndex].id : crypto.randomUUID(),
    payload,
    attempts: existingIndex >= 0 ? queue[existingIndex].attempts : 0,
    lastAttempt: Date.now(),
    createdAt: existingIndex >= 0 ? queue[existingIndex].createdAt : Date.now(),
  };
  
  if (existingIndex >= 0) {
    queue[existingIndex] = item;
  } else {
    queue.push(item);
  }
  
  saveQueue(queue);
  return item;
}

/** 큐에서 아이템 제거 */
export function removeFromQueue(id: string): void {
  const queue = getQueue();
  const filtered = queue.filter(item => item.id !== id);
  saveQueue(filtered);
}

/** 시도 횟수 증가 */
export function incrementAttempts(id: string): void {
  const queue = getQueue();
  const item = queue.find(q => q.id === id);
  
  if (item) {
    item.attempts += 1;
    item.lastAttempt = Date.now();
    saveQueue(queue);
  }
}

/** 대기 중인 아이템 가져오기 (최대 시도 횟수 미만) */
export function getPendingItems(maxAttempts: number = 5): QueueItem[] {
  return getQueue().filter(item => item.attempts < maxAttempts);
}

/** 큐 비우기 */
export function clearQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.offlineQueue);
}

/** 큐 크기 */
export function getQueueSize(): number {
  return getQueue().length;
}
