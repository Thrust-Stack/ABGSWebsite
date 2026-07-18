import { useState, lazy, Suspense } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, Panel, Tag, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { Button } from "../design/primitives";
import { useWebGLSupport, usePrefersReducedMotion, useIsTouch } from "../three/hooks";
import { components, servoSystem } from "../data/project";

// The per-board 3D preview pulls in three/R3F; lazy-load it so it splits into
// its own chunk and only downloads when a visitor opens a card's 3D view.
const BoardViewer = lazy(() => import("../three/BoardViewer"));

const TONE = { blue: color.blue, orange: color.orange, green: color.green, metal: color.metal };

function ComponentCard({ c, webgl, reduced, isTouch }) {
  const tone = TONE[c.tone] || color.metal;
  const [open, setOpen] = useState(false);
  return (
    <Panel interactive style={{ padding: "26px 24px", height: "100%", display: "flex", flexDirection: "column" }}>
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

      {webgl && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{
              marginTop: 16,
              fontFamily: font.mono,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: open ? color.text : color.textDim,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${open ? color.line2 : color.line}`,
              borderRadius: radius.sm,
              padding: "8px 12px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              transition: "all 200ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone, opacity: 0.9 }} />
            {open ? "Hide 3D ▲" : "View in 3D ▾"}
          </button>

          {open && (
            <div
              style={{
                marginTop: 14,
                border: `1px solid ${color.line}`,
                borderRadius: radius.base,
                overflow: "hidden",
                background: "rgba(8,9,11,0.4)",
              }}
            >
              <Suspense
                fallback={
                  <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.24em", color: color.textGhost }}>
                    LOADING 3D…
                  </div>
                }
              >
                <BoardViewer id={c.id} reduced={reduced} height={240} />
              </Suspense>
              <div style={{ padding: "8px 12px", borderTop: `1px solid ${color.line}`, fontFamily: font.mono, fontSize: 9, letterSpacing: "0.16em", color: color.textGhost }}>
                {isTouch ? "DRAG TO SPIN" : "DRAG TO ROTATE"} · SAME MODEL AS THE 3D SLED
              </div>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export default function Hardware() {
  const isMobile = useIsMobile();
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();
  const systems = ["Processing / Control", "Sensing", "Communications", "Actuation", "Power"];

  return (
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
                    <ComponentCard c={c} webgl={webgl} reduced={reduced} isTouch={isTouch} />
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
  );
}
