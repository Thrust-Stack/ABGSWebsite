import { useState, useEffect, lazy, Suspense } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, Panel, Tag, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { Button } from "../design/primitives";
import { useWebGLSupport, usePrefersReducedMotion, useIsTouch } from "../three/hooks";
import { components, servoSystem, connections, wiringDiagram } from "../data/project";

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
  // Panel renders a plain div, so a clickable card has to carry its own button
  // semantics: reachable by Tab, operable with Enter/Space, and announced as a
  // button that opens the 3D view rather than as anonymous text.
  const activate = clickable ? () => onOpen(c) : undefined;
  return (
    <Panel
      interactive
      onClick={activate}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `${c.name} — inspect in 3D` : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate();
              }
            }
          : undefined
      }
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

// ---- wiring section -----------------------------------------------------

/**
 * The board drawing, shown full-bleed inside its panel.
 *
 * It is a 3.9:1 schematic, so at page width the pin legends are unreadable.
 * Rather than shrink it to a decorative strip, it scrolls horizontally at a
 * height where the nets are legible, and opens full-screen on click for the
 * whole board at once — the same click-to-enlarge affordance the component
 * cards use, so the interaction is already familiar by the time you reach it.
 */
function WiringDiagram({ isMobile, onOpen }) {
  return (
    <Panel
      interactive
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label="Perfboard wiring drawing — open full screen"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      style={{ overflow: "hidden", cursor: "pointer" }}
    >
      <div style={{ overflowX: "auto", background: color.bg0 }}>
        <img
          src={wiringDiagram.src}
          alt={wiringDiagram.alt}
          loading="lazy"
          style={{
            display: "block",
            height: isMobile ? 210 : 300,
            width: "auto",
            maxWidth: "none",
          }}
        />
      </div>
      <div
        style={{
          padding: "12px 16px",
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: "0.16em",
          color: color.textFaint,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>{wiringDiagram.cap}</span>
        <span aria-hidden style={{ color: color.blue }}>SCROLL SIDEWAYS · CLICK TO ENLARGE →</span>
      </div>
    </Panel>
  );
}

/** The diagram at full screen, pannable. Escape or a click outside closes it. */
function DiagramModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Perfboard wiring drawing, full screen"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(4,5,7,0.94)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 18,
          right: 20,
          width: 38,
          height: 38,
          borderRadius: "50%",
          border: `1px solid ${color.line2}`,
          background: "rgba(255,255,255,0.04)",
          color: color.text,
          fontSize: 17,
          cursor: "pointer",
          lineHeight: 1,
        }}
      >
        ×
      </button>
      {/* Stop propagation so panning the drawing doesn't dismiss it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxHeight: "100%", overflow: "auto", borderRadius: radius.base }}
      >
        <img
          src={wiringDiagram.src}
          alt={wiringDiagram.alt}
          style={{ display: "block", width: "auto", minWidth: "100%", maxWidth: "none" }}
        />
      </div>
    </div>
  );
}

/** One part's pin table(s). */
function ConnectionGroup({ g, isMobile }) {
  const tone = TONE[g.tone] || color.metal;
  return (
    <Panel style={{ padding: isMobile ? "20px 16px" : "24px 26px", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: "50%", background: tone, opacity: 0.9, flexShrink: 0 }}
        />
        <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 600, color: color.text }}>{g.part}</span>
        <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", color: tone, textTransform: "uppercase" }}>
          {g.sub}
        </span>
      </div>

      {g.tables.map((t, ti) => (
        <div key={ti} style={{ overflowX: "auto", marginTop: ti === 0 ? 16 : 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font.mono, fontSize: 11.5 }}>
            <thead>
              <tr>
                {t.cols.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    style={{
                      textAlign: "left",
                      padding: "0 12px 8px 0",
                      fontSize: 9.5,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: color.textGhost,
                      fontWeight: 500,
                      borderBottom: `1px solid ${color.line}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "9px 12px 9px 0",
                        borderBottom: ri === t.rows.length - 1 ? "none" : `1px solid ${color.line}`,
                        color: ci === 0 ? color.text : ci === 1 ? tone : color.textDim,
                        // Pin names never wrap. The middle column holds either a
                        // short pin ("GPIO 16") or a phrase ("All 4 servo red
                        // (VCC) wires"); keeping the phrase on one line forces
                        // the notes column off the panel edge, where Panel's own
                        // overflow:hidden clips it. So nowrap only what is
                        // actually short.
                        whiteSpace:
                          ci === 0 || (ci === 1 && String(cell).length <= 14) ? "nowrap" : "normal",
                        verticalAlign: "top",
                        lineHeight: 1.5,
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {g.note && (
        <p
          style={{
            fontFamily: font.body,
            fontSize: 12.5,
            lineHeight: 1.65,
            color: color.textFaint,
            margin: "14px 0 0",
            paddingTop: 12,
            borderTop: `1px solid ${color.line}`,
          }}
        >
          {g.note}
        </p>
      )}
    </Panel>
  );
}

export default function Hardware() {
  const isMobile = useIsMobile();
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();
  // Grouping order for the cards: what runs the vehicle, what it senses with,
  // where the data goes, how it gets off the vehicle, what carries it all, and
  // what powers it.
  const systems = ["Processing / Control", "Sensing", "Data Storage", "Communications", "Structure", "Power"];
  // The component whose 3D render is currently open in front of the viewer.
  const [active, setActive] = useState(null);
  // The wiring drawing, opened full screen for the whole board at once.
  const [diagramOpen, setDiagramOpen] = useState(false);

  return (
    <>
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker>AVIONICS BAY</Kicker>
          <SectionTitle>Hardware Stack</SectionTitle>
          <Lead>
            Six off-the-shelf modules on a single perfboard, two independent power systems
            behind it, and one custom sled carrying both. Every part below is also explorable
            in 3D on the home page — scroll to the avionics sequence and pull any component
            out of the rocket.
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
              The flight avionics under assembly. Every module is soldered to the component
              side of one perfboard; the point-to-point wiring that connects them is on the
              board's back face. The batteries, step-down converters, and switch housing ride
              behind the sled, and the whole assembly slides into the nose cone.
            </Lead>
          </Reveal>
          {/* Two up, not three: these are tall portrait shots, and at a third of
              the page width the board detail they exist to show is gone. Four
              photos also land as a clean 2x2 rather than a row of three and an
              orphan. */}
          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 420px), 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {/* Ordered as the assembly reads: the two faces of the sled first,
                then the two faces of the board that rides on the front of it. */}
            {[
              {
                src: "/components/sled-front.jpg",
                cap: "FRONT OF SLED / PERFBOARD INSTALLED",
                alt: "The front of the avionics sled inside the nose tube, with both perfboard segments installed and their modules facing out.",
              },
              {
                src: "/components/sled-back.jpg",
                cap: "BACK OF SLED / PACKS, CONVERTERS, SWITCHES",
                alt: "The back of the avionics sled: both LiPo packs taped in place, the step-down converters between them, and the switch terminals at the base.",
              },
              {
                src: "/components/perfboard-front.jpg",
                cap: "COMPONENT SIDE / EVERY MODULE LABELLED",
                alt: "The perfboard held in one hand, component side up, with the gyroscope, microSD reader, Heltec, ESP32, BMP585, and GPS each labelled.",
              },
              {
                src: "/components/perfboard-solder.jpg",
                cap: "SOLDER SIDE / POINT-TO-POINT WIRING",
                alt: "The back of the perfboard, showing the point-to-point solder joints and coloured wire runs that connect the modules.",
              },
            ].map((p) => (
              <RevealItem key={p.src}>
                <Panel style={{ overflow: "hidden" }}>
                  {/* The sled photos are shot in tall portrait (roughly 1:3), so a
                      cropping box cuts most of the board out of frame. Letterbox
                      them instead: `contain` inside a height-capped, centred well
                      keeps the whole board visible at a card-sized height. */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: color.bg0,
                      padding: 10,
                    }}
                  >
                    <img
                      src={p.src}
                      alt={p.alt}
                      loading="lazy"
                      style={{ width: "100%", maxHeight: 620, display: "block", objectFit: "contain" }}
                    />
                  </div>
                  <div style={{ padding: "12px 16px", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.16em", color: color.textFaint }}>
                    {p.cap}
                  </div>
                </Panel>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* Wiring: the board drawing plus the as-built pinout */}
        <div style={{ marginTop: 64 }}>
          <Reveal>
            <Kicker tone="blue">WIRING</Kicker>
            <SectionTitle style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>Pinout &amp; Connections</SectionTitle>
            <Lead>
              Every net on the perfboard, and the pin each one lands on. The sensors share one
              I2C bus, the GPS runs on its own UART, the card reader sits on SPI, and the Heltec
              takes finished frames over a single serial line. This is the as-built wiring, not
              a plan.
            </Lead>
          </Reveal>

          <Reveal delay={0.08}>
            <div style={{ marginTop: 28 }}>
              <WiringDiagram isMobile={isMobile} onOpen={() => setDiagramOpen(true)} />
            </div>
          </Reveal>

          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
              gap: 16,
              marginTop: 20,
              alignItems: "start",
            }}
          >
            {connections.map((g) => (
              <RevealItem key={g.id}>
                <ConnectionGroup g={g} isMobile={isMobile} />
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
    {diagramOpen && <DiagramModal onClose={() => setDiagramOpen(false)} />}
    </>
  );
}
