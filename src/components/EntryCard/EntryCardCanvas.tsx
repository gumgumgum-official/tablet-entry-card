import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import backgroundImage from "@/assets/background.png";
import stampBadge from "@/assets/stamp.png";
import immigrationButton from "@/assets/immigration-button.png";
import bearOfficer from "@/assets/bear-officer.png";
import { supabase } from "@/integrations/supabase/client";

// EntryCardData export (기존 컴포넌트 호환용)
export interface EntryCardData {
  name: string;
  purposeTourism: boolean;
  purposeStudy: boolean;
  purposeEmployment: boolean;
  purposeBusiness: boolean;
  purposeWorryFree: boolean;
  worryDescription: string;
  agreement1: boolean;
  agreement2: boolean;
  agreement3: boolean;
  signature: string;
  entryDate: string;
}

// 걱정 작성란 영역 (crop 용)
const WORRY_AREA = {
  left: 64,
  top: 332,
  width: 720,
  height: 80,
};

const EntryCardCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // 캔버스 크기 (카드와 동일)
  const canvasWidth = 1180;
  const canvasHeight = 820;

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
  }, []);

  // 이벤트에서 좌표 및 압력 추출
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
      setUploadStatus("idle");

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

      // 필압에 따른 선 두께 (1.5 ~ 4)
      const strokeWidth = 1.5 + point.pressure * 2.5;

      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = "hsl(0, 0%, 15%)";
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
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [isDrawing]
  );

  // 캔버스 전체 지우기
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    setHasContent(false);
    setUploadStatus("idle");
  }, []);

  // 걱정 작성란 영역만 crop해서 Supabase에 업로드
  const handleUpload = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsUploading(true);
    setUploadStatus("idle");

    try {
      const dpr = window.devicePixelRatio || 1;

      // 걱정 작성란 영역만 crop
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = WORRY_AREA.width * dpr;
      cropCanvas.height = WORRY_AREA.height * dpr;
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) throw new Error("Failed to get crop canvas context");

      cropCtx.drawImage(
        canvas,
        WORRY_AREA.left * dpr,
        WORRY_AREA.top * dpr,
        WORRY_AREA.width * dpr,
        WORRY_AREA.height * dpr,
        0,
        0,
        WORRY_AREA.width * dpr,
        WORRY_AREA.height * dpr
      );

      // PNG로 변환
      const blob = await new Promise<Blob>((resolve, reject) => {
        cropCanvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create blob"));
        }, "image/png");
      });

      // Supabase Storage에 업로드
      const fileName = `worry_${Date.now()}.png`;
      const { error } = await supabase.storage
        .from("worries")
        .upload(fileName, blob, { contentType: "image/png" });

      if (error) throw error;

      setUploadStatus("success");
      console.log("[EntryCard] Upload success:", fileName);
    } catch (error) {
      setUploadStatus("error");
      console.error("[EntryCard] Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center warm-paper-bg overflow-hidden p-8 relative">
      {/* 지우개 버튼 - 페이지 오른쪽 */}
      {hasContent && (
        <button
          onClick={clearCanvas}
          className="fixed right-4 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full bg-white/80 hover:bg-white shadow-md text-muted-foreground hover:text-foreground transition-all"
          title="모두 지우기"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 9 9" />
          </svg>
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative select-none"
        style={{
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          borderRadius: "16px",
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* ============ 드로잉 캔버스 (전체 크기) - 맨 아래 레이어 ============ */}
        <canvas
          ref={canvasRef}
          className="absolute touch-none"
          style={{
            left: 0,
            top: 0,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            cursor: "crosshair",
            borderRadius: "16px",
            zIndex: 1,
          }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />

        {/* ============ 고정 레이블 (캔버스 위에 표시, pointer-events-none) ============ */}

        {/* Header */}
        <h1
          className="absolute font-semibold text-primary pointer-events-none"
          style={{
            left: "64px",
            top: "36px",
            fontSize: "32px",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: "38px",
            zIndex: 2,
          }}
        >
          GGUMDDI NATION ENTRY CARD
        </h1>
        <h2
          className="absolute font-semibold text-primary pointer-events-none"
          style={{
            left: "64px",
            top: "74px",
            fontSize: "20px",
            fontWeight: 600,
            letterSpacing: "0.02em",
            lineHeight: "29px",
            zIndex: 2,
          }}
        >
          껌딱지월드 입국신고서
        </h2>
        <div
          className="absolute bg-border pointer-events-none"
          style={{ left: "64px", top: "110px", width: "720px", height: "1px", zIndex: 2 }}
        />

        {/* Name Field Label & Line */}
        <span
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "128px", fontSize: "18px", fontWeight: 600, zIndex: 2 }}
        >
          성명 (Name):
        </span>
        <div
          className="absolute border-b-2 border-dashed border-muted-foreground/40 pointer-events-none"
          style={{ left: "200px", top: "128px", width: "580px", height: "28px", zIndex: 2 }}
        />

        {/* Purpose Section */}
        <h2
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "172px", fontSize: "18px", fontWeight: 600, zIndex: 2 }}
        >
          입국목적 (Purpose of Visit):
        </h2>

        {/* Purpose Checkboxes - 빈 박스로 표시 */}
        <div className="absolute flex pointer-events-none" style={{ left: "64px", top: "204px", gap: "24px", zIndex: 2 }}>
          <CheckboxLabel label="관광 (Tourism)" />
          <CheckboxLabel label="공부 (Study)" />
          <CheckboxLabel label="취업 (Employment)" />
          <CheckboxLabel label="업무 (Business)" />
        </div>
        <div className="absolute pointer-events-none" style={{ left: "64px", top: "240px", zIndex: 2 }}>
          <CheckboxLabel label="걱정 해소 (Worry-Free Entry)" />
        </div>

        <div
          className="absolute bg-border pointer-events-none"
          style={{ left: "64px", top: "276px", width: "720px", height: "1px", zIndex: 2 }}
        />

        {/* Worry Section */}
        <p
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "292px", fontSize: "15px", lineHeight: "22px", whiteSpace: "nowrap", zIndex: 2 }}
        >
          요즘 당신을 껌딱지처럼 따라다니며 괴롭히는 걱정거리를 아래에 가감없이 적어주세요. 입국 시 모두 압수될 예정입니다.
        </p>
        {/* 걱정 작성란 테두리 */}
        <div
          className="absolute border-2 border-dashed border-muted-foreground/30 rounded-lg pointer-events-none"
          style={{ left: `${WORRY_AREA.left}px`, top: `${WORRY_AREA.top}px`, width: `${WORRY_AREA.width}px`, height: `${WORRY_AREA.height}px`, zIndex: 2 }}
        />
        {/* 걱정 작성란 Placeholder */}
        {!hasContent && (
          <span
            className="absolute text-muted-foreground/60 text-[15px] pointer-events-none flex items-center justify-center"
            style={{
              left: `${WORRY_AREA.left}px`,
              top: `${WORRY_AREA.top}px`,
              width: `${WORRY_AREA.width}px`,
              height: `${WORRY_AREA.height}px`,
              zIndex: 3,
            }}
          >
            여기에 걱정을 적으시면 껌딱지월드에서 대신 우쭈쭈해드립니다.
          </span>
        )}

        <div
          className="absolute bg-border pointer-events-none"
          style={{ left: "64px", top: "432px", width: "720px", height: "1px", zIndex: 2 }}
        />

        {/* Agreement Section */}
        <h2
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "448px", fontSize: "17px", fontWeight: 600, zIndex: 2 }}
        >
          입국을 위해 아래의 사항에 모두 동의하십니까?
        </h2>
        <AgreementLabel
          text="위 걱정은 100% 본인의 순도 높은 고민이며, 거짓일 경우 입국 즉시 껌딱지로 변해도 할 말이 없습니다."
          top={482}
        />
        <AgreementLabel
          text="껌딱지 월드의 강력한 귀여움에 심장이 멎을 수 있음을 인지하였으며, 기꺼이 힐링을 받을 준비가 되었습니다."
          top={526}
        />
        <AgreementLabel
          text='내 걱정이 다른 여행자들에게 "아, 나만 이런 게 아니구나" 하는 위안의 메시지로 슬쩍 노출되어도 너그럽게 이해하겠습니다.'
          top={570}
        />

        {/* Signature Section */}
        <span
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "628px", fontSize: "16px", fontWeight: 500, zIndex: 2 }}
        >
          서명 (Signature):
        </span>
        <div
          className="absolute pointer-events-none"
          style={{ left: "200px", top: "628px", width: "300px", height: "48px", zIndex: 2 }}
        >
          {/* 서명란 밑줄 */}
          <div className="absolute bottom-0 left-0 right-0 border-b-2 border-dashed border-muted-foreground/40" />
        </div>
        {/* 서명 placeholder */}
        {!hasContent && (
          <span
            className="absolute text-muted-foreground/40 text-[16px] pointer-events-none"
            style={{ left: "200px", top: "660px", zIndex: 3 }}
          >
            여기에 서명하세요
          </span>
        )}

        {/* Date */}
        <span
          className="absolute text-foreground pointer-events-none"
          style={{ left: "64px", top: "692px", fontSize: "16px", fontWeight: 500, zIndex: 2 }}
        >
          날짜 (Date):
        </span>
        <span
          className="absolute text-foreground/50 pointer-events-none"
          style={{ left: "180px", top: "692px", fontSize: "16px", zIndex: 2 }}
        >
          {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, " / ").replace(".", "")}
        </span>

        {/* ============ Asset Images ============ */}

        {/* Top Right Stamp Badge */}
        <img
          src={stampBadge}
          alt="GGUMDDI NATION Stamp"
          className="absolute pointer-events-none"
          style={{
            right: "32px",
            top: "32px",
            width: "220px",
            height: "auto",
            zIndex: 10,
          }}
        />

        {/* Immigration Button - 클릭 시 업로드 */}
        <motion.img
          src={immigrationButton}
          alt="입국심사받기 Immigration"
          onClick={handleUpload}
          whileHover={{
            scale: 1.08,
            filter: "brightness(1.1) drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
          }}
          whileTap={{ scale: 0.95 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 17
          }}
          className={`absolute cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          style={{
            right: "100px",
            bottom: "-40px",
            width: "440px",
            height: "auto",
            zIndex: 20,
            filter: uploadStatus === "success"
              ? "drop-shadow(0 4px 12px rgba(34, 197, 94, 0.4))"
              : uploadStatus === "error"
              ? "drop-shadow(0 4px 12px rgba(239, 68, 68, 0.4))"
              : "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
          }}
        />

        {/* Bear Officer Illustration */}
        <img
          src={bearOfficer}
          alt="Bear Immigration Officer"
          className="absolute pointer-events-none"
          style={{
            right: "-60px",
            bottom: "24px",
            width: "390px",
            height: "auto",
            zIndex: 30,
          }}
        />
      </motion.div>
    </div>
  );
};

// 체크박스 레이블 컴포넌트 (빈 박스 + 텍스트)
const CheckboxLabel = ({ label }: { label: string }) => (
  <div className="flex items-center" style={{ gap: "8px" }}>
    <div
      className="border-2 border-muted-foreground/50 rounded-sm"
      style={{ width: "18px", height: "18px" }}
    />
    <span className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>
      {label}
    </span>
  </div>
);

// 동의 항목 레이블 컴포넌트
const AgreementLabel = ({ text, top }: { text: string; top: number }) => (
  <div
    className="absolute flex items-start pointer-events-none"
    style={{ left: "64px", top: `${top}px`, gap: "10px", zIndex: 2 }}
  >
    <div
      className="border-2 border-muted-foreground/50 rounded-sm flex-shrink-0"
      style={{ width: "18px", height: "18px", marginTop: "3px" }}
    />
    <span
      className="text-foreground"
      style={{ fontSize: "14px", lineHeight: "22px", whiteSpace: "nowrap" }}
    >
      {text}
    </span>
  </div>
);

export default EntryCardCanvas;
