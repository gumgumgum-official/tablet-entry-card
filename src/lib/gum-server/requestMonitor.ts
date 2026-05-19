import {
  GUM_SERVER_POLL_INTERVAL_MS,
  GUM_SERVER_POLL_MAX_WAIT_MS,
  GUM_SERVER_REQUEST_TIMEOUT_MS,
  GUM_SERVER_URL,
} from "./config";

/** 요구사항: worryId, svgUrl·sessionId null 허용, clientId는 대기열 재조회용 */
export type RequestMonitorAssignmentPayload = {
  worryId: string;
  /** 모니터 「N번째」문구용 — `worryId`가 긴 Edge id일 때 서버가 내려줌 */
  displaySeq?: number;
  svgUrl?: string | null;
  sessionId?: string | null;
  clientId?: string;
};

type RequestMonitorResponse = {
  assigned?: boolean;
  monitorId?: string;
  monitorNumber?: number;
  position?: "left" | "right" | string;
  queuePosition?: number;
  clientId?: string;
  message?: string;
  state?: "pending" | "assigned" | "expired" | string;
};

type QueuePositionResponse = {
  queuePosition?: number;
  assigned?: boolean;
  monitorId?: string;
  monitorNumber?: number;
  message?: string;
};

export type RequestMonitorResult = {
  ok: boolean;
  assigned: boolean;
  state: "pending" | "assigned" | "expired" | "failed";
  monitorId?: string;
  monitorNumber?: number;
  /** 서버 `message` 또는 monitorNumber 기반 안내용 */
  position?: string;
  /** 서버 응답 `message` (왼쪽/오른쪽 이모지 문구 등) */
  serverMessage?: string;
  queuePosition?: number;
  /**
   * 대기열 폴링 중 queuePosition이 0이 됨(대기 종료·만료 등).
   * 태블릿에는 푸시 없음 — 현장 안내 UX용 (요구사항.md)
   */
  queueLeftWithoutAssignment?: boolean;
  /** 진단용: ok=false일 때 실제 에러 메시지 */
  debugError?: string;
};

/** 요구사항: base URL 끝 `/` 제거 */
function gumServerBase(): string {
  return (GUM_SERVER_URL || "").replace(/\/$/, "");
}

function buildUrl(path: string): string {
  return `${gumServerBase()}${path}`;
}

