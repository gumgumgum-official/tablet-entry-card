export const GUM_SERVER_URL =
  import.meta.env.VITE_GUM_SERVER_URL || "";

// REST 요청 타임아웃 (ms)
export const GUM_SERVER_REQUEST_TIMEOUT_MS = Number(
  import.meta.env.VITE_GUM_SERVER_REQUEST_TIMEOUT_MS || 5000,
);

// 폴링 설정
export const GUM_SERVER_POLL_INTERVAL_MS = Number(
  import.meta.env.VITE_GUM_SERVER_POLL_INTERVAL_MS || 1500,
);

export const GUM_SERVER_POLL_MAX_WAIT_MS = Number(
  import.meta.env.VITE_GUM_SERVER_POLL_MAX_WAIT_MS || 60000,
);

