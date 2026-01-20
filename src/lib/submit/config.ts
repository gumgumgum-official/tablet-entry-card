/**
 * Submit Configuration
 * 
 * 환경변수 및 기본 설정값
 */

/** Supabase URL */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

/** Supabase Anon Key (public) */
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

/** Edge Function 이름 */
export const FUNCTION_NAME = import.meta.env.VITE_FUNCTION_NAME || 'handwriting-to-svg';

/** 세션 ID */
export const SESSION_ID = import.meta.env.VITE_SESSION_ID || 'default-session';

/** Edge Function URL */
export function getEdgeFunctionUrl(): string {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL is not configured');
  }
  return `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;
}

/** 전송 설정 */
export const SUBMIT_CONFIG = {
  /** 요청 타임아웃 (ms) */
  timeout: 8000,
  
  /** 최대 재시도 횟수 */
  maxRetries: 2,
  
  /** 재시도 백오프 (ms) */
  retryBackoff: [300, 700],
  
  /** 기본 선 색상 */
  defaultColor: '#000000',
  
  /** 기본 선 두께 */
  defaultStrokeWidth: 12,
} as const;

/** Optimizer 설정 */
export const OPTIMIZER_CONFIG = {
  /** 최소 샘플링 거리 (px) */
  minDistDefault: 2,
  
  /** 포인트 과다 시 샘플링 거리 (px) */
  minDistHigh: 4,
  
  /** stroke당 최대 포인트 수 */
  maxPointsPerStroke: 800,
  
  /** 포인트 과다 판단 기준 */
  highPointsThreshold: 500,
  
  /** pressure 소수점 자릿수 */
  pressurePrecision: 2,
} as const;

/** LocalStorage 키 */
export const STORAGE_KEYS = {
  clientId: 'tablet-entry-client-id',
  offlineQueue: 'tablet-entry-offline-queue',
} as const;
