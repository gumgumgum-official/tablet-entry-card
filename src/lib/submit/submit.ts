/**
 * Submit Service
 * 
 * Edge Function 호출 및 재시도 로직
 */

import type { SubmitPayload, SubmitResult, SubmitResponse, SubmitPoint } from './types';
import { 
  getEdgeFunctionUrl, 
  SUPABASE_ANON_KEY, 
  SUBMIT_CONFIG, 
  SESSION_ID 
} from './config';
import { getClientId } from './client-id';
import { generateIdempotencyKey } from './idempotency';
import { optimizeStrokes, getOptimizeStats } from './optimizer';
import { addToQueue } from './queue';

/** 타임아웃 Promise */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), ms)
    ),
  ]);
}

/** 대기 함수 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** HTTP 요청 실행 */
async function executeRequest(payload: SubmitPayload): Promise<SubmitResponse> {
  const url = getEdgeFunctionUrl();
  
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    SUBMIT_CONFIG.timeout
  );
  
  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }
  
  return response.json();
}

/** 재시도 로직 포함 요청 */
async function requestWithRetry(payload: SubmitPayload): Promise<SubmitResponse> {
  const { maxRetries, retryBackoff } = SUBMIT_CONFIG;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await executeRequest(payload);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 마지막 시도거나 재시도 불가능한 에러면 중단
      const isRetryable = lastError.message.includes('timeout') || 
                          lastError.message.includes('5');
      
      if (attempt >= maxRetries || !isRetryable) {
        break;
      }
      
      // 백오프 대기
      const backoffMs = retryBackoff[attempt] || retryBackoff[retryBackoff.length - 1];
      console.log(`[Submit] Retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms`);
      await delay(backoffMs);
    }
  }
  
  throw lastError || new Error('Request failed');
}

/** Strokes 전송 옵션 */
export interface SubmitOptions {
  /** 세션 ID (기본값: 환경변수) */
  sessionId?: string;
  /** 선 색상 */
  color?: string;
  /** 선 두께 */
  baseStrokeWidth?: number;
  /** 캔버스 크기 */
  canvas: { width: number; height: number };
  /** 실패 시 큐에 저장 여부 */
  saveToQueueOnFailure?: boolean;
}

/** 
 * 캔버스 strokes를 Edge Function으로 전송
 * 
 * @param strokes - Point[][] 형태의 strokes 배열
 * @param options - 전송 옵션
 * @returns 전송 결과
 */
export async function submitStrokes(
  strokes: SubmitPoint[][],
  options: SubmitOptions
): Promise<SubmitResult> {
  const {
    sessionId = SESSION_ID,
    color = SUBMIT_CONFIG.defaultColor,
    baseStrokeWidth = SUBMIT_CONFIG.defaultStrokeWidth,
    canvas,
    saveToQueueOnFailure = true,
  } = options;
  
  // 1. 검증
  if (strokes.length === 0) {
    return {
      success: false,
      error: '전송할 내용이 없습니다.',
    };
  }
  
  const totalPoints = strokes.reduce((sum, s) => sum + s.length, 0);
  if (totalPoints === 0) {
    return {
      success: false,
      error: '전송할 내용이 없습니다.',
    };
  }
  
  // 2. 최적화
  const optimized = optimizeStrokes(strokes);
  const stats = getOptimizeStats(strokes, optimized);
  
  console.log('[Submit] Optimize stats:', {
    strokes: `${stats.originalStrokes} → ${stats.optimizedStrokes}`,
    points: `${stats.originalPoints} → ${stats.optimizedPoints}`,
    reduction: `${stats.reductionPercent.toFixed(1)}%`,
    bytes: stats.payloadBytes,
  });
  
  // 3. Payload 생성
  const clientId = getClientId();
  const createdAt = new Date().toISOString();
  const idempotencyKey = generateIdempotencyKey(clientId, createdAt, optimized);
  
  const payload: SubmitPayload = {
    sessionId,
    clientId,
    idempotencyKey,
    canvas,
    strokes: optimized,
    meta: {
      createdAt,
      color,
      baseStrokeWidth,
    },
  };
  
  // 4. 전송
  try {
    const response = await requestWithRetry(payload);
    
    console.log('[Submit] Success:', response);
    
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Submit] Failed:', errorMessage);
    
    // 5. 실패 시 큐에 저장
    if (saveToQueueOnFailure) {
      addToQueue(payload);
      console.log('[Submit] Saved to offline queue');
      
      return {
        success: false,
        error: errorMessage,
        queued: true,
      };
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/** 대기열 아이템 재전송 */
export async function retryQueuedItem(payload: SubmitPayload): Promise<SubmitResult> {
  try {
    const response = await requestWithRetry(payload);
    return {
      success: true,
      data: response,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
