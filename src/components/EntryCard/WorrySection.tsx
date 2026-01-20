import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { toast } from "sonner";
import { 
  submitStrokes, 
  type SubmitPoint, 
  type SubmitStatus,
  getQueueSize 
} from "@/lib/submit";

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

const WorrySection = forwardRef<WorrySectionHandle, WorrySectionProps>(
  ({ value, onChange, sessionId }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasContent, setHasContent] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    
    // Strokes 수집
    const strokesRef = useRef<SubmitPoint[][]>([]);
    const currentStrokeRef = useRef<SubmitPoint[]>([]);
    
    // 전송 상태
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const isSubmitting = submitStatus === 'submitting' || submitStatus === 'retrying';

    // 캔버스 크기
    const canvasWidth = 720;
    const canvasHeight = 150;

    // 위치 오프셋
    const TOP_OFFSET = 20;

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
      (e: React.PointerEvent<HTMLCanvasElement>): SubmitPoint | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
        const y = (e.clientY - rect.top) * (canvasHeight / rect.height);
        const pressure = e.pressure || 0.5;

        return { 
          x, 
          y, 
          t: Date.now(),
          p: pressure
        };
      },
      []
    );

    const startDrawing = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        setIsDrawing(true);
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
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx || !lastPointRef.current) return;

        const point = getPointFromEvent(e);
        if (!point) return;

        const strokeWidth = 1.5 + point.p * 2;

        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.strokeStyle = "hsl(0, 0%, 18%)";
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        lastPointRef.current = { x: point.x, y: point.y };
        currentStrokeRef.current.push(point);
      },
      [isDrawing, getPointFromEvent]
    );

    const stopDrawing = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;

        setIsDrawing(false);
        lastPointRef.current = null;

        if (currentStrokeRef.current.length > 0) {
          strokesRef.current.push([...currentStrokeRef.current]);
          currentStrokeRef.current = [];
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const dataUrl = canvas.toDataURL("image/png");
          onChange(dataUrl);
        }

        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      },
      [isDrawing, onChange]
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
          baseStrokeWidth: 3,
        });

        if (result.success) {
          setSubmitStatus('success');
          toast.success("입국 심사 완료!", {
            description: "걱정이 성공적으로 압수되었습니다.",
          });
          
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

          {/* Clear Button */}
          {hasContent && !isSubmitting && (
            <button
              onClick={clearCanvas}
              className="absolute z-10 px-2 py-1 rounded text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-all"
              style={{ right: "8px", top: "8px" }}
              type="button"
            >
              지우기
            </button>
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
