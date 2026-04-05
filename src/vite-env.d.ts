/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase Project URL */
  readonly VITE_SUPABASE_URL: string;
  
  /** Supabase Anon Key (public) */
  readonly VITE_SUPABASE_ANON_KEY: string;
  
  /** Supabase Publishable Key (alias for ANON_KEY) */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  
  /** Edge Function Name */
  readonly VITE_FUNCTION_NAME: string;
  
  /** Session ID for exhibition */
  readonly VITE_SESSION_ID: string;

  /** gum_server socket.io URL (예: http://localhost:3000) */
  readonly VITE_GUM_SERVER_URL: string;

  /** request-monitor 전송 타임아웃(ms) */
  readonly VITE_GUM_SERVER_REQUEST_TIMEOUT_MS?: string;

  /** monitor status polling 간격(ms) */
  readonly VITE_GUM_SERVER_POLL_INTERVAL_MS?: string;

  /** monitor status polling 최대 대기(ms) */
  readonly VITE_GUM_SERVER_POLL_MAX_WAIT_MS?: string;

  /**
   * 프로덕션에서 `pointerType === "touch"` 도 필기 시작으로 허용 (기본: 미설정 시 비허용).
   * Vercel 등에 `true` 또는 `1` 로 설정. 애플펜슬이 touch로 보고되는 환경용.
   */
  readonly VITE_ALLOW_TOUCH_AS_PEN?: string;

  /**
   * 프로덕션에서 `pointerType === "mouse"` 도 필기 시작으로 허용 (기본: 미설정 시 비허용).
   */
  readonly VITE_ALLOW_MOUSE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
