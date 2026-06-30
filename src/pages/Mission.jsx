import { MISSION_STATEMENT, goals, mono, display, accent, SectionLabel, SectionTitle, useIsMobile } from "../shared";

export default function Mission() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "90px 16px 60px" : "120px 24px 100px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <SectionLabel>WHY WE BUILD</SectionLabel>
        <SectionTitle>Mission Statement</SectionTitle>
        <p style={{ fontFamily: mono, fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 2, marginBottom: "48px", maxWidth: "700px" }}>
          {MISSION_STATEMENT}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
          {goals.map((g, i) => (
            <div key={i} style={{
              padding: "28px 24px", background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px",
              borderTop: `2px solid ${accent}`,
            }}>
              <span style={{ fontFamily: mono, fontSize: "28px", fontWeight: 700, color: accent, opacity: 0.3 }}>{g.num}</span>
              <div style={{ fontFamily: display, fontSize: "17px", fontWeight: 600, color: "#fff", margin: "8px 0" }}>{g.title}</div>
              <p style={{ fontFamily: mono, fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>{g.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
