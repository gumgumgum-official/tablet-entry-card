import { motion } from "framer-motion";
import type { EntryCardData } from "./EntryCardCanvas";
import stampBadge from "@/assets/stamp-badge.png";
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

      {/* Bear Officer Illustration */}
      <img
        src={bearOfficer}
        alt="Bear Immigration Officer"
        className="absolute pointer-events-none"
        style={{
          right: "48px",
          bottom: "48px",
          width: "280px",
          height: "auto",
        }}
      />

      {/* Immigration Button with Hover Interaction */}
      <motion.button
        whileHover={{ 
          scale: 1.05, 
          y: -3,
          boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
        }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 17
        }}
        className="absolute cursor-pointer"
        style={{
          right: "80px",
          bottom: "56px",
          width: "200px",
          padding: 0,
          border: "none",
          background: "transparent",
        }}
        onClick={handleBadgeClick}
      >
        <motion.img
          src={immigrationButton}
          alt="입국심사받기 Immigration"
          className="w-full h-auto"
          whileHover={{
            filter: "brightness(1.05)"
          }}
        />
      </motion.button>
    </>
  );
};

export default AssetPlaceholders;
