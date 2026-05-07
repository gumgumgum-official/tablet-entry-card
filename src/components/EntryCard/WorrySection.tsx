import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import {
  submitStrokes,
  type SubmitPoint,
  type SubmitStatus,
  getQueueSize,
  getClientId,
} from "@/lib/submit";
import { requestMonitorAssignment } from "@/lib/gum-server/requestMonitor";
import { coerceDisplaySeq } from "@/lib/gum-server/displaySeq";
import { isCanvasPointerStartAllowed } from "@/lib/canvasPointer";
import { densifySegmentToSubmitPoints } from "@/lib/strokeDensify";
import { smoothStroke } from "@/lib/stroke/smoothStroke";
import { redrawInkStrokes } from "@/lib/stroke/canvasInk";
import {
  INK_LINE_CAP,
  INK_LINE_JOIN,
  INK_MITER_LIMIT,
} from "@/lib/stroke/inkStyle";

interface WorrySectionProps {
  sessionId?: string;
  /** Parent sync: true when the worry canvas has strokes and is not submitting. */
  onCanSubmitChange?: (canSubmit: boolean) => void;
}

/** WorrySection에서 노출하는 메서드 */
export interface WorrySectionHandle {
  /** strokes 데이터 가져오기 */
  getStrokes: () => SubmitPoint[][];
  /** 현재 전송 상태 */
  getSubmitStatus: () => SubmitStatus;
  /** 전송 가능 여부 */
  canSubmit: () => boolean;
  /** 전송 실행 */
  submit: () => Promise<boolean>;
  /** 캔버스 클리어 */
  clear: () => void;
}

/** 캔버스 필기 선 두께(px). SVG/Edge baseStrokeWidth와 맞춰 화면과 저장본이 일치함 */
const STROKE_WIDTH = 14;
const STROKE_COLOR = "#2E2E2E";
/** 빠른 스트로크 시 포인트 간격이 벌어지지 않도록 보간 최대 간격 (px) */
const DENSIFY_MAX_STEP = STROKE_WIDTH * 0.35;

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 280;

