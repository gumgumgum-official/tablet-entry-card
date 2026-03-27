import {
  GUM_SERVER_POLL_INTERVAL_MS,
  GUM_SERVER_POLL_MAX_WAIT_MS,
  GUM_SERVER_REQUEST_TIMEOUT_MS,
  GUM_SERVER_URL,
} from "./config";

/** 요구사항: worryId, svgUrl·sessionId null 허용, clientId는 대기열 재조회용 */
export type RequestMonitorAssignmentPayload = {
  worryId: string;
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
};

/** 요구사항: base URL 끝 `/` 제거 */
function gumServerBase(): string {
  return (GUM_SERVER_URL || "").replace(/\/$/, "");
}

function buildUrl(path: string): string {
  return `${gumServerBase()}${path}`;
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
 */
export async function requestMonitorAssignment(
  payload: RequestMonitorAssignmentPayload
): Promise<RequestMonitorResult> {
  if (!GUM_SERVER_URL) {
    console.warn(
      "[gum_server] VITE_GUM_SERVER_URL 미설정: REST 요청을 생략합니다."
    );
    return { ok: false, assigned: false, state: "failed" };
  }

  const body: Record<string, unknown> = {
    worryId: payload.worryId,
    svgUrl: payload.svgUrl ?? null,
    sessionId: payload.sessionId ?? null,
  };
  if (payload.clientId !== undefined && payload.clientId !== "") {
    body.clientId = payload.clientId;
  }

  try {
    const postResponse = await fetch(buildUrl("/api/request-monitor"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: withTimeoutSignal(GUM_SERVER_REQUEST_TIMEOUT_MS),
    });

    if (!postResponse.ok) {
      const text = await postResponse.text().catch(() => "");
      console.warn("[gum_server] POST /api/request-monitor 실패:", postResponse.status, text);
      return { ok: false, assigned: false, state: "failed" };
    }

    const initial = (await postResponse.json()) as RequestMonitorResponse;
    const normalizedInitial = normalizeAssignedState(initial);
    if (normalizedInitial.assigned || normalizedInitial.state === "expired") {
      return normalizedInitial;
    }

    const pollingClientId = initial.clientId || payload.clientId;
    if (!pollingClientId) {
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

    const startedAt = Date.now();
    while (Date.now() - startedAt < GUM_SERVER_POLL_MAX_WAIT_MS) {
      await sleep(GUM_SERVER_POLL_INTERVAL_MS);

      try {
        const queue = await getQueuePosition(pollingClientId);
        if (!queue || typeof queue.queuePosition !== "number") {
          continue;
        }
        lastQueuePosition = queue.queuePosition;
        if (queue.queuePosition === 0) {
          return {
            ok: true,
            assigned: false,
            state: "pending",
            queuePosition: 0,
            queueLeftWithoutAssignment: true,
          };
        }
      } catch (error) {
        console.warn("[gum_server] queue/position 폴링 오류:", error);
      }
    }

    return {
      ok: true,
      assigned: false,
      state: "pending",
      queuePosition: lastQueuePosition,
    };
  } catch (error) {
    console.warn("[gum_server] request-monitor REST 호출 실패:", error);
    return { ok: false, assigned: false, state: "failed" };
  }
}
