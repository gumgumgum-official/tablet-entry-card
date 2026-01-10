interface NameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const NameField = ({ value, onChange }: NameFieldProps) => {
  return (
    <div className="absolute" style={{ left: "64px", top: "118px" }}>
      <span
        className="text-foreground"
        style={{
          fontSize: "20px",
          fontWeight: 600,
        }}
      >
        성명 (Name):
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dashed-line absolute text-foreground"
        style={{
          left: "116px",
          top: "6px",
          width: "720px",
          height: "24px",
          fontSize: "18px",
        }}
      />
    </div>
  );
};

export default NameField;
