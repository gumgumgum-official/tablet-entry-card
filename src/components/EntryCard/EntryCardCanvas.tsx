import { useState, useRef, useCallback, useEffect } from "react";
import HeaderSection from "./HeaderSection";
import NameField from "./NameField";
import PurposeSection from "./PurposeSection";
import WorrySection, { type WorrySectionHandle } from "./WorrySection";
import AgreementSection from "./AgreementSection";
import SignatureSection from "./SignatureSection";
import AssetPlaceholders from "./AssetPlaceholders";
import backgroundImage from "@/assets/background2.png";
import { getSessionId } from "@/lib/submit";

export interface EntryCardData {
  purposeTourism: boolean;
  purposeStudy: boolean;
  purposeEmployment: boolean;
  purposeBusiness: boolean;
  purposeWorryFree: boolean;
  agreement1: boolean;
  agreement2: boolean;
  agreement3: boolean;
}

const EntryCardCanvas = () => {
  const [formData, setFormData] = useState<EntryCardData>({
    purposeTourism: false,
    purposeStudy: false,
    purposeEmployment: false,
    purposeBusiness: false,
    purposeWorryFree: true,
    agreement1: false,
    agreement2: false,
    agreement3: false,
  });

  // WorrySection ref
  const worrySectionRef = useRef<WorrySectionHandle>(null);

  // Session ID (URL 파라미터 또는 환경변수)
  const sessionId = getSessionId();

  const updateField = <K extends keyof EntryCardData>(
    field: K,
    value: EntryCardData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 입국심사 버튼 클릭 핸들러
  const handleImmigrationSubmit = useCallback(async () => {
    if (!worrySectionRef.current) return;

    const canSubmit = worrySectionRef.current.canSubmit();
    if (!canSubmit) {
      console.log("[EntryCard] Cannot submit - no content or already submitting");
      return;
    }

    const success = await worrySectionRef.current.submit();
    console.log("[EntryCard] Submit result:", success);
  }, []);

  // 전송 가능 여부
  const canSubmit = worrySectionRef.current?.canSubmit() ?? false;

  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  // 카드 고정 크기 (디자인 기준, 가로모드 전용)
  const CARD_WIDTH = 1180;
  const CARD_HEIGHT = 820;

  // 실제 가시 뷰포트 + safe-area-inset 반영 스케일 계산
  useEffect(() => {
    const readInset = (side: "top" | "right" | "bottom" | "left") => {
      const el = wrapperRef.current;
      if (!el) return 0;
      const val = getComputedStyle(el).getPropertyValue(`--sai-${side}`).trim();
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const computeScale = () => {
      const vv = window.visualViewport;
      const vw = vv?.width ?? window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;

      const insetTop = readInset("top");
      const insetBottom = readInset("bottom");
      const insetLeft = readInset("left");
      const insetRight = readInset("right");

      setIsPortrait(vh > vw);

      // safe area(상태바/홈 인디케이터 영역) 제외한 실제 사용 가능 영역 기준 축소
      const paddingX = 8;
      const paddingY = 8;
      const availableW = vw - insetLeft - insetRight - paddingX * 2;
      const availableH = vh - insetTop - insetBottom - paddingY * 2;
      const next = Math.min(availableW / CARD_WIDTH, availableH / CARD_HEIGHT);
      setScale(next > 0 ? next : 1);
    };

    computeScale();
    window.addEventListener("resize", computeScale);
    window.addEventListener("orientationchange", computeScale);
    window.visualViewport?.addEventListener("resize", computeScale);
    return () => {
      window.removeEventListener("resize", computeScale);
      window.removeEventListener("orientationchange", computeScale);
      window.visualViewport?.removeEventListener("resize", computeScale);
    };
  }, []);

  const isReady = scale > 0;

  return (
    <div
      ref={wrapperRef}
      className="w-full flex items-center justify-center warm-paper-bg overflow-hidden"
      style={{
        height: "100dvh",
        minHeight: "100dvh",
        touchAction: "none",
        // safe-area-inset 값을 CSS 변수로 노출해 JS에서 실제 픽셀값을 읽음
        ["--sai-top" as string]: "env(safe-area-inset-top)",
        ["--sai-right" as string]: "env(safe-area-inset-right)",
        ["--sai-bottom" as string]: "env(safe-area-inset-bottom)",
        ["--sai-left" as string]: "env(safe-area-inset-left)",
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      {isPortrait && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-white text-xl text-center px-8">
          화면을 가로 방향으로 돌려주세요
        </div>
      )}
      <div
        ref={cardRef}
        className="relative select-none"
        style={{
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          flexShrink: 0,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          borderRadius: "16px",
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          touchAction: "none",
          visibility: isReady ? "visible" : "hidden",
          opacity: isReady ? 1 : 0,
          transform: `scale(${scale || 1})`,
          transformOrigin: "center center",
          transition: "opacity 0.3s ease-out",
        }}
      >
        {/* Header */}
        <HeaderSection />

        {/* Name Field */}
        <NameField />

        {/* Purpose Section */}
        <PurposeSection
          tourism={formData.purposeTourism}
          study={formData.purposeStudy}
          employment={formData.purposeEmployment}
          business={formData.purposeBusiness}
          worryFree={formData.purposeWorryFree}
          onTourismChange={(value) => updateField("purposeTourism", value)}
          onStudyChange={(value) => updateField("purposeStudy", value)}
          onEmploymentChange={(value) => updateField("purposeEmployment", value)}
          onBusinessChange={(value) => updateField("purposeBusiness", value)}
          onWorryFreeChange={(value) => updateField("purposeWorryFree", value)}
        />

        {/* Worry Section */}
        <WorrySection
          ref={worrySectionRef}
          sessionId={sessionId}
        />

        {/* Agreement Section */}
        <AgreementSection
          agreement1={formData.agreement1}
          agreement2={formData.agreement2}
          agreement3={formData.agreement3}
          onAgreement1Change={(value) => updateField("agreement1", value)}
          onAgreement2Change={(value) => updateField("agreement2", value)}
          onAgreement3Change={(value) => updateField("agreement3", value)}
        />

        {/* Signature Section */}
        <SignatureSection />

        {/* Asset Placeholders - 입국심사 버튼 포함 */}
        <AssetPlaceholders
          formData={formData}
          onSubmit={handleImmigrationSubmit}
          canSubmit={canSubmit}
        />
      </div>
    </div>
  );
};

export default EntryCardCanvas;
