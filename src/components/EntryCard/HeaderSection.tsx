const HeaderSection = () => {
  return (
    <div className="flex flex-col">
      <h1
        className="font-semibold text-primary"
        style={{
          fontSize: "32px",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: "38px",
        }}
      >
        GGUMDDI NATION ENTRY CARD
      </h1>

      <h2
        className="font-semibold text-primary"
        style={{
          fontSize: "20px",
          fontWeight: 600,
          letterSpacing: "0.02em",
          lineHeight: "29px",
        }}
      >
        껌딱지월드 입국신고서
      </h2>

      <div
        className="bg-border"
        style={{
          width: "720px",
          height: "1px",
          marginTop: "7px",
        }}
      />
    </div>
  );
};

export default HeaderSection;
