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
}

const AgreementItem = ({ text, checked, onChange }: AgreementItemProps) => (
  <label
    className="flex items-start cursor-pointer"
    style={{ gap: "10px" }}
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

const AgreementSection = ({
  agreement1,
  agreement2,
  agreement3,
  onAgreement1Change,
  onAgreement2Change,
  onAgreement3Change,
}: AgreementSectionProps) => {
  return (
    <div className="flex flex-col">
      <h2
        className="text-foreground"
        style={{
          fontSize: "17px",
          fontWeight: 600,
          lineHeight: "25px",
        }}
      >
        입국을 위해 아래의 사항에 모두 동의하십니까?
      </h2>

      <div
        className="flex flex-col"
        style={{ gap: "22px", marginTop: "9px" }}
      >
        <AgreementItem
          text="위 걱정은 100% 본인의 순도 높은 고민이며, 거짓일 경우 입국 즉시 껌딱지로 변해도 할 말이 없습니다."
          checked={agreement1}
          onChange={onAgreement1Change}
        />
        <AgreementItem
          text="껌딱지 월드의 강력한 귀여움에 심장이 멎을 수 있음을 인지하였으며, 기꺼이 힐링을 받을 준비가 되었습니다."
          checked={agreement2}
          onChange={onAgreement2Change}
        />
        <AgreementItem
          text='내 걱정이 다른 여행자들에게 "아, 나만 이런 게 아니구나" 하는 위안의 메시지로 슬쩍 노출되어도 너그럽게 이해하겠습니다.'
          checked={agreement3}
          onChange={onAgreement3Change}
        />
      </div>
    </div>
  );
};

export default AgreementSection;
