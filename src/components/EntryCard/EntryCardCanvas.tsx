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

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
    });
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center warm-paper-bg overflow-hidden px-8 py-4"
      style={{ touchAction: "none" }}
    >
      <div
        ref={cardRef}
        className="relative select-none"
        style={{
          width: "1180px",
          height: "820px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          borderRadius: "16px",
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          touchAction: "none",
          opacity: 0,
          transform: "scale(0.98)",
          transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
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
