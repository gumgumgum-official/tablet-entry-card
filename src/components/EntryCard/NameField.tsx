interface NameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const NameField = ({ value, onChange }: NameFieldProps) => {
  return (
    <div className="absolute flex items-center" style={{ left: "64px", top: "100px" }}>
      <span
        className="text-foreground"
        style={{
          fontSize: "18px",
          fontWeight: 600,
        }}
      >
        성명 (Name):
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="dashed-line text-foreground ml-4"
        style={{
          width: "600px",
          height: "28px",
          fontSize: "18px",
        }}
      />
    </div>
  );
};

export default NameField;
