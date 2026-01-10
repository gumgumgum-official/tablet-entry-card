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
    <>
      {/* Section Title */}
      <h2
        className="absolute text-foreground"
        style={{
          left: "64px",
          top: "144px",
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        입국목적 (Purpose of Visit):
      </h2>

      {/* Checkboxes Row */}
      <div
        className="absolute flex flex-wrap"
        style={{
          left: "64px",
          top: "176px",
          gap: "24px",
        }}
      >
        <CheckboxItem
          label="관광 Tourism"
          checked={tourism}
          onChange={onTourismChange}
        />
        <CheckboxItem
          label="공부 Study"
          checked={study}
          onChange={onStudyChange}
        />
        <CheckboxItem
          label="취업 Employment"
          checked={employment}
          onChange={onEmploymentChange}
        />
        <CheckboxItem
          label="업무 Business"
          checked={business}
          onChange={onBusinessChange}
        />
      </div>

      {/* Second Row - Worry Free with checkmark */}
      <div
        className="absolute flex items-center"
        style={{
          left: "64px",
          top: "212px",
          gap: "8px",
        }}
      >
        <CheckboxItem
          label="걱정 해소 Worry-Free Entry"
          checked={worryFree}
          onChange={onWorryFreeChange}
        />
        {worryFree && (
          <span style={{ fontSize: "16px" }}>💕</span>
        )}
      </div>

      {/* Horizontal divider */}
      <div
        className="absolute bg-border"
        style={{
          left: "64px",
          top: "248px",
          width: "720px",
          height: "1px",
        }}
      />
    </>
  );
};

export default PurposeSection;
