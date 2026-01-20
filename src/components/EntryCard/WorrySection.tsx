import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorrySectionProps {
  value: string;
  onChange: (value: string) => void;
}

const WorrySection = ({ value, onChange }: WorrySectionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 캔버스 크기
  const canvasWidth = 720;
  const canvasHeight = 100;

  // 위치 오프셋 (기존 대비 +28px)
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

  // Supabase에 걱정 이미지 업로드
  const uploadWorry = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent) return;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      const fileName = `worry_${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("worries")
        .upload(fileName, blob, { contentType: "image/png" });

      if (error) throw error;
      console.log("[WorrySection] Upload success:", fileName);
    } catch (error) {
      console.error("[WorrySection] Upload error:", error);
    }
  }, [hasContent]);

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
          maxWidth: "720px",
        }}
      >
        요즘 당신을 껌딱지처럼 따라다니며 괴롭히는 걱정거리를 아래에 가감없이 적어주세요. 입국 시 모두 압수될 예정입니다.
      </p>

      {/* Canvas Container */}
      <div
        className="absolute"
        style={{
          left: "64px",
          top: `${332 + TOP_OFFSET}px`,
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
          top: `${452 + TOP_OFFSET}px`,
          width: "720px",
          height: "1px",
        }}
      />
    </>
  );
};

export default WorrySection;
