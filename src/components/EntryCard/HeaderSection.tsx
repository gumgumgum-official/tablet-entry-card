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

      {/* Red Ribbon Label */}
      <div
        className="absolute flex items-center justify-center bg-accent text-accent-foreground"
        style={{
          right: "56px",
          top: "28px",
          width: "220px",
          height: "36px",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          borderRadius: "3px",
          transform: "rotate(-8deg)",
          boxShadow: "2px 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        FOR FOREIGN TRAVELLERS
      </div>

      {/* GGUMDDI NATION Badge */}
      <div
        className="absolute flex flex-col items-center justify-center text-accent"
        style={{
          right: "64px",
          top: "72px",
          width: "140px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: "22px",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.02em",
            lineHeight: "26px",
          }}
        >
          GGUMDDI
        </span>
        <span
          style={{
            fontSize: "18px",
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          NATION
        </span>
      </div>
    </>
  );
};

export default HeaderSection;
