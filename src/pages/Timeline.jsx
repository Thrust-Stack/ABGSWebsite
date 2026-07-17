import { color, font } from "../design/tokens";
import { Kicker, SectionTitle, StatusBadge, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { milestones } from "../data/project";

export default function Timeline() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <Reveal>
          <Kicker>MISSION TIMELINE</Kicker>
          <SectionTitle>Development Phases</SectionTitle>
        </Reveal>

        <RevealGroup style={{ marginTop: 48, position: "relative" }}>
          {/* rail */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: isMobile ? 19 : 29,
              top: 8,
              bottom: 8,
              width: 1,
              background: `linear-gradient(to bottom, ${color.blue}, ${color.line} 40%, ${color.line})`,
            }}
          />
          {milestones.map((m) => {
            const active = m.status === "active";
            const done = m.status === "complete";
            return (
              <RevealItem key={m.phase}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "40px 1fr" : "60px 1fr auto",
                    alignItems: "center",
                    gap: isMobile ? 14 : 24,
                    padding: isMobile ? "18px 0" : "22px 0",
                    position: "relative",
                  }}
                >
                  {/* node */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        width: active ? 14 : 10,
                        height: active ? 14 : 10,
                        borderRadius: "50%",
                        background: active ? color.green : done ? color.blue : color.bg3,
                        border: `2px solid ${active ? color.green : done ? color.blue : color.line2}`,
                        boxShadow: active ? `0 0 14px ${color.greenDim}` : "none",
                        animation: active ? "ts-pulse 2s ease-in-out infinite" : "none",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: font.mono,
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          color: active ? color.green : color.textGhost,
                        }}
                      >
                        PHASE {m.phase}
                      </span>
                      <span
                        style={{
                          fontFamily: font.display,
                          fontSize: 18,
                          fontWeight: 600,
                          color: m.status === "upcoming" ? color.textFaint : color.text,
                        }}
                      >
                        {m.title}
                      </span>
                    </div>
                    <div style={{ fontFamily: font.body, fontSize: 13, color: color.textFaint, marginTop: 5, lineHeight: 1.6 }}>
                      {m.desc}
                    </div>
                    {isMobile && (
                      <div style={{ marginTop: 10 }}>
                        <StatusBadge status={m.status} />
                      </div>
                    )}
                  </div>
                  {!isMobile && <StatusBadge status={m.status} />}
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
