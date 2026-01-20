import { motion } from "framer-motion";
import type { EntryCardData } from "./EntryCardCanvas";
import stampBadge from "@/assets/stamp2.png";
import immigrationButton from "@/assets/immigration-button.png";
import bearOfficer from "@/assets/bear-officer.png";

interface AssetPlaceholdersProps {
  formData: EntryCardData;
  /** 입국심사 버튼 클릭 핸들러 */
  onSubmit?: () => void;
  /** 제출 가능 여부 */
  canSubmit?: boolean;
}

const AssetPlaceholders = ({ 
  formData, 
  onSubmit,
  canSubmit = true 
}: AssetPlaceholdersProps) => {
  const handleBadgeClick = () => {
    console.log("[AssetPlaceholders] Immigration button clicked - Form data:", formData);
    onSubmit?.();
  };

  return (
    <>
      {/* Top Right Stamp Badge */}
      <img
        src={stampBadge}
        alt="GGUMDDI NATION Stamp"
        className="absolute pointer-events-none"
        style={{
          right: "50px",
          top: "32px",
          width: "390px",
          height: "auto",
        }}
      />

      {/* Immigration Button with Hover Interaction */}
      <motion.img
        src={immigrationButton}
        alt="입국심사받기 Immigration"
        onClick={handleBadgeClick}
        whileHover={canSubmit ? {
          scale: 1.05,
          filter: "brightness(1.1) drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
        } : undefined}
        whileTap={canSubmit ? { scale: 0.95 } : undefined}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17
        }}
        className="absolute"
        style={{
          right: "10px",
          bottom: "-60px",
          width: "400px",
          height: "auto",
          zIndex: 20,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: canSubmit ? 1 : 0.6,
        }}
      />

      {/* Bear Officer Illustration */}
      <img
        src={bearOfficer}
        alt="Bear Immigration Officer"
        className="absolute pointer-events-none"
        style={{
          right: "-20px",
          bottom: "30px",
          width: "200px",
          height: "auto",
          zIndex: 30,
        }}
      />
    </>
  );
};

export default AssetPlaceholders;
