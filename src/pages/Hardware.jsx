import { useState } from "react";
import { hardwareStack, mono, display, accent, SectionLabel, SectionTitle, useIsMobile } from "../shared";

export default function Hardware() {
  const [hovered, setHovered] = useState(null);
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "90px 16px 60px" : "120px 24px 100px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <SectionLabel>AVIONICS BAY</SectionLabel>
        <SectionTitle>Hardware Stack</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginTop: "32px" }}>
          {hardwareStack.map((hw, i) => (
            <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{
              padding: "28px 24px",
              background: hovered === i ? "rgba(0,255,170,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${hovered === i ? "rgba(0,255,170,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: "8px", transition: "all 0.3s ease", cursor: "default",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "20px", color: accent, opacity: 0.7, fontFamily: mono }}>{hw.icon}</span>
                <div>
                  <div style={{ fontFamily: display, fontSize: "16px", fontWeight: 600, color: "#fff" }}>{hw.name}</div>
                  <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "2px", color: accent, opacity: 0.6, textTransform: "uppercase" }}>{hw.role}</div>
                </div>
              </div>
              <p style={{ fontFamily: mono, fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: 0 }}>{hw.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
