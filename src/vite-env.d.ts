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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
