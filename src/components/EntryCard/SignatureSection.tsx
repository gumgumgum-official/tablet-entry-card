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
        <div 
          className="relative ml-3"
          style={{ width: "300px" }}
        >
          <input
            type="text"
            value={signature}
            onChange={(e) => onSignatureChange(e.target.value)}
            placeholder="여기에 서명하세요"
            className="signature-field text-foreground w-full placeholder:text-muted-foreground/40 handwriting"
            style={{
              height: "36px",
              fontSize: "24px",
              letterSpacing: "0.02em",
            }}
          />
        </div>
      </div>

      {/* Date Field */}
      <div className="absolute flex items-center" style={{ left: "64px", top: "656px" }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "16px",
            fontWeight: 500,
          }}
        >
          날짜 (Date):
        </span>
        <span
          className="ml-3 text-foreground handwriting"
          style={{
            fontSize: "22px",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {date}
        </span>
      </div>
    </>
  );
};

export default SignatureSection;
