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

interface WorrySectionProps {
  value: string;
  onChange: (value: string) => void;
  sessionId?: string;
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

const STROKE_WIDTH = 6;

const WorrySection = forwardRef<WorrySectionHandle, WorrySectionProps>(
  ({ value, onChange, sessionId }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const [hasContent, setHasContent] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const [mode, setMode] = useState<"draw" | "erase">("draw");

    // Strokes 수집
    const strokesRef = useRef<SubmitPoint[][]>([]);
    const currentStrokeRef = useRef<SubmitPoint[]>([]);

    // 전송 상태
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const isSubmitting = submitStatus === 'submitting' || submitStatus === 'retrying';

    // 캔버스 크기
    const canvasWidth = 720;
    const canvasHeight = 180;

    // 위치 오프셋
    const TOP_OFFSET = 0;

    // 캔버스 초기화
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      ctx.scale(dpr, dpr);
      ctx.imageSmoothingEnabled = true;

      // 기존 이미지 데이터 복원
      if (value) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          setHasContent(true);
        };
        img.src = value;
      }
    }, []);

    const getPointFromEvent = useCallback(
      (
        e: Pick<PointerEvent, "clientX" | "clientY" | "pressure" | "timeStamp">
      ): SubmitPoint | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
        const y = (e.clientY - rect.top) * (canvasHeight / rect.height);
        const pressure = e.pressure || 0.5;

        return {
          x,
          y,
          t: e.timeStamp,
          p: pressure,
        };
      },
      []
    );

    const getEventSamples = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>): PointerEvent[] => {
        const nativeEvent = e.nativeEvent;
        if ("getCoalescedEvents" in nativeEvent) {
          const coalesced = nativeEvent.getCoalescedEvents();
          if (coalesced.length > 0) return coalesced;
        }
        return [nativeEvent];
      },
      []
    );

    const startDrawing = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isCanvasPointerStartAllowed(e.pointerType)) return;
        e.preventDefault();
        isDrawingRef.current = true;
        setHasContent(true);

        const point = getPointFromEvent(e);
        if (point) {
          lastPointRef.current = { x: point.x, y: point.y };
          currentStrokeRef.current = [point];
        }

        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      },
      [getPointFromEvent]
    );

    const draw = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !lastPointRef.current) return;

        const ctxMode = mode === "erase" ? "destination-out" : "source-over";
        ctx.save();
        ctx.globalCompositeOperation = ctxMode;
        ctx.strokeStyle = "hsl(0, 0%, 18%)";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (const sample of getEventSamples(e)) {
          const point = getPointFromEvent(sample);
          if (!point || !lastPointRef.current) continue;

          // 이전 커밋과 비슷한 굵기 프로파일 유지
          const strokeWidth =
            mode === "erase"
              ? STROKE_WIDTH * 2
              : 5 + (point.p ?? 0.5) * 8;
          ctx.lineWidth = strokeWidth;

          const from = lastPointRef.current;
          const midX = (from.x + point.x) / 2;
          const midY = (from.y + point.y) / 2;

          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(from.x, from.y, midX, midY);
          ctx.stroke();

          lastPointRef.current = { x: point.x, y: point.y };

          if (mode === "draw" || mode === "erase") {
            currentStrokeRef.current.push(point);
          }
        }
        ctx.restore();
      },
      [getEventSamples, getPointFromEvent, mode]
    );

    const stopDrawing = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");

        isDrawingRef.current = false;
        lastPointRef.current = null;

        if (mode === "draw") {
          if (currentStrokeRef.current.length > 0) {
            strokesRef.current.push([...currentStrokeRef.current]);
            currentStrokeRef.current = [];
          }
        } else if (mode === "erase") {
          // 획 지우개: 지우개 경로에 조금이라도 닿은 stroke 전체 제거
          const erasePoints = [...currentStrokeRef.current];
          if (erasePoints.length > 0) {
            const threshold = STROKE_WIDTH * 2.5;
            const thresholdSq = threshold * threshold;

            const filteredStrokes: SubmitPoint[][] = [];

            for (const stroke of strokesRef.current) {
              const hitStroke = stroke.some((pt) =>
                erasePoints.some((ep) => {
                  const dx = ep.x - pt.x;
                  const dy = ep.y - pt.y;
                  return dx * dx + dy * dy <= thresholdSq;
                })
              );

              if (!hitStroke) {
                filteredStrokes.push(stroke);
              }
            }

            strokesRef.current = filteredStrokes;

            if (canvas && ctx) {
              ctx.clearRect(0, 0, canvasWidth, canvasHeight);

              ctx.save();
              ctx.globalCompositeOperation = "source-over";
              ctx.strokeStyle = "hsl(0, 0%, 18%)";
              ctx.lineWidth = STROKE_WIDTH;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";

              for (const stroke of strokesRef.current) {
                if (stroke.length < 2) continue;
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                  ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
              }

              ctx.restore();
            }
          }

          currentStrokeRef.current = [];
        }

        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          onChange(dataUrl);
        }

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      },
      [mode, onChange]
    );

    const clearCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      setHasContent(false);
      onChange("");

      strokesRef.current = [];
      currentStrokeRef.current = [];
    }, [onChange]);

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
          canvas: { width: canvasWidth, height: canvasHeight },
          color: '#2E2E2E',
          baseStrokeWidth: 6, // 현재 캔버스 선 두께와 맞춤
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
            const assignment = await requestMonitorAssignment({
              worryId: worryIdForGum,
              ...(displaySeq != null ? { displaySeq } : {}),
              svgUrl: storagePathSvg ?? null,
              sessionId: sessionId ?? null,
              clientId: getClientId(),
            });
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
      <>
        {/* Description Text */}
        <p
          className="absolute text-foreground"
          style={{
            left: "64px",
            top: "300px",
            fontSize: "15px",
            lineHeight: "22px",
            whiteSpace: "nowrap",
          }}
        >
          요즘 당신을 껌딱지처럼 따라다니며 괴롭히는 걱정거리를 아래에 가감없이 적어주세요. 입국 시 모두 압수될 예정입니다.
        </p>

        {/* Canvas Container */}
        <div
          className="absolute"
          style={{
            left: "64px",
            top: `${320 + TOP_OFFSET}px`,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
          }}
        >
          {/* 테두리 */}
          <div className="absolute inset-0 border-2 border-dashed border-muted-foreground/30 rounded-lg pointer-events-none" />

          {/* Placeholder */}
          {!hasContent && (
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground/60 select-none text-[15px]"
            >
              여기에 걱정을 적으시면 껌딱지월드에서 대신 우쭈쭈해드립니다.
            </span>
          )}

          {/* Drawing Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute touch-none"
            style={{
              left: "0",
              top: "0",
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              cursor: isSubmitting ? "not-allowed" : "crosshair",
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onPointerDown={isSubmitting ? undefined : startDrawing}
            onPointerMove={isSubmitting ? undefined : draw}
            onPointerUp={isSubmitting ? undefined : stopDrawing}
            onPointerLeave={isSubmitting ? undefined : stopDrawing}
            onPointerCancel={isSubmitting ? undefined : stopDrawing}
          />

          {/* Eraser / Clear Buttons */}
          {hasContent && !isSubmitting && (
            <>
              <button
                onClick={() =>
                  setMode((prev) => (prev === "draw" ? "erase" : "draw"))
                }
                className={`absolute z-10 px-2 py-1 rounded text-xs transition-all ${
                  mode === "erase"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"
                }`}
                style={{ right: "64px", top: "8px" }}
                type="button"
              >
                {mode === "erase" ? "부분 지우개 ON" : "부분 지우개"}
              </button>
              <button
                onClick={clearCanvas}
                className="absolute z-10 px-2 py-1 rounded text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-all"
                style={{ right: "8px", top: "8px" }}
                type="button"
              >
                전체 지우기
              </button>
            </>
          )}
        </div>

        {/* Horizontal divider */}
        <div
          className="absolute bg-border"
          style={{
            left: "64px",
            top: `${502 + TOP_OFFSET}px`,
            width: "720px",
            height: "1px",
          }}
        />
      </>
    );
  }
);

WorrySection.displayName = 'WorrySection';

export default WorrySection;
