interface AgreementSectionProps {
  agreement1: boolean;
  agreement2: boolean;
  agreement3: boolean;
  onAgreement1Change: (value: boolean) => void;
  onAgreement2Change: (value: boolean) => void;
  onAgreement3Change: (value: boolean) => void;
}

interface AgreementItemProps {
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  top: number;
}

const AgreementItem = ({ text, checked, onChange, top }: AgreementItemProps) => (
  <label
    className="absolute flex items-start cursor-pointer"
    style={{
      left: "64px",
      top: `${top}px`,
      gap: "10px",
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="custom-checkbox flex-shrink-0"
      style={{ marginTop: "2px" }}
    />
    <span
      className="text-foreground"
      style={{
        fontSize: "16px",
        lineHeight: "24px",
        maxWidth: "860px",
      }}
    >
      {text}
    </span>
  </label>
);

const AgreementSection = ({
  agreement1,
  agreement2,
  agreement3,
  onAgreement1Change,
  onAgreement2Change,
  onAgreement3Change,
}: AgreementSectionProps) => {
  return (
    <>
      {/* Section Title */}
      <h2
        className="absolute text-foreground"
        style={{
          left: "64px",
          top: "508px",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        동의사항 (Agreements)
      </h2>

      {/* Agreement Items */}
      <AgreementItem
        text="본인은 꿈띠 나라의 규칙을 준수할 것을 동의합니다."
        checked={agreement1}
        onChange={onAgreement1Change}
        top={552}
      />
      <AgreementItem
        text="본인은 다른 여행자들을 존중하고 배려할 것을 동의합니다."
        checked={agreement2}
        onChange={onAgreement2Change}
        top={596}
      />
      <AgreementItem
        text="본인은 걱정을 내려놓고 즐거운 여행을 할 것을 동의합니다."
        checked={agreement3}
        onChange={onAgreement3Change}
        top={640}
      />
    </>
  );
};

export default AgreementSection;
