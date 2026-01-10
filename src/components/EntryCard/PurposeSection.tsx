interface PurposeSectionProps {
  tourism: boolean;
  business: boolean;
  worryFree: boolean;
  onTourismChange: (value: boolean) => void;
  onBusinessChange: (value: boolean) => void;
  onWorryFreeChange: (value: boolean) => void;
}

interface CheckboxItemProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: React.CSSProperties;
}

const CheckboxItem = ({ label, checked, onChange, style }: CheckboxItemProps) => (
  <label
    className="flex items-center cursor-pointer"
    style={{ gap: "10px", ...style }}
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
        fontSize: "18px",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  </label>
);

const PurposeSection = ({
  tourism,
  business,
  worryFree,
  onTourismChange,
  onBusinessChange,
  onWorryFreeChange,
}: PurposeSectionProps) => {
  return (
    <>
      {/* Section Title */}
      <h2
        className="absolute text-foreground"
        style={{
          left: "64px",
          top: "176px",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        입국목적 (Purpose of Entry)
      </h2>

      {/* First Row of Checkboxes */}
      <div
        className="absolute flex"
        style={{
          left: "64px",
          top: "224px",
          gap: "32px",
        }}
      >
        <CheckboxItem
          label="관광 (Tourism)"
          checked={tourism}
          onChange={onTourismChange}
        />
        <CheckboxItem
          label="사업 (Business)"
          checked={business}
          onChange={onBusinessChange}
        />
      </div>

      {/* Second Row of Checkboxes */}
      <div
        className="absolute flex"
        style={{
          left: "64px",
          top: "264px",
          gap: "32px",
        }}
      >
        <CheckboxItem
          label="걱정해소 (Worry-Free)"
          checked={worryFree}
          onChange={onWorryFreeChange}
        />
      </div>
    </>
  );
};

export default PurposeSection;
