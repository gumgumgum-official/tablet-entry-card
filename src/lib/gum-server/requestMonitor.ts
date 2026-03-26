import {
  GUM_SERVER_POLL_INTERVAL_MS,
  GUM_SERVER_POLL_MAX_WAIT_MS,
  GUM_SERVER_REQUEST_TIMEOUT_MS,
  GUM_SERVER_URL,
} from "./config";

export type RequestMonitorAssignmentPayload = {
  worryId: string;
  svgUrl: string;
  sessionId?: string;
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

type ServerStatusResponse = {
  monitors?: Record<
    string,
    {
      status?: "idle" | "busy" | string;
      clientId?: string | null;
    }
  >;
};

export type RequestMonitorResult = {
  ok: boolean;
  assigned: boolean;
  state: "pending" | "assigned" | "expired" | "failed";
  monitorId?: string;
  monitorNumber?: number;
  position?: string;
  queuePosition?: number;
};

function buildUrl(path: string): string {
  return `${GUM_SERVER_URL}${path}`;
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

function normalizeAssignedState(
  response: RequestMonitorResponse | null
): RequestMonitorResult {
  if (!response) {
    return { ok: false, assigned: false, state: "failed" };
  }

  const state = response.state;
  if (state === "assigned" || response.assigned === true) {
    return {
      ok: true,
      assigned: true,
      state: "assigned",
      monitorId: response.monitorId,
      position: response.position,
      monitorNumber: response.monitorNumber,
      queuePosition: response.queuePosition,
    };
  }
  if (state === "expired") {
    return {
      ok: true,
      assigned: false,
      state: "expired",
      monitorId: response.monitorId,
      position: response.position,
      monitorNumber: response.monitorNumber,
      queuePosition: response.queuePosition,
    };
  }
  return {
    ok: true,
    assigned: false,
    state: "pending",
    monitorId: response.monitorId,
    position: response.position,
    monitorNumber: response.monitorNumber,
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

async function getServerStatus(): Promise<ServerStatusResponse | null> {
  const response = await fetch(buildUrl("/status"), {
    method: "GET",
    signal: withTimeoutSignal(GUM_SERVER_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  return (await response.json()) as ServerStatusResponse;
}

function findAssignedMonitorByClientId(
  status: ServerStatusResponse | null,
  clientId: string
): { monitorId?: string; monitorNumber?: number; position?: "left" | "right" } | null {
  if (!status?.monitors) return null;
  for (const [monitorId, monitor] of Object.entries(status.monitors)) {
    if (monitor?.clientId === clientId) {
      const monitorNumberMatch = monitorId.match(/\d+/);
      const monitorNumber = monitorNumberMatch ? Number(monitorNumberMatch[0]) : undefined;
      const position =
        monitorNumber === 1 ? "left" : monitorNumber === 2 ? "right" : undefined;
      return { monitorId, monitorNumber, position };
    }
  }
  return null;
}

/**
 * gum_server에 REST로 모니터 배정 요청 후, 배정 전이면 폴링
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

  try {
    const postResponse = await fetch(buildUrl("/api/request-monitor"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: withTimeoutSignal(GUM_SERVER_REQUEST_TIMEOUT_MS),
    });

    if (!postResponse.ok) {
      const body = await postResponse.text().catch(() => "");
      console.warn("[gum_server] POST /api/request-monitor 실패:", postResponse.status, body);
      return { ok: false, assigned: false, state: "failed" };
    }

    const initial = (await postResponse.json()) as RequestMonitorResponse;
    const normalizedInitial = normalizeAssignedState(initial);
    if (normalizedInitial.assigned || normalizedInitial.state === "expired") {
      return normalizedInitial;
    }

    const pollingClientId = initial.clientId || payload.clientId;
    if (!pollingClientId) {
      // API.md 기준으론 assigned:false 응답에 clientId가 포함되지만, 방어적으로 처리
      return { ok: true, assigned: false, state: "pending", queuePosition: initial.queuePosition };
    }

    // pending이면 폴링
    const startedAt = Date.now();
    while (Date.now() - startedAt < GUM_SERVER_POLL_MAX_WAIT_MS) {
      await sleep(GUM_SERVER_POLL_INTERVAL_MS);

      try {
        const queue = await getQueuePosition(pollingClientId);
        if (typeof queue?.queuePosition === "number" && queue.queuePosition > 0) {
          continue;
        }

        // queuePosition이 0이면 대기열에서 빠진 상태: /status에서 실제 배정 monitor 확인
        const status = await getServerStatus();
        const assigned = findAssignedMonitorByClientId(status, pollingClientId);
        if (assigned?.monitorId) {
          return {
            ok: true,
            assigned: true,
            state: "assigned",
            monitorId: assigned.monitorId,
            monitorNumber: assigned.monitorNumber,
            position: assigned.position,
            queuePosition: 0,
          };
        }
      } catch (error) {
        console.warn("[gum_server] polling 오류:", error);
      }
    }

    return { ok: true, assigned: false, state: "pending" };
  } catch (error) {
    console.warn("[gum_server] request-monitor REST 호출 실패:", error);
    return { ok: false, assigned: false, state: "failed" };
  }
}

