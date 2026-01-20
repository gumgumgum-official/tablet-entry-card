import { useRef, useState, useCallback, useEffect } from "react";

interface NameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const NameField = ({ value, onChange }: NameFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 캔버스 크기
  const canvasWidth = 580;
  const canvasHeight = 32;

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

  const draw = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPointRef.current) return;

      const point = getPointFromEvent(e);
      if (!point) return;

      const strokeWidth = 1.5 + point.pressure * 2;

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

  const stopDrawing = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      setIsDrawing(false);
      lastPointRef.current = null;

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
  }, [onChange]);

  return (
    <div className="absolute flex items-center" style={{ left: "64px", top: "128px" }}>
      <span
        className="text-foreground"
        style={{
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        성명 (Name):
      </span>
      <div
        className="relative ml-4"
        style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
      >
        {/* 밑줄 */}
        <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-muted-foreground/30" />

        {/* Placeholder */}
        {!hasContent && (
          <span
            className="absolute pointer-events-none text-muted-foreground/40 select-none"
            style={{ left: "0", bottom: "6px", fontSize: "16px" }}
          >
            여기에 이름을 적어주세요
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
            style={{ right: "-50px", top: "50%", transform: "translateY(-50%)" }}
            type="button"
          >
            지우기
          </button>
        )}
      </div>
    </div>
  );
};

export default NameField;