/** 서버로 로그 전송 (아이패드 콘솔 대체) — 실패해도 무시 */
function remoteLog(level: "info" | "warn" | "error", message: string, data?: unknown): void {
  const base = gumServerBase();
  if (!base) return;
  fetch(`${base}/api/debug-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, message, data }),
  }).catch(() => {});
}

function withTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  controller.signal.addEventListener("abort", () => clearTimeout(timeout), {
    once: true,
  });
  return controller.signal;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function positionFromMonitorNumber(n?: number): "left" | "right" | undefined {
  if (n === 1) return "left";
  if (n === 2) return "right";
  return undefined;
}

function normalizeAssignedState(
  response: RequestMonitorResponse | null
): RequestMonitorResult {
  if (!response) {
    return { ok: false, assigned: false, state: "failed" };
  }

  const state = response.state;
  const pos = response.position ?? positionFromMonitorNumber(response.monitorNumber);

  if (state === "assigned" || response.assigned === true) {
    return {
      ok: true,
      assigned: true,
      state: "assigned",
      monitorId: response.monitorId,
      monitorNumber: response.monitorNumber,
      position: pos,
      serverMessage: response.message,
      queuePosition: response.queuePosition,
    };
  }
  if (state === "expired") {
    return {
      ok: true,
      assigned: false,
      state: "expired",
      monitorId: response.monitorId,
      monitorNumber: response.monitorNumber,
      position: pos,
      serverMessage: response.message,
      queuePosition: response.queuePosition,
    };
  }
  return {
    ok: true,
    assigned: false,
    state: "pending",
    monitorId: response.monitorId,
    monitorNumber: response.monitorNumber,
    position: pos,
    serverMessage: response.message,
    queuePosition: response.queuePosition,
  };
}

async function getQueuePosition(clientId: string): Promise<QueuePositionResponse | null> {
  const response = await fetch(
    buildUrl(`/api/queue/position?clientId=${encodeURIComponent(clientId)}`),
    {
      method: "GET",
      signal: withTimeoutSignal(GUM_SERVER_REQUEST_TIMEOUT_MS),
    }
  );
  if (!response.ok) return null;
  return (await response.json()) as QueuePositionResponse;
}

/**
 * 태블릿: `POST /api/request-monitor` + (대기 시) `GET /api/queue/position` 만 사용.
 * `GET /status`, 모니터용 `/current`·`/start`·`/complete` 는 호출하지 않음 (요구사항.md).
 * @param onQueuePosition 폴링 중 위치 변경 시마다 호출 (실시간 UI 업데이트용)
 */
export async function requestMonitorAssignment(
  payload: RequestMonitorAssignmentPayload,
  onQueuePosition?: (position: number) => void
): Promise<RequestMonitorResult> {
  if (!GUM_SERVER_URL) {
    console.warn("[gum_server] VITE_GUM_SERVER_URL 미설정: REST 요청을 생략합니다.");
    return { ok: false, assigned: false, state: "failed", debugError: "VITE_GUM_SERVER_URL 미설정" };
  }

  const body: Record<string, unknown> = {
    worryId: payload.worryId,
    svgUrl: payload.svgUrl ?? null,
    sessionId: payload.sessionId ?? null,
  };
  if (
    typeof payload.displaySeq === "number" &&
    Number.isInteger(payload.displaySeq) &&
    payload.displaySeq >= 1
  ) {
    body.displaySeq = payload.displaySeq;
  }
  if (payload.clientId !== undefined && payload.clientId !== "") {
    body.clientId = payload.clientId;
  }

  const requestUrl = buildUrl("/api/request-monitor");
  remoteLog("info", "request-monitor 호출 시작", { url: requestUrl, body });

  try {
    const postResponse = await fetch(requestUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: withTimeoutSignal(GUM_SERVER_REQUEST_TIMEOUT_MS),
    });

    remoteLog("info", "request-monitor 응답 수신", { status: postResponse.status, ok: postResponse.ok });

    if (!postResponse.ok) {
      const text = await postResponse.text().catch(() => "");
      console.warn("[gum_server] POST /api/request-monitor 실패:", postResponse.status, text);
      remoteLog("error", "request-monitor HTTP 에러", { status: postResponse.status, body: text });
      return { ok: false, assigned: false, state: "failed", debugError: `HTTP ${postResponse.status}: ${text}` };
    }

    const initial = (await postResponse.json()) as RequestMonitorResponse & { queueFull?: boolean };
    remoteLog("info", "request-monitor 응답 파싱 완료", { initial });

    if (initial.queueFull) {
      remoteLog("warn", "request-monitor queueFull");
      return { ok: true, assigned: false, state: "pending", queuePosition: -1 };
    }
    const normalizedInitial = normalizeAssignedState(initial);
    if (normalizedInitial.assigned || normalizedInitial.state === "expired") {
      remoteLog("info", "request-monitor 즉시 배정/만료", { state: normalizedInitial.state });
      return normalizedInitial;
    }

    const pollingClientId = initial.clientId || payload.clientId;
    if (!pollingClientId) {
      remoteLog("warn", "request-monitor pollingClientId 없음 — 폴링 생략");
      return {
        ok: true,
        assigned: false,
        state: "pending",
        queuePosition: initial.queuePosition,
        serverMessage: initial.message,
      };
    }

    let lastQueuePosition =
      typeof initial.queuePosition === "number" ? initial.queuePosition : 0;
    onQueuePosition?.(lastQueuePosition);
    remoteLog("info", "request-monitor 대기열 폴링 시작", { pollingClientId, queuePosition: lastQueuePosition });

    const startedAt = Date.now();
    while (Date.now() - startedAt < GUM_SERVER_POLL_MAX_WAIT_MS) {
      await sleep(GUM_SERVER_POLL_INTERVAL_MS);

      try {
        const queue = await getQueuePosition(pollingClientId);
        if (!queue || typeof queue.queuePosition !== "number") {
          continue;
        }
        lastQueuePosition = queue.queuePosition;
        onQueuePosition?.(queue.queuePosition);
        remoteLog("info", "queue/position 폴링", { queuePosition: queue.queuePosition, assigned: queue.assigned });
        if (queue.queuePosition === 0) {
          if (queue.assigned) {
            remoteLog("info", "대기열 배정 완료", { monitorId: queue.monitorId });
            return {
              ok: true,
              assigned: true,
              state: "assigned",
              monitorId: queue.monitorId,
              monitorNumber: queue.monitorNumber,
              serverMessage: queue.message,
            };
          }
          remoteLog("warn", "대기열 종료 — 배정 없이 queuePosition=0");
          return {
            ok: true,
            assigned: false,
            state: "pending",
            queuePosition: 0,
            queueLeftWithoutAssignment: true,
          };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn("[gum_server] queue/position 폴링 오류:", error);
        remoteLog("warn", "queue/position 폴링 오류", { error: msg });
      }
    }

    return {
      ok: true,
      assigned: false,
      state: "pending",
      queuePosition: lastQueuePosition,
    };
    remoteLog("warn", "request-monitor 폴링 타임아웃", { lastQueuePosition, elapsed: GUM_SERVER_POLL_MAX_WAIT_MS });
    return {
      ok: true,
      assigned: false,
      state: "pending",
      queuePosition: lastQueuePosition,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.warn("[gum_server] request-monitor REST 호출 실패:", error);
    remoteLog("error", "request-monitor fetch 실패", { error: msg, stack });
    return { ok: false, assigned: false, state: "failed", debugError: msg };
  }
}
