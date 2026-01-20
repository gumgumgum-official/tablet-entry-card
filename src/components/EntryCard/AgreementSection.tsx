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
      style={{ marginTop: "3px" }}
    />
    <span
      className="text-foreground"
      style={{
        fontSize: "14px",
        lineHeight: "22px",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  </label>
);

// 위치 오프셋 (WorrySection 변경에 따른 조정)
const TOP_OFFSET = 48;

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
          top: `${448 + TOP_OFFSET}px`,
          fontSize: "17px",
          fontWeight: 600,
        }}
      >
        입국을 위해 아래의 사항에 모두 동의하십니까?
      </h2>

      {/* Agreement Items */}
      <AgreementItem
        text="위 걱정은 100% 본인의 순도 높은 고민이며, 거짓일 경우 입국 즉시 껌딱지로 변해도 할 말이 없습니다."
        checked={agreement1}
        onChange={onAgreement1Change}
        top={482 + TOP_OFFSET}
      />
      <AgreementItem
        text="껌딱지 월드의 강력한 귀여움에 심장이 멎을 수 있음을 인지하였으며, 기꺼이 힐링을 받을 준비가 되었습니다."
        checked={agreement2}
        onChange={onAgreement2Change}
        top={526 + TOP_OFFSET}
      />
      <AgreementItem
        text='내 걱정이 다른 여행자들에게 "아, 나만 이런 게 아니구나" 하는 위안의 메시지로 슬쩍 노출되어도 너그럽게 이해하겠습니다.'
        checked={agreement3}
        onChange={onAgreement3Change}
        top={570 + TOP_OFFSET}
      />
    </>
  );
};

export default AgreementSection;
