interface WorrySectionProps {
  value: string;
  onChange: (value: string) => void;
}

const WorrySection = ({ value, onChange }: WorrySectionProps) => {
  return (
    <>
      {/* Description Text */}
      <p
        className="absolute text-muted-foreground"
        style={{
          left: "64px",
          top: "320px",
          fontSize: "16px",
          lineHeight: "24px",
        }}
      >
        꿈띠 나라에 입국하면서 내려놓고 싶은 걱정이 있다면 적어주세요.
      </p>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="여기에 걱정을 적어주세요..."
        className="dashed-textarea absolute text-foreground"
        style={{
          left: "64px",
          top: "360px",
          width: "1048px",
          height: "112px",
          padding: "16px",
          fontSize: "16px",
          lineHeight: "24px",
        }}
      />
    </>
  );
};

export default WorrySection;
