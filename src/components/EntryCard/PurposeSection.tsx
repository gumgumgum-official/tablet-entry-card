interface PurposeSectionProps {
  tourism: boolean;
  study: boolean;
  employment: boolean;
  business: boolean;
  worryFree: boolean;
  onTourismChange: (value: boolean) => void;
  onStudyChange: (value: boolean) => void;
  onEmploymentChange: (value: boolean) => void;
  onBusinessChange: (value: boolean) => void;
  onWorryFreeChange: (value: boolean) => void;
}

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxItem = ({ label, checked, onChange }: CheckboxItemProps) => (
  <label
    className="flex items-center cursor-pointer"
    style={{ gap: "8px" }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="custom-checkbox"
    />
    <span
      className="text-foreground"
      style={{
        fontSize: "16px",
        fontWeight: 500,
        lineHeight: "24px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  </label>
);

const PurposeSection = ({
  tourism,
  study,
  employment,
  business,
  worryFree,
  onTourismChange,
  onStudyChange,
  onEmploymentChange,
  onBusinessChange,
  onWorryFreeChange,
}: PurposeSectionProps) => {
  return (
    <div className="flex flex-col">
      <h2
        className="text-foreground"
        style={{
          fontSize: "18px",
          fontWeight: 600,
          lineHeight: "27px",
        }}
      >
        입국목적 (Purpose of Visit):
      </h2>

      <div
        className="flex flex-wrap"
        style={{
          gap: "24px",
          marginTop: "5px",
        }}
      >
        <CheckboxItem
          label="관광 (Tourism)"
          checked={tourism}
          onChange={onTourismChange}
        />
        <CheckboxItem
          label="공부 (Study)"
          checked={study}
          onChange={onStudyChange}
        />
        <CheckboxItem
          label="취업 (Employment)"
          checked={employment}
          onChange={onEmploymentChange}
        />
        <CheckboxItem
          label="업무 (Business)"
          checked={business}
          onChange={onBusinessChange}
        />
      </div>

      <div
        className="flex items-center"
        style={{
          gap: "8px",
          marginTop: "12px",
        }}
      >
        <CheckboxItem
          label="걱정 해소 (Worry-Free Entry)"
          checked={worryFree}
          onChange={onWorryFreeChange}
        />
      </div>

      <div
        className="bg-border"
        style={{
          width: "720px",
          height: "1px",
          marginTop: "12px",
        }}
      />
    </div>
  );
};

export default PurposeSection;
