import { useState } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { usePrefersReducedMotion } from "../three/hooks";
import { teamMembers } from "../data/project";
import OrbitalTeam from "../components/OrbitalTeam";

function MemberCard({ m }) {
  const [hover, setHover] = useState(false);
  const initials = m.name.split(" ").map((w) => w[0]).join("");

  const card = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${hover ? color.line2 : color.line}`,
        borderRadius: radius.base,
        padding: "30px 24px",
        textAlign: "center",
        height: "100%",
        transform: hover && m.linkedin ? "translateY(-3px)" : "none",
        transition: "all 260ms cubic-bezier(0.16,1,0.3,1)",
        cursor: m.linkedin ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          margin: "0 auto 18px",
          overflow: "hidden",
          border: `1px solid ${hover ? "rgba(59,130,246,0.5)" : color.line2}`,
          background: `linear-gradient(135deg, ${color.blueDim}, ${color.orangeDim})`,
          display: "grid",
          placeItems: "center",
          transition: "border-color 260ms",
        }}
      >
        {m.photo ? (
          <img
            src={m.photo}
            alt={m.name}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
          />
        ) : (
          <span style={{ fontFamily: font.mono, fontSize: 24, color: color.blueBright }}>{initials}</span>
        )}
      </div>
      <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: color.text }}>
        {m.name}
        {m.linkedin && (
          <span style={{ marginLeft: 7, fontSize: 12, color: color.blueBright, opacity: hover ? 1 : 0.35, transition: "opacity 200ms" }}>
            ↗
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: color.blue,
          textTransform: "uppercase",
          margin: "8px 0 12px",
        }}
      >
        {m.role}
      </div>
      <p style={{ fontFamily: font.body, fontSize: 12.5, color: color.textFaint, lineHeight: 1.65, margin: 0 }}>{m.focus}</p>
    </div>
  );

  return m.linkedin ? (
    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", height: "100%" }}>
      {card}
    </a>
  ) : (
    card
  );
}

export default function Team() {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();

  return (
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker>THE CREW</Kicker>
          <SectionTitle>Team</SectionTitle>
          <Lead>Four engineers, one vehicle. Design, controls, computing, and fluids.</Lead>
        </Reveal>

        {/* Orbital view — the crew in orbit around the mark. Motion-sensitive
            visitors get the static grid below instead. */}
        {!reduced && (
          <Reveal delay={0.1}>
            <OrbitalTeam members={teamMembers} />
          </Reveal>
        )}

        {/* Full detail grid (and the reduced-motion fallback) */}
        <RevealGroup
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 16,
            marginTop: reduced ? 48 : 8,
          }}
        >
          {teamMembers.map((m) => (
            <RevealItem key={m.name} style={{ height: "100%" }}>
              <MemberCard m={m} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
