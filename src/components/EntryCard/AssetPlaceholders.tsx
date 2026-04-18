import type { EntryCardData } from "./EntryCardCanvas";
import { cn } from "@/lib/utils";
import stampBadge from "@/assets/stamp2.png";
import immigrationButton from "@/assets/immigration-button.png";
import bearOfficer from "@/assets/bear-officer.png";

/** PNG 입국심사 버튼 사용 시 true. 현재는 텍스트 제출 버튼 */
const USE_PNG_IMMIGRATION_BUTTON = false;

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
        className="absolute pointer-events-none z-[50]"
        style={{
          right: "50px",
          top: "32px",
          width: "390px",
          height: "auto",
        }}
      />

      {/* Immigration Button — PNG: USE_PNG_IMMIGRATION_BUTTON */}
      {USE_PNG_IMMIGRATION_BUTTON ? (
        <img
          src={immigrationButton}
          alt="입국심사받기 Immigration"
          onClick={handleBadgeClick}
          className={cn(
            "absolute transition-[transform,filter,opacity] duration-200 ease-out",
            canSubmit && "hover:scale-[1.02] active:scale-[0.99]"
          )}
          style={{
            right: "96px",
            bottom: "40px",
            width: "400px",
            height: "auto",
            zIndex: 50,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.15))",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.6,
          }}
        />
      ) : (
        <button
          type="button"
          onClick={handleBadgeClick}
          disabled={!canSubmit}
          className={cn(
            "absolute z-[20] h-12 min-w-[200px] justify-center rounded-lg px-8 text-[15px] font-medium",
            "touch-manipulation select-none cursor-pointer",
            "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(25,45,50,0.14)]",
            /* Same idea as eraser chips: transition-all + obvious bg/text shift on hover */
            "transition-all duration-200 ease-out",
            "hover:-translate-y-px hover:shadow-md",
            "hover:bg-primary-foreground/22 hover:text-primary",
            "active:translate-y-0 active:scale-[0.98] active:shadow-sm active:bg-primary-foreground/12 active:text-primary-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-[0_1px_4px_rgba(25,45,50,0.1)]"
          )}
          style={{
            right: "96px",
            bottom: "40px",
          }}
        >
          입국심사받기
        </button>
      )}

      {/* Bear Officer Illustration */}
      <img
        src={bearOfficer}
        alt="Bear Immigration Officer"
        className="absolute pointer-events-none z-[50]"
        style={{
          right: "-20px",
          bottom: "30px",
          width: "200px",
          height: "auto",
        }}
      />
    </>
  );
};

export default AssetPlaceholders;
