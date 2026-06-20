import { useState } from "react";
import { teamMembers, mono, display, accent, SectionLabel, SectionTitle } from "../shared";

function Avatar({ member, hovered }) {
  const initials = member.name.split(" ").map(w => w[0]).join("");
  const borderColor = hovered ? "rgba(0,255,170,0.3)" : "rgba(255,255,255,0.08)";

  if (member.photo) {
    return (
      <div style={{
        width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 16px",
        border: `1px solid ${borderColor}`, overflow: "hidden", transition: "border-color 0.3s",
      }}>
        <img
          src={member.photo}
          alt={member.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 16px",
      background: "linear-gradient(135deg, rgba(0,255,170,0.15), rgba(0,170,255,0.15))",
      border: `1px solid ${borderColor}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: mono, fontSize: "22px", color: accent, opacity: 0.6,
      transition: "all 0.3s",
    }}>
      {initials}
    </div>
  );
}

export default function Team() {
  const [hovered, setHovered] = useState(null);
  return (
    <section style={{ padding: "120px 24px 100px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <SectionLabel>THE CREW</SectionLabel>
        <SectionTitle>Team</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginTop: "32px" }}>
          {teamMembers.map((m, i) => (
            <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{
              padding: "28px 24px", textAlign: "center",
              background: hovered === i ? "rgba(0,255,170,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${hovered === i ? "rgba(0,255,170,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: "8px", transition: "all 0.3s",
            }}>
              <Avatar member={m} hovered={hovered === i} />
              <div style={{ fontFamily: display, fontSize: "16px", fontWeight: 600, color: "#fff", marginBottom: "10px" }}>{m.name}</div>
              <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "2px", color: accent, opacity: 0.6, textTransform: "uppercase", marginBottom: "10px" }}>{m.role}</div>
              <p style={{ fontFamily: mono, fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.6, margin: 0 }}>{m.focus}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