const WorrySection = forwardRef<WorrySectionHandle, WorrySectionProps>(
  ({ sessionId, onCanSubmitChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const [hasContent, setHasContent] = useState(false);
    const hasContentRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const canvasRectRef = useRef<DOMRect | null>(null);
    const [mode, setMode] = useState<"draw" | "erase">("draw");
    const modeRef = useRef<"draw" | "erase">("draw");
    const isSubmittingRef = useRef(false);

    // Strokes 수집
    const strokesRef = useRef<SubmitPoint[][]>([]);
    const currentStrokeRef = useRef<SubmitPoint[]>([]);

    // 전송 상태
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const isSubmitting = submitStatus === 'submitting' || submitStatus === 'retrying';

    useEffect(() => { modeRef.current = mode; }, [mode]);
    useEffect(() => { isSubmittingRef.current = isSubmitting; }, [isSubmitting]);

    useEffect(() => {
      onCanSubmitChange?.(hasContent && !isSubmitting);
    }, [hasContent, isSubmitting, onCanSubmitChange]);

    // 캔버스 초기화
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) return;
      ctxRef.current = ctx;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      canvas.style.width = `${CANVAS_WIDTH}px`;
      canvas.style.height = `${CANVAS_HEIGHT}px`;
      ctx.scale(dpr, dpr);

    }, []);

    // --- 네이티브 포인터 이벤트 리스너 (React 합성 이벤트 우회) ---
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const toPoint = (e: PointerEvent, rect: DOMRect): SubmitPoint => ({
        x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
        y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
        t: e.timeStamp,
      });

      const handlePointerDown = (e: PointerEvent) => {
        if (isSubmittingRef.current) return;
        if (!isCanvasPointerStartAllowed(e.pointerType)) return;
        e.preventDefault();

        isDrawingRef.current = true;

        if (!hasContentRef.current) {
          hasContentRef.current = true;
          setHasContent(true);
        }

        canvasRectRef.current = canvas.getBoundingClientRect();
        const rect = canvasRectRef.current;
        const pt = toPoint(e, rect);

        lastPointRef.current = { x: pt.x, y: pt.y };
        currentStrokeRef.current = [pt];

        // setPointerCapture 제거: iPadOS Safari에서 capture 해제 후
        // 다음 pointerdown 전달이 지연되는 현상 방지
      };

      const handlePointerMove = (e: PointerEvent) => {
        if (!isDrawingRef.current) return;

        const ctx = ctxRef.current;
        const rect = canvasRectRef.current;
        if (!ctx || !rect || !lastPointRef.current) return;

        const curMode = modeRef.current;
        ctx.globalCompositeOperation = curMode === "erase" ? "destination-out" : "source-over";
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineCap = INK_LINE_CAP;
        ctx.lineJoin = INK_LINE_JOIN;
        ctx.miterLimit = INK_MITER_LIMIT;

        const coalesced = "getCoalescedEvents" in e ? e.getCoalescedEvents() : null;
        const samples = coalesced && coalesced.length > 0 ? coalesced : [e];

        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const isErase = curMode === "erase";
        const eraseWidth = STROKE_WIDTH * 2;

        for (let i = 0; i < samples.length; i++) {
          const s = samples[i];
          const px = (s.clientX - rect.left) * scaleX;
          const py = (s.clientY - rect.top) * scaleY;
          const from = lastPointRef.current;
          if (!from) break;

          ctx.lineWidth = isErase ? eraseWidth : STROKE_WIDTH;

          const t0 =
            currentStrokeRef.current.length > 0
              ? currentStrokeRef.current[currentStrokeRef.current.length - 1]!.t
              : s.timeStamp;
          const densified = densifySegmentToSubmitPoints(
            from.x,
            from.y,
            t0,
            px,
            py,
            s.timeStamp,
            DENSIFY_MAX_STEP
          );

          let prev = from;
          for (const p of densified) {
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            currentStrokeRef.current.push(p);
            prev = { x: p.x, y: p.y };
          }
          lastPointRef.current = prev;
        }
      };

      const handlePointerUp = () => {
        if (!isDrawingRef.current) return;

        isDrawingRef.current = false;
        lastPointRef.current = null;

        const curMode = modeRef.current;

        if (curMode === "draw") {
          const ctxUp = ctxRef.current;
          if (currentStrokeRef.current.length > 0) {
            const smoothed = smoothStroke(currentStrokeRef.current, {
              chaikinIterations: 2,
            });
            strokesRef.current.push(smoothed);
            currentStrokeRef.current = [];
            if (ctxUp) {
              redrawInkStrokes(ctxUp, strokesRef.current, {
                canvasWidth: CANVAS_WIDTH,
                canvasHeight: CANVAS_HEIGHT,
                lineWidth: STROKE_WIDTH,
                color: STROKE_COLOR,
              });
            }
          }
        } else if (curMode === "erase") {
          const erasePoints = currentStrokeRef.current;
          if (erasePoints.length > 0) {
            const thresholdSq = (STROKE_WIDTH * 2.5) ** 2;
            strokesRef.current = strokesRef.current.filter(
              (stroke) =>
                !stroke.some((pt) =>
                  erasePoints.some((ep) => {
                    const dx = ep.x - pt.x;
                    const dy = ep.y - pt.y;
                    return dx * dx + dy * dy <= thresholdSq;
                  })
                )
            );

            const ctx = ctxRef.current;
            if (ctx) {
              redrawInkStrokes(ctx, strokesRef.current, {
                canvasWidth: CANVAS_WIDTH,
                canvasHeight: CANVAS_HEIGHT,
                lineWidth: STROKE_WIDTH,
                color: STROKE_COLOR,
              });
            }
          }
          currentStrokeRef.current = [];
        }

        // releasePointerCapture 제거 (setPointerCapture와 쌍)
      };

      // iPadOS Scribble 감지를 우회하기 위해 touch 이벤트에서 preventDefault 호출.
      // CSS touch-action:none만으로는 부족 — 실제 touch 이벤트를 claim해야
      // 시스템이 Apple Pencil 입력을 즉시 전달함.
      const preventTouch = (e: TouchEvent) => { e.preventDefault(); };

      canvas.addEventListener("touchstart", preventTouch, { passive: false });
      canvas.addEventListener("touchmove", preventTouch, { passive: false });
      canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
      canvas.addEventListener("pointermove", handlePointerMove, { passive: true });
      canvas.addEventListener("pointerup", handlePointerUp);
      canvas.addEventListener("pointerleave", handlePointerUp);
      canvas.addEventListener("pointercancel", handlePointerUp);

      return () => {
        canvas.removeEventListener("touchstart", preventTouch);
        canvas.removeEventListener("touchmove", preventTouch);
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("pointerup", handlePointerUp);
        canvas.removeEventListener("pointerleave", handlePointerUp);
        canvas.removeEventListener("pointercancel", handlePointerUp);
      };
    }, []);

    const clearCanvas = useCallback(() => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      hasContentRef.current = false;
      setHasContent(false);

      strokesRef.current = [];
      currentStrokeRef.current = [];
    }, []);

    // 전송 핸들러
    const handleSubmit = useCallback(async (): Promise<boolean> => {
      const strokes = strokesRef.current;

      if (strokes.length === 0) {
        toast.error("전송할 내용이 없습니다.", {
          description: "먼저 걱정을 적어주세요.",
        });
        return false;
      }

      if (isSubmitting) return false;

      setSubmitStatus('submitting');

      try {
        const result = await submitStrokes(strokes, {
          sessionId,
          canvas: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
          color: '#2E2E2E',
          baseStrokeWidth: STROKE_WIDTH,
        });

        if (result.success) {
          const seq = result.data?.seq;
          const storagePathSvg = result.data?.storagePathSvg;
          const displaySeq = coerceDisplaySeq(seq);

          /** Edge에 seq 없으면 id로 worryId — 모니터 문구용 displaySeq는 별도 필드로만 전달 */
          const worryIdForGum =
            displaySeq != null
              ? String(displaySeq)
              : result.data?.id
                ? String(result.data.id)
                : "";

          setSubmitStatus('success');
          if (displaySeq != null) {
            toast.success(`${displaySeq}번째 고민이 추가되었습니다`, {
              description: "모니터에 배정 요청을 보냈습니다.",
            });
          } else {
            toast.success("고민이 추가되었습니다", {
              description: "모니터 배정 요청을 진행합니다.",
            });
          }

          // submit 성공 후: gum_server에 monitor 배정 요청 (seq 없어도 id 있으면 호출)
          if (worryIdForGum) {
            let queueToastId: string | number | undefined;
            const assignment = await requestMonitorAssignment(
              {
                worryId: worryIdForGum,
                ...(displaySeq != null ? { displaySeq } : {}),
                svgUrl: storagePathSvg ?? null,
                sessionId: sessionId ?? null,
                clientId: getClientId(),
              },
              (position) => {
                if (position > 0) {
                  const desc = `${position}번째로 대기 중입니다.`;
                  if (queueToastId != null) {
                    toast.message("배정 대기 중", { id: queueToastId, description: desc, duration: 60000 });
                  } else {
                    queueToastId = toast.message("배정 대기 중", { description: desc, duration: 60000 });
                  }
                }
              }
            );
            if (queueToastId != null) toast.dismiss(queueToastId);
            if (!assignment.ok) {
              toast.warning("배정 요청이 실패했습니다.", {
                description: "네트워크 상태 또는 gum_server 설정을 확인해주세요.",
              });
            } else if (assignment.assigned) {
              const fallbackGuide =
                assignment.monitorNumber === 1
                  ? "👈 왼쪽 껌딱지월드로 가세요"
                  : assignment.monitorNumber === 2
                    ? "👉 오른쪽 껌딱지월드로 가세요"
                    : assignment.position === "left" || assignment.position === "right"
                      ? `${assignment.position === "left" ? "왼쪽" : "오른쪽"} 모니터로 가세요.`
                      : "안내된 모니터로 이동해 주세요.";
              toast.success("모니터 예약 완료", {
                description: assignment.serverMessage ?? fallbackGuide,
                duration: 30000,
              });
            } else if (assignment.queueLeftWithoutAssignment) {
              toast.message("대기 안내", {
                description:
                  "대기 순번이 종료되었습니다. 현장 안내를 기다려 주세요.",
              });
            } else if (assignment.state === "pending") {
              const pendingText =
                typeof assignment.queuePosition === "number" &&
                assignment.queuePosition > 0
                  ? `${assignment.queuePosition}번째로 대기 중입니다.`
                  : displaySeq != null
                    ? `${displaySeq}번째 고민이 대기 중입니다.`
                    : "고민이 대기 중입니다.";
              toast.message("배정 대기 중", {
                description: pendingText,
              });
            } else if (assignment.state === "expired") {
              toast.warning("배정 시간이 만료되었습니다.", {
                description: "다시 제출하거나 운영자에게 문의해주세요.",
              });
            }
          }

          setTimeout(() => setSubmitStatus('idle'), 2000);
          return true;
        } else if (result.queued) {
          setSubmitStatus('queued');
          const queueSize = getQueueSize();
          toast.warning("전송 실패", {
            description: `대기열에 저장되었습니다. (${queueSize}개 대기 중)`,
          });
          setTimeout(() => setSubmitStatus('idle'), 2000);
          return false;
        } else {
          setSubmitStatus('error');
          toast.error("전송 실패", {
            description: result.error || "알 수 없는 오류가 발생했습니다.",
          });
          setTimeout(() => setSubmitStatus('idle'), 2000);
          return false;
        }
      } catch (error) {
        setSubmitStatus('error');
        toast.error("전송 실패", {
          description: error instanceof Error ? error.message : "알 수 없는 오류",
        });
        setTimeout(() => setSubmitStatus('idle'), 2000);
        return false;
      }
    }, [isSubmitting, sessionId]);

    // 외부에서 접근 가능한 메서드 노출
    useImperativeHandle(ref, () => ({
      getStrokes: () => strokesRef.current,
      getSubmitStatus: () => submitStatus,
      canSubmit: () => hasContent && !isSubmitting,
      submit: handleSubmit,
      clear: clearCanvas,
    }), [submitStatus, hasContent, isSubmitting, handleSubmit, clearCanvas]);

    return (
      <div className="flex flex-col">
        <p
          className="text-foreground"
          style={{
            fontSize: "15px",
            lineHeight: "22px",
            whiteSpace: "nowrap",
          }}
        >
          요즘 당신을 껌딱지처럼 따라다니며 괴롭히는 걱정거리를 아래에 가감없이 적어주세요. 입국 시 모두 압수될 예정입니다.
        </p>

        <div
          className="relative rounded-lg"
          style={{
            marginTop: "10px",
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            touchAction: "none",
            boxShadow: "inset 0 0 0 2px hsl(0 0% 42% / 0.3)",
          }}
        >
          {!hasContent && (
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/60 select-none text-[15px]"
            >
              여기에 걱정을 적으시면 껌딱지월드에서 대신 우쭈쭈해드립니다.
            </span>
          )}

          <canvas
            ref={canvasRef}
            className="absolute"
            style={{
              left: "0",
              top: "0",
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              cursor: isSubmitting ? "not-allowed" : mode === "erase" ? "cell" : "crosshair",
              opacity: isSubmitting ? 0.7 : 1,
              touchAction: "none",
              willChange: "contents",
            }}
          />

          {hasContent && !isSubmitting && (
            <div
              className="absolute z-10 bottom-2 right-2 flex flex-row-reverse items-center gap-2"
            >
              <button
                onClick={clearCanvas}
                className="px-2.5 py-1 rounded-md text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-all shrink-0"
                type="button"
              >
                전체 지우기
              </button>
              <button
                onClick={() =>
                  setMode((prev) => (prev === "draw" ? "erase" : "draw"))
                }
                aria-pressed={mode === "erase"}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                  mode === "erase"
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"
                }`}
                type="button"
              >
                <span
                  aria-hidden
                  className={`size-1.5 rounded-full transition-colors ${
                    mode === "erase" ? "bg-background" : "bg-muted-foreground/40"
                  }`}
                />
                부분 지우개
              </button>
            </div>
          )}
        </div>

        <div
          className="bg-border"
          style={{
            marginTop: "10px",
            width: `${CANVAS_WIDTH}px`,
            height: "1px",
          }}
        />
      </div>
    );
  }
);

WorrySection.displayName = 'WorrySection';

export default WorrySection;
