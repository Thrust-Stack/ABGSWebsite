import { color, font, radius } from "../design/tokens";
import { Kicker, SectionTitle, Lead, StatusBadge, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { milestones } from "../data/project";

// Accent per status. The active phase reads brightest, done phases sit calm in
// blue, upcoming phases stay muted so the eye lands on where the work is now.
const ACCENT = {
  active: color.green,
  complete: color.blue,
  upcoming: color.textGhost,
};

// A labelled block of story text (what we did / learned / ran into). Upcoming
// phases have no story yet, so a null value renders a quiet "pending" note
// rather than a fabricated one.
function StoryBlock({ label, text, tone }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 9.5,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: tone,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {text ? (
        <p style={{ fontFamily: font.body, fontSize: 13.5, lineHeight: 1.7, color: color.textDim, margin: 0 }}>
          {text}
        </p>
      ) : (
        <p style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.08em", color: color.textGhost, margin: 0 }}>
          Notes pending. We'll fill this in once we're through the phase.
        </p>
      )}
    </div>
  );
}

// One documentation photo, or a clearly-marked empty slot for one we still need.
function PhotoSlot({ img }) {
  if (img.placeholder) {
    return (
      <div
        style={{
          border: `1px dashed ${color.line2}`,
          borderRadius: radius.base,
          background: "rgba(255,255,255,0.012)",
          minHeight: 132,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 6,
        }}
      >
        <span style={{ fontFamily: font.mono, fontSize: 18, color: color.textGhost, lineHeight: 1 }}>+</span>
        <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", color: color.textFaint, lineHeight: 1.5 }}>
          {img.cap}
        </span>
      </div>
    );
  }
  return (
    <figure style={{ margin: 0, borderRadius: radius.base, overflow: "hidden", border: `1px solid ${color.line2}` }}>
      <img
        src={img.src}
        alt={img.cap}
        loading="lazy"
        style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover" }}
      />
      <figcaption
        style={{
          fontFamily: font.mono,
          fontSize: 9.5,
          letterSpacing: "0.08em",
          color: color.textFaint,
          padding: "9px 12px",
          background: "rgba(255,255,255,0.015)",
        }}
      >
        {img.cap}
      </figcaption>
    </figure>
  );
}

function PhaseNode({ status, accent }) {
  const active = status === "active";
  const done = status === "complete";
  return (
    <span
      aria-hidden
      style={{
        width: active ? 15 : 11,
        height: active ? 15 : 11,
        borderRadius: "50%",
        background: done ? accent : active ? accent : color.bg3,
        border: `2px solid ${done || active ? accent : color.line2}`,
        // A single soft static ring marks the active phase. No infinite pulse.
        boxShadow: active ? `0 0 0 5px ${color.greenDim}` : "none",
        flexShrink: 0,
      }}
    />
  );
}

function Phase({ m, isMobile, last }) {
  const accent = ACCENT[m.status] || color.textGhost;
  const active = m.status === "active";
  const done = m.status === "complete";
  const emphasized = active || done;

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "24px 1fr" : "40px 1fr", gap: isMobile ? 16 : 24 }}>
      {/* rail + node */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ height: 26, display: "flex", alignItems: "center" }}>
          <PhaseNode status={m.status} accent={accent} />
        </div>
        {!last && <div style={{ flex: 1, width: 1, background: color.line, minHeight: 40 }} />}
      </div>

      {/* card */}
      <div
        style={{
          marginBottom: 30,
          padding: isMobile ? "20px 18px" : "24px 26px",
          background: active
            ? "rgba(18,226,154,0.035)"
            : emphasized
            ? "rgba(255,255,255,0.022)"
            : "rgba(255,255,255,0.012)",
          border: `1px solid ${active ? "rgba(18,226,154,0.22)" : color.line}`,
          borderLeft: `2px solid ${emphasized ? accent : color.line2}`,
          borderRadius: radius.base,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: emphasized ? accent : color.textGhost }}>
              PHASE {m.phase}
            </span>
            <span
              style={{
                fontFamily: font.display,
                fontSize: active ? 22 : 18,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: m.status === "upcoming" ? color.textDim : color.text,
              }}
            >
              {m.title}
            </span>
          </div>
          <StatusBadge status={m.status} />
        </div>

        <p style={{ fontFamily: font.body, fontSize: 14, lineHeight: 1.6, color: color.textDim, margin: "10px 0 0" }}>
          {m.desc}
        </p>

        <StoryBlock label={done ? "What we did" : active ? "What we're doing" : "The plan"} text={m.did} tone={accent} />
        <StoryBlock label="What we learned" text={m.learned} tone={color.blueBright} />
        <StoryBlock label="What fought us" text={m.problems} tone={color.orangeBright} />

        {m.images?.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginTop: 20,
            }}
          >
            {m.images.map((img, i) => (
              <PhotoSlot key={i} img={img} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Timeline() {
  const isMobile = useIsMobile();
  return (
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Reveal>
          <Kicker>BUILD LOG</Kicker>
          <SectionTitle>Where the Project Stands</SectionTitle>
          <Lead>
            Six phases from first sensor reading to first flight. We're on phase one right
            now. Each card below is what we did, what we picked up, and what gave us trouble,
            with room for the build photos as we take them.
          </Lead>
        </Reveal>

        <RevealGroup style={{ marginTop: 44 }}>
          {milestones.map((m, i) => (
            <RevealItem key={m.phase}>
              <Phase m={m} isMobile={isMobile} last={i === milestones.length - 1} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
