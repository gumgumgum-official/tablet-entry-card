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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
