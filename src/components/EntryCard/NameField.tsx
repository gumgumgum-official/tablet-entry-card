import { useRef, useState, useCallback, useEffect } from "react";
import { isCanvasPointerStartAllowed } from "@/lib/canvasPointer";

const STROKE_WIDTH = 2;
const STROKE_COLOR = "#2E2E2E";

const NameField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const [hasContent, setHasContent] = useState(false);
  const hasContentRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRectRef = useRef<DOMRect | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const isErasingRef = useRef(false);

  useEffect(() => { isErasingRef.current = isErasing; }, [isErasing]);

  const canvasWidth = 580;
  const canvasHeight = 32;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    ctxRef.current = ctx;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleDown = (e: PointerEvent) => {
      if (!isCanvasPointerStartAllowed(e.pointerType)) return;
      e.preventDefault();
      isDrawingRef.current = true;
      if (!hasContentRef.current) {
        hasContentRef.current = true;
        setHasContent(true);
      }
      canvasRectRef.current = canvas.getBoundingClientRect();
      const rect = canvasRectRef.current;
      lastPointRef.current = {
        x: (e.clientX - rect.left) * (canvasWidth / rect.width),
        y: (e.clientY - rect.top) * (canvasHeight / rect.height),
      };
    };

    const handleMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      const ctx = ctxRef.current;
      const rect = canvasRectRef.current;
      const from = lastPointRef.current;
      if (!ctx || !rect || !from) return;

      const x = (e.clientX - rect.left) * (canvasWidth / rect.width);
      const y = (e.clientY - rect.top) * (canvasHeight / rect.height);
      const erase = isErasingRef.current;

      ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = erase ? STROKE_WIDTH * 2 : STROKE_WIDTH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      lastPointRef.current = { x, y };
    };

    const handleUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };

    const preventTouch = (e: TouchEvent) => { e.preventDefault(); };

    canvas.addEventListener("touchstart", preventTouch, { passive: false });
    canvas.addEventListener("touchmove", preventTouch, { passive: false });
    canvas.addEventListener("pointerdown", handleDown, { passive: false });
    canvas.addEventListener("pointermove", handleMove, { passive: true });
    canvas.addEventListener("pointerup", handleUp);
    canvas.addEventListener("pointerleave", handleUp);
    canvas.addEventListener("pointercancel", handleUp);
    return () => {
      canvas.removeEventListener("touchstart", preventTouch);
      canvas.removeEventListener("touchmove", preventTouch);
      canvas.removeEventListener("pointerdown", handleDown);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerup", handleUp);
      canvas.removeEventListener("pointerleave", handleUp);
      canvas.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    hasContentRef.current = false;
    setHasContent(false);
  }, []);

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
          className="absolute"
          style={{
            left: "0",
            top: "0",
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            cursor: "crosshair",
            touchAction: "none",
          }}
        />

        {/* Eraser / Clear Buttons */}
        {hasContent && (
          <>
            <button
              onClick={() => setIsErasing((prev) => !prev)}
              className={`absolute z-10 px-2 py-1 rounded text-xs transition-all ${
                isErasing
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"
              }`}
              style={{ right: "-110px", top: "50%", transform: "translateY(-50%)" }}
              type="button"
            >
              {isErasing ? "부분 지우개 ON" : "부분 지우개"}
            </button>
            <button
              onClick={clearCanvas}
              className="absolute z-10 px-2 py-1 rounded text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 transition-all"
              style={{ right: "-50px", top: "50%", transform: "translateY(-50%)" }}
              type="button"
            >
              전체 지우기
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NameField;
