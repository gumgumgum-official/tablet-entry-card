import { useEffect, useRef, useState, useCallback } from "react";
import { format } from "date-fns";

interface SignatureSectionProps {
  signature: string;
  date: string;
  onSignatureChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

// 위치 오프셋 (WorrySection 변경에 따른 조정)
const TOP_OFFSET = 48;

const SignatureSection = ({
  signature,
  date,
  onSignatureChange,
  onDateChange,
}: SignatureSectionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 캔버스 크기 설정
  const canvasWidth = 300;
  const canvasHeight = 48;

  // Set today's date on mount
  useEffect(() => {
    if (!date) {
      const today = format(new Date(), "yyyy / MM / dd");
      onDateChange(today);
    }
  }, [date, onDateChange]);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    // 기존 이미지 데이터 복원
    if (signature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        setHasContent(true);
      };
      img.src = signature;
    }
  }, []);

  // 좌표 추출
  const getPointFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
      const y = (e.clientY - rect.top) * (canvasHeight / rect.height);
      const pressure = e.pressure || 0.5;

      return { x, y, pressure };
    },
    []
  );

  // 그리기 시작
  const startDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDrawing(true);
      setHasContent(true);

      const point = getPointFromEvent(e);
      if (point) {
        lastPointRef.current = { x: point.x, y: point.y };
      }

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getPointFromEvent]
  );

  // 그리기
  const draw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPointRef.current) return;

      const point = getPointFromEvent(e);
      if (!point) return;

      // 일정한 선 두께
      const strokeWidth = 2.5;

      // 캔버스에 그리기
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = "hsl(0, 0%, 18%)";
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      lastPointRef.current = { x: point.x, y: point.y };
    },
    [isDrawing, getPointFromEvent]
  );

  // 그리기 종료
  const stopDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      setIsDrawing(false);
      lastPointRef.current = null;

      // 캔버스 이미지 저장
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL("image/png");
        onSignatureChange(dataUrl);
      }

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [isDrawing, onSignatureChange]
  );

  // 캔버스 지우기
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    setHasContent(false);
    onSignatureChange("");
  }, [onSignatureChange]);

  return (
    <>
      {/* Signature Field */}
      <div className="absolute flex items-center" style={{ left: "64px", top: `${628 + TOP_OFFSET}px` }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          서명 (Signature):
        </span>
        <div
          className="relative ml-3"
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
        >
          {/* 서명 캔버스 배경 (밑줄) */}
          <div
            className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-muted-foreground/30"
          />

          {/* Placeholder */}
          {!hasContent && (
            <span
              className="absolute pointer-events-none text-muted-foreground/40 select-none"
              style={{
                left: "0",
                bottom: "8px",
                fontSize: "16px",
              }}
            >
              여기에 서명하세요
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
              cursor: "crosshair",
            }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            onPointerCancel={stopDrawing}
          />

          {/* Clear Button */}
          {hasContent && (
            <button
              onClick={clearCanvas}
              className="absolute z-10 px-2 py-1 rounded text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-all"
              style={{
                right: "-60px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
              type="button"
            >
              지우기
            </button>
          )}
        </div>
      </div>

      {/* Date Field */}
      <div className="absolute flex items-center" style={{ left: "64px", top: `${684 + TOP_OFFSET}px` }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          날짜 (Date):
        </span>
        <span
          className="ml-3 text-foreground handwriting"
          style={{
            fontSize: "22px",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {date}
        </span>
      </div>
    </>
  );
};

export default SignatureSection;
