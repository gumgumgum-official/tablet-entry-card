import { motion } from "framer-motion";
import type { EntryCardData } from "./EntryCardCanvas";

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
      {/* Bear Officer Illustration Placeholder */}
      <div
        className="absolute flex items-center justify-center border-2 border-dashed border-border rounded-lg"
        style={{
          right: "48px",
          bottom: "48px",
          width: "280px",
          height: "320px",
        }}
      >
        <span className="text-muted-foreground text-center text-sm px-4">
          곰 입국심사관<br />
          일러스트<br />
          (Bear Officer)<br />
          280 × 320
        </span>
      </div>

      {/* Immigration Stamp Badge */}
      <motion.div
        whileHover={{ scale: 1.05, rotate: -2 }}
        whileTap={{ scale: 0.95 }}
        className="absolute flex flex-col items-center justify-center cursor-pointer"
        style={{
          right: "80px",
          bottom: "56px",
          width: "160px",
          height: "60px",
          background: "linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(4 55% 42%) 100%)",
          borderRadius: "8px",
          boxShadow: "3px 4px 8px rgba(0,0,0,0.2)",
        }}
        onClick={handleBadgeClick}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="text-lg">✓</span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            입국심사받기
          </span>
        </div>
        <span
          className="text-white/90"
          style={{
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
          }}
        >
          IMMIGRATION
        </span>
      </motion.div>
    </>
  );
};

export default AssetPlaceholders;
