import { useState, useEffect, lazy, Suspense } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, Panel, Tag, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { Button } from "../design/primitives";
import { useWebGLSupport, usePrefersReducedMotion, useIsTouch } from "../three/hooks";
import { components, servoSystem } from "../data/project";

// The per-board 3D render pulls in three/R3F; lazy-load it so it splits into its
// own chunk and only downloads once a visitor actually opens a card's 3D view.
const BoardViewer = lazy(() => import("../three/BoardViewer"));

const TONE = { blue: color.blue, orange: color.orange, green: color.green, metal: color.metal };

// A component card. The whole card is the click target when WebGL is available —
// there is no separate "view in 3D" button. Clicking anywhere on it opens the
// board's 3D render enlarged in front of the viewer (see BoardModal); the card
// signals it's clickable through Panel's hover state + a pointer cursor.
function ComponentCard({ c, webgl, onOpen }) {
  const tone = TONE[c.tone] || color.metal;
  const clickable = webgl;
  return (
    <Panel
      interactive
      onClick={clickable ? () => onOpen(c) : undefined}
      style={{
        padding: "26px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: color.text }}>{c.name}</div>
          <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.18em", color: tone, marginTop: 5, textTransform: "uppercase" }}>
            {c.role}
          </div>
        </div>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: tone,
            marginTop: 6,
            flexShrink: 0,
            opacity: 0.9,
          }}
        />
      </div>
      <p style={{ fontFamily: font.body, fontSize: 13, color: color.textDim, lineHeight: 1.7, margin: "12px 0 16px", flex: 1 }}>
        {c.desc}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Tag tone={c.tone}>{c.system}</Tag>
        {c.connectsTo.slice(0, 2).map((link) => (
          <Tag key={link}>{link.split(" (")[0]}</Tag>
        ))}
      </div>

      {/* Not a button — a purely visual hint (pointer-events off) so the entire
          card stays the single click target. */}
      {clickable && (
        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: color.textFaint,
            pointerEvents: "none",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone, opacity: 0.9 }} />
          Click to inspect in 3D →
        </div>
      )}
    </Panel>
  );
}

// The enlarged 3D render, presented in front of the viewer over a dimmed
// backdrop. It reuses BoardViewer (the same procedural board model + turntable
// the home sled uses); the scale-in gives the "pulled toward you" feel. Close
// by clicking outside, pressing Escape, or the × — matching the click-to-open
// interaction on the card.
function BoardModal({ c, reduced, isTouch, onClose }) {
  const tone = TONE[c.tone] || color.metal;
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(true);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${c.name} in 3D`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(4,5,7,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        opacity: shown ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          background: "rgba(10,11,14,0.92)",
          border: `1px solid ${color.line2}`,
          borderRadius: radius.lg,
          overflow: "hidden",
          opacity: shown ? 1 : 0,
          transform: shown ? "scale(1) translateY(0)" : "scale(0.92) translateY(10px)",
          transition: "opacity 260ms cubic-bezier(0.16,1,0.3,1), transform 260ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "18px 20px",
            borderBottom: `1px solid ${color.line}`,
          }}
        >
          <div>
            <div style={{ fontFamily: font.display, fontSize: 18, fontWeight: 600, color: color.text }}>{c.name}</div>
            <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.18em", color: tone, marginTop: 5, textTransform: "uppercase" }}>
              {c.role}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close 3D view"
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font.mono,
              fontSize: 16,
              lineHeight: 1,
              color: color.textDim,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${color.line}`,
              borderRadius: radius.sm,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <Suspense
          fallback={
            <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.24em", color: color.textGhost }}>
              LOADING 3D…
            </div>
          }
        >
          <BoardViewer id={c.id} reduced={reduced} height={420} />
        </Suspense>

        <div style={{ padding: "10px 20px", borderTop: `1px solid ${color.line}`, fontFamily: font.mono, fontSize: 9, letterSpacing: "0.16em", color: color.textGhost }}>
          {isTouch ? "DRAG TO SPIN" : "DRAG TO ROTATE"} · SAME MODEL AS THE 3D SLED · TAP OUTSIDE OR ESC TO CLOSE
        </div>
      </div>
    </div>
  );
}

