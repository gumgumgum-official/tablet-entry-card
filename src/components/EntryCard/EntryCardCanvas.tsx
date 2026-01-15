import { useState } from "react";
import { motion } from "framer-motion";
import HeaderSection from "./HeaderSection";
import NameField from "./NameField";
import PurposeSection from "./PurposeSection";
import WorrySection from "./WorrySection";
import AgreementSection from "./AgreementSection";
import SignatureSection from "./SignatureSection";
import AssetPlaceholders from "./AssetPlaceholders";
import backgroundImage from "@/assets/background.png";

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
    purposeWorryFree: true, // Default checked as per spec
    worryDescription: "",
    agreement1: false,
    agreement2: false,
    agreement3: false,
    signature: "",
    entryDate: "",
  });

  const updateField = <K extends keyof EntryCardData>(
    field: K,
    value: EntryCardData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center warm-paper-bg overflow-hidden p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative"
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
          value={formData.worryDescription}
          onChange={(value) => updateField("worryDescription", value)}
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

        {/* Asset Placeholders */}
        <AssetPlaceholders formData={formData} />
      </motion.div>
    </div>
  );
};

export default EntryCardCanvas;
