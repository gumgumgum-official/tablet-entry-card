const HeaderSection = () => {
  return (
    <>
      {/* Main Title */}
      <h1
        className="absolute font-semibold text-primary"
        style={{
          left: "64px",
          top: "36px",
          fontSize: "32px",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: "38px",
        }}
      >
        GGUMDDI NATION ENTRY CARD
      </h1>

      {/* Korean Subtitle */}
      <h2
        className="absolute font-semibold text-primary"
        style={{
          left: "64px",
          top: "74px",
          fontSize: "20px",
          fontWeight: 600,
          letterSpacing: "0.02em",
          lineHeight: "29px",
        }}
      >
        껌딱지월드 입국신고서
      </h2>

      {/* Horizontal Line under title */}
      <div
        className="absolute bg-border"
        style={{
          left: "64px",
          top: "110px",
          width: "720px",
          height: "1px",
        }}
      />

    </>
  );
};

export default HeaderSection;