export default function Hardware() {
  const isMobile = useIsMobile();
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();
  const systems = ["Processing / Control", "Sensing", "Communications", "Actuation", "Power"];
  // The component whose 3D render is currently open in front of the viewer.
  const [active, setActive] = useState(null);

  return (
    <>
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker>AVIONICS BAY</Kicker>
          <SectionTitle>Hardware Stack</SectionTitle>
          <Lead>
            Nine off-the-shelf components, one custom sled. Every part below is also
            explorable in 3D on the home page. Scroll to the avionics sequence and pull
            any component out of the rocket.
          </Lead>
          <div style={{ marginTop: 22 }}>
            <Button to="/" size="sm" variant="ghost">Open the 3D experience →</Button>
          </div>
        </Reveal>

        {systems.map((sys) => {
          const items = components.filter((c) => c.system === sys);
          if (!items.length) return null;
          return (
            <div key={sys} style={{ marginTop: 52 }}>
              <Reveal>
                <div
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    letterSpacing: "0.24em",
                    color: color.textFaint,
                    textTransform: "uppercase",
                    paddingBottom: 10,
                    borderBottom: `1px solid ${color.line}`,
                    marginBottom: 18,
                  }}
                >
                  {sys}
                </div>
              </Reveal>
              <RevealGroup
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {items.map((c) => (
                  <RevealItem key={c.id}>
                    <ComponentCard c={c} webgl={webgl} onOpen={setActive} />
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          );
        })}

        {/* Real hardware gallery */}
        <div style={{ marginTop: 64 }}>
          <Reveal>
            <Kicker tone="green">AS BUILT</Kicker>
            <SectionTitle style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>The Real Sled</SectionTitle>
            <Lead>
              The flight avionics sled under assembly. Sensors and GPS forward, ESP32 and
              Raspberry Pi 5 mid-deck, power hardware at the base, all riding inside the
              nose cone.
            </Lead>
          </Reveal>
          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {[
              { src: "/components/IMG_9479.jpg", cap: "COMPONENT SIDE / GPS, ESP32, PI 5" },
              { src: "/components/IMG_9480.jpg", cap: "POWER SIDE / BEC, REGULATION, TERMINALS" },
            ].map((p) => (
              <RevealItem key={p.src}>
                <Panel style={{ overflow: "hidden" }}>
                  <img
                    src={p.src}
                    alt={p.cap.toLowerCase()}
                    loading="lazy"
                    style={{ width: "100%", display: "block", aspectRatio: "3/4", objectFit: "cover" }}
                  />
                  <div style={{ padding: "12px 16px", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.16em", color: color.textFaint }}>
                    {p.cap}
                  </div>
                </Panel>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* Servo / canard control system */}
        <div style={{ marginTop: 64 }}>
          <Reveal>
            <Kicker tone="orange">CONTROL SURFACES</Kicker>
            <SectionTitle style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>Servo & Canard System</SectionTitle>
          </Reveal>
          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {[servoSystem.servo, servoSystem.mount, servoSystem.canard].map((s) => (
              <RevealItem key={s.id}>
                <Panel interactive style={{ padding: "26px 24px", height: "100%" }}>
                  <div style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: color.text }}>{s.name}</div>
                  <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.18em", color: color.orange, margin: "5px 0 12px", textTransform: "uppercase" }}>
                    {s.role}
                  </div>
                  <p style={{ fontFamily: font.body, fontSize: 13, color: color.textDim, lineHeight: 1.7, margin: 0 }}>
                    {s.desc}
                  </p>
                </Panel>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>

    {active && (
      <BoardModal c={active} reduced={reduced} isTouch={isTouch} onClose={() => setActive(null)} />
    )}
    </>
  );
}
