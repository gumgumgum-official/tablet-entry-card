import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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

const EntryCardCanvas = () => {
  const [formData, setFormData] = useState<EntryCardData>({
    name: "",
    purposeTourism: false,
    purposeStudy: false,
    purposeEmployment: false,
    purposeBusiness: false,
    purposeWorryFree: true,
    worryDescription: "",
    agreement1: false,
    agreement2: false,
    agreement3: false,
    signature: "",
    entryDate: "",
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center warm-paper-bg overflow-hidden p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
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
        }}
      >
        {/* Header */}
        <HeaderSection />

        {/* Name Field */}
        <NameField
          value={formData.name}
          onChange={(value) => updateField("name", value)}
        />

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
          value={formData.worryDescription}
          onChange={(value) => updateField("worryDescription", value)}
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
        <SignatureSection
          signature={formData.signature}
          date={formData.entryDate}
          onSignatureChange={(value) => updateField("signature", value)}
          onDateChange={(value) => updateField("entryDate", value)}
        />

        {/* Asset Placeholders - 입국심사 버튼 포함 */}
        <AssetPlaceholders 
          formData={formData}
          onSubmit={handleImmigrationSubmit}
          canSubmit={canSubmit}
        />
      </motion.div>
    </div>
  );
};

export default EntryCardCanvas;
