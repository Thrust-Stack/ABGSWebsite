import { milestones, mono, display, accent, SectionLabel, SectionTitle, StatusBadge } from "../shared";

export default function Timeline() {
  return (
    <section style={{ padding: "120px 24px 100px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <SectionLabel>MISSION TIMELINE</SectionLabel>
        <SectionTitle>Development Phases</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "32px" }}>
          {milestones.map((m, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "60px 1fr auto", alignItems: "center", gap: "20px", padding: "20px 24px",
              background: m.status === "active" ? "rgba(0,255,170,0.04)" : "rgba(255,255,255,0.01)",
              borderLeft: m.status === "active" ? `2px solid ${accent}` : "2px solid rgba(255,255,255,0.06)",
              borderRadius: "0 6px 6px 0",
            }}>
              <span style={{ fontFamily: mono, fontSize: "24px", fontWeight: 700, color: m.status === "active" ? accent : "rgba(255,255,255,0.12)" }}>{m.phase}</span>
              <div>
                <div style={{ fontFamily: display, fontSize: "16px", fontWeight: 600, color: m.status === "upcoming" ? "rgba(255,255,255,0.3)" : "#fff", marginBottom: "4px" }}>{m.title}</div>
                <div style={{ fontFamily: mono, fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{m.desc}</div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
