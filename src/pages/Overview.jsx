import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TEAM_NAME, TAGLINE, mono, display, accent, accentBlue, Ticker, RocketIllustration } from "../shared";

const sections = [
  { label: "Mission", path: "/mission", icon: "◎", desc: "Goals, mission statement, and why we build." },
  { label: "Telemetry", path: "/telemetry", icon: "◇", desc: "Live simulated flight data and ground station demo." },
  { label: "Hardware", path: "/hardware", icon: "⬡", desc: "Avionics bay hardware stack and data architecture." },
  { label: "Timeline", path: "/timeline", icon: "△", desc: "Development phases and milestone tracker." },
  { label: "Team", path: "/team", icon: "◈", desc: "Meet the crew behind Apex Aero." },
];

export default function Overview() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <>
      {/* Hero */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", position: "relative", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)", transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)", display: "flex", alignItems: "center", gap: "60px", flexWrap: "wrap", justifyContent: "center" }}>
          <RocketIllustration />
          <div style={{ textAlign: "left", maxWidth: "500px" }}>
            <div style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "6px", color: accent, marginBottom: "24px", textTransform: "uppercase" }}>
              ▲ {TEAM_NAME} ▲
            </div>
            <h1 style={{ fontFamily: display, fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 700, color: "#fff", lineHeight: 1.05, margin: "0 0 20px 0", letterSpacing: "-2px" }}>
              Active Fin<br />
              <span style={{ background: "linear-gradient(135deg, #00ffaa, #00aaff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Control System
              </span>
            </h1>
            <p style={{ fontFamily: mono, fontSize: "14px", color: "rgba(255,255,255,0.45)", margin: "0 0 32px", lineHeight: 1.7, letterSpacing: "0.5px" }}>
              {TAGLINE}
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link to="/mission" style={{ fontFamily: mono, fontSize: "13px", padding: "12px 28px", border: "1px solid rgba(0,255,170,0.4)", color: accent, borderRadius: "4px", letterSpacing: "2px", textTransform: "uppercase", background: "rgba(0,255,170,0.06)", textDecoration: "none" }}>
                Our Mission →
              </Link>
              <Link to="/telemetry" style={{ fontFamily: mono, fontSize: "13px", padding: "12px 28px", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: "4px", letterSpacing: "2px", textTransform: "uppercase", background: "rgba(255,255,255,0.02)", textDecoration: "none" }}>
                Live Demo →
              </Link>
            </div>
            <div style={{ display: "flex", gap: "32px", alignItems: "center", marginTop: "48px" }}>
              <Ticker />
              <span style={{ fontFamily: mono, fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "2px" }}>STATUS: DEVELOPMENT</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section cards */}
      <section style={{ padding: "0 24px 120px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ fontFamily: mono, fontSize: "11px", letterSpacing: "4px", color: accent, marginBottom: "12px" }}>EXPLORE</div>
          <h2 style={{ fontFamily: display, fontSize: "28px", fontWeight: 600, color: "#fff", margin: "0 0 32px 0" }}>Project Overview</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
            {sections.map((s) => (
              <Link key={s.label} to={s.path} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "28px 24px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  borderTop: `2px solid ${accent}`,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(0,255,170,0.04)";
                  e.currentTarget.style.border = "1px solid rgba(0,255,170,0.2)";
                  e.currentTarget.style.borderTop = `2px solid ${accent}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderTop = `2px solid ${accent}`;
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <span style={{ fontSize: "20px", color: accent, opacity: 0.7, fontFamily: mono }}>{s.icon}</span>
                    <span style={{ fontFamily: display, fontSize: "17px", fontWeight: 600, color: "#fff" }}>{s.label}</span>
                  </div>
                  <p style={{ fontFamily: mono, fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.7, margin: "0 0 16px 0" }}>{s.desc}</p>
                  <span style={{ fontFamily: mono, fontSize: "11px", color: accent, letterSpacing: "1px" }}>VIEW →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
