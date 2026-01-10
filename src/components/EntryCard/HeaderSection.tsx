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

      {/* Horizontal Line under title */}
      <div
        className="absolute bg-border"
        style={{
          left: "64px",
          top: "82px",
          width: "720px",
          height: "1px",
        }}
      />

    </>
  );
};

export default HeaderSection;
