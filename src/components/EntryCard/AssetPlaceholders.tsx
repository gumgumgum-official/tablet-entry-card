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
      {/* Bear Illustration Placeholder */}
      <div
        className="absolute flex items-center justify-center border-2 border-dashed border-border rounded-lg"
        style={{
          right: "64px",
          bottom: "64px",
          width: "320px",
          height: "280px",
        }}
      >
        <span className="text-muted-foreground text-center text-sm px-4">
          곰 일러스트<br />
          (Bear Illustration)<br />
          320 × auto
        </span>
      </div>

      {/* Immigration Badge Placeholder */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="absolute flex items-center justify-center border-2 border-dashed border-accent rounded-lg cursor-pointer"
        style={{
          right: "84px",
          bottom: "360px",
          width: "280px",
          height: "80px",
        }}
        onClick={handleBadgeClick}
      >
        <span className="text-accent text-center text-sm px-4">
          입국심사받기 배지<br />
          (Immigration Badge)<br />
          280 × auto
        </span>
      </motion.div>

      {/* Transparent Hit Area over Badge (for when real asset is added) */}
      <div
        className="absolute cursor-pointer"
        style={{
          right: "84px",
          bottom: "360px",
          width: "280px",
          height: "80px",
          background: "transparent",
        }}
        onClick={handleBadgeClick}
      />
    </>
  );
};

export default AssetPlaceholders;
