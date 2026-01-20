/**
 * Session ID Management
 * 
 * URL 파라미터 또는 환경변수에서 세션 ID 가져오기
 * 
 * 사용법:
 * - URL: ?session=exhibition-2026
 * - 환경변수: VITE_SESSION_ID=default-session
 */

import { SESSION_ID as DEFAULT_SESSION_ID } from './config';

/** URL 파라미터에서 세션 ID 가져오기 */
function getSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  const params = new URLSearchParams(window.location.search);
  return params.get('session') || params.get('sessionId');
}

/** 세션 ID 가져오기 (우선순위: URL > 환경변수 > 기본값) */
export function getSessionId(): string {
  // 1. URL 파라미터
  const urlSessionId = getSessionIdFromUrl();
  if (urlSessionId) {
    return urlSessionId;
  }
  
  // 2. 환경변수 또는 기본값
  return DEFAULT_SESSION_ID;
}

/** 세션 ID 설정 (URL 파라미터로 리다이렉트) */
export function setSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  url.searchParams.set('session', sessionId);
  window.history.replaceState({}, '', url.toString());
}
