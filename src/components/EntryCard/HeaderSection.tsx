const HeaderSection = () => {
  return (
    <>
      {/* Main Title */}
      <h1
        className="absolute font-semibold text-primary"
        style={{
          left: "64px",
          top: "42px",
          fontSize: "34px",
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.06em",
          lineHeight: "36px",
        }}
      >
        GGUMDDI NATION ENTRY CARD
      </h1>

      {/* Red Ribbon Label */}
      <div
        className="absolute flex items-center justify-center bg-accent text-accent-foreground"
        style={{
          right: "56px",
          top: "36px",
          width: "260px",
          height: "44px",
          fontSize: "14px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          borderRadius: "4px",
          transform: "rotate(-2deg)",
        }}
      >
        FOR FOREIGN TRAVELLERS
      </div>
    </>
  );
};

export default HeaderSection;
