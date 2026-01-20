/**
 * Submit Module Types
 * 
 * 캔버스 필기 데이터 전송 관련 타입 정의
 */

/** 스트로크 포인트 (전송용) */
export interface SubmitPoint {
  x: number;
  y: number;
  t: number;  // timestamp
  p: number;  // pressure (0-1)
}

/** 캔버스 크기 정보 */
export interface CanvasSize {
  width: number;
  height: number;
}

/** 메타데이터 */
export interface SubmitMeta {
  createdAt: string;  // ISO 8601
  color: string;
  baseStrokeWidth: number;
}

/** Edge Function 요청 페이로드 */
export interface SubmitPayload {
  sessionId: string;
  clientId: string;
  idempotencyKey: string;
  canvas: CanvasSize;
  strokes: SubmitPoint[][];
  meta: SubmitMeta;
}

/** Edge Function 응답 */
export interface SubmitResponse {
  id: string;
  storagePathSvg: string;
  broadcasted: boolean;
}

/** 전송 결과 */
export interface SubmitResult {
  success: boolean;
  data?: SubmitResponse;
  error?: string;
  queued?: boolean;
}

/** Offline Queue 아이템 */
export interface QueueItem {
  id: string;
  payload: SubmitPayload;
  attempts: number;
  lastAttempt: number;
  createdAt: number;
}

/** 전송 상태 */
export type SubmitStatus = 
  | 'idle'
  | 'validating'
  | 'optimizing'
  | 'submitting'
  | 'retrying'
  | 'success'
  | 'queued'
  | 'error';
