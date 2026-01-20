/**
 * Client ID Management
 * 
 * 클라이언트 고유 ID 생성 및 관리
 */

import { STORAGE_KEYS } from './config';

/** UUID v4 생성 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/** 클라이언트 ID 가져오기 (없으면 생성) */
export function getClientId(): string {
  if (typeof window === 'undefined') {
    return generateUUID();
  }

  let clientId = localStorage.getItem(STORAGE_KEYS.clientId);
  
  if (!clientId) {
    clientId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.clientId, clientId);
  }
  
  return clientId;
}

/** 클라이언트 ID 초기화 (테스트용) */
export function resetClientId(): string {
  const newId = generateUUID();
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.clientId, newId);
  }
  return newId;
}
