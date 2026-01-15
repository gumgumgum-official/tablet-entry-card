import { motion } from "framer-motion";
import type { EntryCardData } from "./EntryCardCanvas";
import stampBadge from "@/assets/stamp.png";
import immigrationButton from "@/assets/immigration-button.png";
import bearOfficer from "@/assets/bear-officer.png";

interface AssetPlaceholdersProps {
  formData: EntryCardData;
}

const AssetPlaceholders = ({ formData }: AssetPlaceholdersProps) => {
  const handleBadgeClick = () => {
    // Visual feedback only for now
    console.log("Badge clicked - Form data:", formData);
  };

  return (
    <>
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
        }}
      />

      {/* Immigration Button with Hover Interaction - positioned at bottom left of bear */}
      <motion.img
        src={immigrationButton}
        alt="입국심사받기 Immigration"
        onClick={handleBadgeClick}
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
        className="absolute cursor-pointer"
        style={{
          right: "100px",
          bottom: "-40px",
          width: "440px",
          height: "auto",
          zIndex: 20,
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
        }}
      />

      {/* Bear Officer Illustration - positioned to the right of button */}
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
    </>
  );
};

export default AssetPlaceholders;
