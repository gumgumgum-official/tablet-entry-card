import { useEffect } from "react";
import { format } from "date-fns";

interface SignatureSectionProps {
  signature: string;
  date: string;
  onSignatureChange: (value: string) => void;
  onDateChange: (value: string) => void;
}

const SignatureSection = ({
  signature,
  date,
  onSignatureChange,
  onDateChange,
}: SignatureSectionProps) => {
  // Set today's date on mount
  useEffect(() => {
    if (!date) {
      const today = format(new Date(), "yyyy / MM / dd");
      onDateChange(today);
    }
  }, [date, onDateChange]);

  return (
    <>
      {/* Signature Field */}
      <div className="absolute flex items-center" style={{ left: "64px", top: "600px" }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          서명 (Signature):
        </span>
        <input
          type="text"
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          className="dashed-line text-foreground ml-3"
          style={{
            width: "300px",
            height: "28px",
            fontSize: "18px",
          }}
        />
      </div>

      {/* Date Field */}
      <div className="absolute flex items-center" style={{ left: "64px", top: "648px" }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          날짜 (Date):
        </span>
        <input
          type="text"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="dashed-line text-foreground ml-3"
          style={{
            width: "200px",
            height: "28px",
            fontSize: "18px",
          }}
        />
      </div>
    </>
  );
};

export default SignatureSection;
