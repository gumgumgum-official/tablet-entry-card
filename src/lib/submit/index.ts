/**
 * Submit Module
 * 
 * 캔버스 필기 데이터를 Edge Function으로 전송하는 모듈
 */

// Types
export type {
  SubmitPoint,
  CanvasSize,
  SubmitMeta,
  SubmitPayload,
  SubmitResponse,
  SubmitResult,
  QueueItem,
  SubmitStatus,
} from './types';

// Config
export {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  FUNCTION_NAME,
  SESSION_ID,
  getEdgeFunctionUrl,
  SUBMIT_CONFIG,
  OPTIMIZER_CONFIG,
} from './config';

// Client ID
export {
  getClientId,
  resetClientId,
} from './client-id';

// Idempotency
export { generateIdempotencyKey } from './idempotency';

// Optimizer
export {
  optimizeStrokes,
  getOptimizeStats,
  type OptimizeStats,
} from './optimizer';

// Queue
export {
  getQueue,
  addToQueue,
  removeFromQueue,
  incrementAttempts,
  getPendingItems,
  clearQueue,
  getQueueSize,
} from './queue';

// Submit
export {
  submitStrokes,
  retryQueuedItem,
  type SubmitOptions,
} from './submit';

// Session
export {
  getSessionId,
  setSessionId,
} from './session';
