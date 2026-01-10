interface WorrySectionProps {
  value: string;
  onChange: (value: string) => void;
}

const WorrySection = ({ value, onChange }: WorrySectionProps) => {
  return (
    <>
      {/* Description Text */}
      <p
        className="absolute text-foreground"
        style={{
          left: "64px",
          top: "264px",
          fontSize: "15px",
          lineHeight: "22px",
          maxWidth: "720px",
        }}
      >
        요즘 당신을 껌딱지처럼 따라다니며 괴롭히는 걱정거리를 아래에 가감없이 적어주세요. 입국 시 모두 압수될 예정입니다.
      </p>

      {/* Textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="여기에 걱정을 적으시면 '껌딱' 지돈에서 대신 우쭈쭈해드립니다."
        className="dashed-textarea absolute text-foreground placeholder:text-muted-foreground/60"
        style={{
          left: "64px",
          top: "304px",
          width: "720px",
          height: "80px",
          padding: "14px 16px",
          fontSize: "15px",
          lineHeight: "22px",
        }}
      />

      {/* Horizontal divider */}
      <div
        className="absolute bg-border"
        style={{
          left: "64px",
          top: "404px",
          width: "720px",
          height: "1px",
        }}
      />
    </>
  );
};

export default WorrySection;
