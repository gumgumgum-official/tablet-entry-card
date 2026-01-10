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
  return (
    <>
      {/* Signature Field */}
      <div className="absolute" style={{ left: "64px", top: "688px" }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "18px",
            fontWeight: 500,
          }}
        >
          서명 (Signature):
        </span>
        <input
          type="text"
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          className="dashed-line absolute text-foreground"
          style={{
            left: "140px",
            top: "4px",
            width: "280px",
            height: "24px",
            fontSize: "18px",
          }}
        />
      </div>

      {/* Date Field */}
      <div className="absolute" style={{ left: "64px", top: "736px" }}>
        <span
          className="text-foreground"
          style={{
            fontSize: "18px",
            fontWeight: 500,
          }}
        >
          날짜 (Date):
        </span>
        <input
          type="text"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          placeholder="YYYY / MM / DD"
          className="dashed-line absolute text-foreground"
          style={{
            left: "120px",
            top: "4px",
            width: "180px",
            height: "24px",
            fontSize: "18px",
          }}
        />
      </div>
    </>
  );
};

export default SignatureSection;
