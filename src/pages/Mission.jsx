import { color, font, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, Panel, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { MISSION_STATEMENT, goals } from "../data/project";

export default function Mission() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker>WHY WE BUILD</Kicker>
          <SectionTitle>Mission Statement</SectionTitle>
          <Lead style={{ maxWidth: 700 }}>{MISSION_STATEMENT}</Lead>
        </Reveal>

        <RevealGroup
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
            marginTop: 56,
          }}
        >
          {goals.map((g) => (
            <RevealItem key={g.num}>
              <Panel interactive style={{ padding: "30px 26px", height: "100%" }}>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 30,
                    fontWeight: 700,
                    color: color.blue,
                    opacity: 0.35,
                    lineHeight: 1,
                  }}
                >
                  {g.num}
                </div>
                <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.text, margin: "14px 0 10px" }}>
                  {g.title}
                </div>
                <p style={{ fontFamily: font.body, fontSize: 13.5, color: color.textDim, lineHeight: 1.7, margin: 0 }}>
                  {g.desc}
                </p>
              </Panel>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
