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
  const [worryCanSubmit, setWorryCanSubmit] = useState(false);

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

  const handleWorryCanSubmitChange = useCallback((can: boolean) => {
    setWorryCanSubmit(can);
  }, []);

  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [isPortrait, setIsPortrait] = useState(false);

  // 카드 고정 크기 (디자인 기준, 가로모드 전용)
  const CARD_WIDTH = 1180;
  const CARD_HEIGHT = 820;

  // 실제 가시 뷰포트 + safe-area-inset 반영 스케일 계산
  useEffect(() => {
    // CSS custom property는 env() 값을 verbatim으로 저장해 parseFloat이 NaN을 반환함.
    // 래퍼 엘리먼트의 padding에 env()가 이미 적용되어 있으므로 resolved computed padding을 읽음.
    const readInsets = () => {
      const el = wrapperRef.current;
      if (!el) return { top: 0, right: 0, bottom: 0, left: 0 };
      const cs = getComputedStyle(el);
      return {
        top: parseFloat(cs.paddingTop) || 0,
        right: parseFloat(cs.paddingRight) || 0,
        bottom: parseFloat(cs.paddingBottom) || 0,
        left: parseFloat(cs.paddingLeft) || 0,
      };
    };

    const computeScale = () => {
      const vv = window.visualViewport;
      const vw = vv?.width ?? window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;

      const { top, right, bottom, left } = readInsets();

      setIsPortrait(vh > vw);

      // safe area(상태바/홈 인디케이터 영역) 제외한 실제 사용 가능 영역 기준 축소
      const paddingX = 8;
      const paddingY = 8;
      const availableW = vw - left - right - paddingX * 2;
      const availableH = vh - top - bottom - paddingY * 2;
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
        // 래퍼 padding에 env() 적용 → getComputedStyle로 resolved px값을 JS에서 읽어 스케일 계산에 사용
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
      {/*
        transform: scale()은 시각적으로만 축소하고 DOM 레이아웃 공간은 원본 크기 그대로 유지.
        scale된 실제 크기만큼의 sizing 박스로 감싸서 레이아웃 공간 = 시각 크기가 되도록 맞춤.
      */}
      <div
        style={{
          width: `${CARD_WIDTH * (scale || 1)}px`,
          height: `${CARD_HEIGHT * (scale || 1)}px`,
          flexShrink: 0,
          visibility: isReady ? "visible" : "hidden",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.3s ease-out",
        }}
      >
        <div
          ref={cardRef}
          className="relative select-none"
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${CARD_HEIGHT}px`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            borderRadius: "16px",
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            touchAction: "none",
            transform: `scale(${scale || 1})`,
            transformOrigin: "top left",
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
          onCanSubmitChange={handleWorryCanSubmitChange}
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
          canSubmit={worryCanSubmit}
        />
        </div>
      </div>
    </div>
  );
};

export default EntryCardCanvas;
