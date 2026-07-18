// Scroll-driven 3D homepage. A sticky full-viewport canvas renders the
// rocket while overlay content sections scroll past, mapped to the same
// phase timeline that drives the camera and the exploded view.
import { useRef, useCallback, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { color, font, ease, radius, MAXW } from "../design/tokens";
import { Kicker, Button, useIsMobile } from "../design/primitives";
import { Reveal } from "../design/motion";
import { TAGLINE, PROJECT_LABEL, MISSION_STATEMENT, components } from "../data/project";
import { InteractionProvider, useInteraction } from "../three/interaction";
import { useWebGLSupport, usePerfTier, usePrefersReducedMotion, useIsTouch } from "../three/hooks";
import { PHASES, SCROLL_VH_DESKTOP, SCROLL_VH_MOBILE } from "../three/config";
import HomeScene from "../three/HomeScene";
import InfoPanel from "../components/InfoPanel";

const TONE = { blue: color.blue, orange: color.orange, green: color.green, metal: color.metal };

// ---------------------------------------------------------------- overlays

function Overlay({ phase, scrollYProgress, children, align = "left", interactive = false, dodge = false }) {
  const { start, end } = PHASES[phase];
  const pad = Math.min(0.035, (end - start) / 3);
  // the first phase must be fully visible at scroll = 0; the last one
  // stays visible through the end of the experience
  const first = start === 0;
  const last = end >= 1;
  const opacity = useTransform(
    scrollYProgress,
    first ? [0, 0.0001, end - pad, end] : last ? [start, start + pad, 1, 1] : [start, start + pad, end - pad, end],
    first ? [1, 1, 1, 0] : last ? [0, 1, 1, 1] : [0, 1, 1, 0]
  );
  const y = useTransform(scrollYProgress, first ? [0, 0.0001] : [start, start + pad], first ? [0, 0] : [24, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: `${start * 100}%`,
        height: `${(end - start) * 100}%`,
        left: 0,
        right: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent:
            align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          padding: "0 min(7vw, 90px)",
        }}
      >
        <motion.div style={{ opacity, y, pointerEvents: interactive ? "auto" : "none", maxWidth: 520 }}>
          {/* step aside while a 3D part is pulled out for inspection */}
          <div
            style={{
              opacity: dodge ? 0 : 1,
              pointerEvents: dodge ? "none" : undefined,
              transition: "opacity 320ms cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {children}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function OverlayText({ kicker, tone, title, children }) {
  return (
    <>
      <Kicker tone={tone}>{kicker}</Kicker>
      <h2
        style={{
          fontFamily: font.display,
          fontSize: "clamp(26px, 3.6vw, 42px)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          color: color.text,
          margin: "14px 0 0",
          textShadow: "0 2px 24px rgba(8,9,11,0.9)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontFamily: font.body,
          fontSize: 15,
          lineHeight: 1.7,
          color: color.textDim,
          margin: "16px 0 0",
          textShadow: "0 1px 16px rgba(8,9,11,0.95)",
        }}
      >
        {children}
      </div>
    </>
  );
}

// Interactive legend shown during the inspect phase — hovering a row
// highlights the 3D part, clicking pulls it out.
function ComponentLegend() {
  const { hoveredId, selectedId, hover, select } = useInteraction();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        marginTop: 18,
        background: "rgba(8,9,11,0.55)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: `1px solid ${color.line}`,
        borderRadius: radius.base,
        padding: 8,
      }}
    >
      {components.map((c) => {
        const active = hoveredId === c.id || selectedId === c.id;
        return (
          <button
            key={c.id}
            onClick={() => select(c.id)}
            onMouseEnter={() => hover(c.id)}
            onMouseLeave={() => hover(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 10px",
              background: active ? "rgba(255,255,255,0.05)" : "transparent",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "left",
              transition: `background 160ms ${ease.out}`,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: TONE[c.tone] || color.metal,
                flexShrink: 0,
                boxShadow: active ? `0 0 8px ${TONE[c.tone] || color.metal}` : "none",
              }}
            />
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 11.5,
                letterSpacing: "0.08em",
                color: active ? color.text : color.textDim,
                flex: 1,
              }}
            >
              {c.name}
            </span>
            <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.16em", color: color.textGhost }}>
              {c.system.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ProgressRail({ scrollYProgress }) {
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0.96, 1], [1, 0]);
  const marks = [
    { at: PHASES.hero.start, label: "T-0" },
    { at: PHASES.canards.start, label: "CTRL" },
    { at: PHASES.explode.start, label: "SEP" },
    { at: PHASES.inspect.start, label: "AVIONICS" },
    { at: PHASES.outro.start, label: "DOCK" },
  ];
  return (
    <motion.div
      aria-hidden
      style={{
        position: "fixed",
        right: 22,
        top: "50%",
        transform: "translateY(-50%)",
        height: "42vh",
        display: "flex",
        gap: 10,
        alignItems: "stretch",
        zIndex: 5,
        opacity,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
        {marks.map((m) => (
          <span key={m.label} style={{ fontFamily: font.mono, fontSize: 8.5, letterSpacing: "0.2em", color: color.textGhost }}>
            {m.label}
          </span>
        ))}
      </div>
      <div style={{ width: 2, background: color.line, borderRadius: 2, position: "relative", overflow: "hidden" }}>
        <motion.div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: fill,
            background: `linear-gradient(to bottom, ${color.blue}, ${color.orange})`,
          }}
        />
      </div>
    </motion.div>
  );
}

// Rotation affordances shown while the avionics bay is presented and no part
// is selected: a subtle "drag to rotate" hint, a reset, and (touch only) an
// explicit rotate toggle that locks page scroll so a drag rotates the bay.
function BayControls() {
  const { inspectActive, selectedId, rotateArmed, armRotate, resetView } = useInteraction();
  const isTouch = useIsTouch();
  const show = inspectActive && !selectedId;

  const pill = {
    fontFamily: font.mono,
    fontSize: 10.5,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: color.textDim,
    background: "rgba(13,15,19,0.82)",
    border: `1px solid ${color.line2}`,
    borderRadius: radius.sm,
    padding: "10px 14px",
    minHeight: 40,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    WebkitBackdropFilter: "blur(8px)",
    backdropFilter: "blur(8px)",
  };

  const hint = isTouch && !rotateArmed ? "Tap rotate to spin the bay" : "Drag to rotate";

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "max(22px, env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 7,
        display: "flex",
        alignItems: "center",
        gap: 10,
        opacity: show ? 1 : 0,
        pointerEvents: show ? "auto" : "none",
        transition: "opacity 300ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <span style={{ ...pill, cursor: "default", color: color.textFaint }} aria-hidden>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 12a8 8 0 1 1 2.3 5.6" stroke={color.blue} strokeWidth="2" strokeLinecap="round" />
          <path d="M4 20v-4h4" stroke={color.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {hint}
      </span>
      {isTouch && (
        <button
          type="button"
          onClick={() => armRotate(!rotateArmed)}
          aria-pressed={rotateArmed}
          aria-label={rotateArmed ? "Finish rotating and resume scrolling" : "Rotate the avionics bay"}
          style={{
            ...pill,
            minHeight: 44,
            color: rotateArmed ? "#08090b" : color.text,
            background: rotateArmed ? color.blue : "rgba(13,15,19,0.82)",
            borderColor: rotateArmed ? color.blue : color.line2,
            fontWeight: 600,
          }}
        >
          {rotateArmed ? "Done" : "Rotate"}
        </button>
      )}
      <button
        type="button"
        onClick={resetView}
        aria-label="Reset the avionics bay to its default view"
        style={{ ...pill, minHeight: isTouch ? 44 : 40, color: color.text }}
      >
        Reset view
      </button>
    </div>
  );
}

// ------------------------------------------------------------ video outro

// Placeholder video ID. Swap YT_VIDEO_ID for the team's build/flight video and
// it drops straight into the embed below.
const YT_VIDEO_ID = "dQw4w9WgXcQ";

// A normal content section that scrolls up after the 3D tour finishes. It adds
// the extra scroll room at the end of the track without touching the 0->1 phase
// timeline that drives the camera and the exploded view. Rises in with the same
// Reveal motion the rest of the site uses.
function VideoSection() {
  const isMobile = useIsMobile();
  return (
    <section
      style={{
        position: "relative",
        zIndex: 2,
        background: color.bg0,
        borderTop: `1px solid ${color.line}`,
        padding: isMobile ? "80px 20px 100px" : "120px 24px 150px",
      }}
    >
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker tone="orange">WATCH</Kicker>
          <h2
            style={{
              fontFamily: font.display,
              fontSize: "clamp(26px, 3.6vw, 42px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: color.text,
              margin: "14px 0 0",
            }}
          >
            See it come together.
          </h2>
          <p
            style={{
              fontFamily: font.body,
              fontSize: 15,
              lineHeight: 1.7,
              color: color.textDim,
              maxWidth: 560,
              margin: "16px 0 0",
            }}
          >
            A walk through the build: the avionics sled, the canard control section, and where
            the project is headed.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            style={{
              position: "relative",
              aspectRatio: "16 / 9",
              marginTop: 36,
              borderRadius: radius.lg,
              overflow: "hidden",
              border: `1px solid ${color.line2}`,
              background: "#000",
              boxShadow: "0 30px 80px -30px rgba(0,0,0,0.9)",
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${YT_VIDEO_ID}`}
              title="Thrust Stack project video"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ experience

function HomeExperience() {
  const containerRef = useRef(null);
  const isMobile = useIsMobile();
  const perfTier = usePerfTier();
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();
  const { progressRef, selectedId, close, setInspectActive, inspectActive, rotateArmed, armRotate } =
    useInteraction();
  const selectAnchor = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    // the avionics bay is presented for inspection across the sled-out/inspect
    // window; this gates the rotation affordances (setState no-ops unless the
    // boolean actually flips)
    setInspectActive(v > PHASES.sledOut.start + 0.06 && v < PHASES.outro.start);
    // close an open panel if the user scrolls meaningfully away (desktop; on
    // mobile the page is scroll-locked while a part is open)
    if (selectedId) {
      if (selectAnchor.current == null) selectAnchor.current = v;
      else if (Math.abs(v - selectAnchor.current) > 0.045) {
        close();
        selectAnchor.current = null;
      }
    } else {
      selectAnchor.current = null;
    }
  });

  // Leaving the inspection window disarms mobile rotation so scrolling resumes.
  useEffect(() => {
    if (!inspectActive && rotateArmed) armRotate(false);
  }, [inspectActive, rotateArmed, armRotate]);

  // Mobile: lock page scroll while rotation is armed, or while a part is open,
  // so a one-finger drag rotates instead of scrolling. Desktop scrolls freely
  // (a mouse drag never scrolls the page anyway).
  useEffect(() => {
    const lock = (isTouch && rotateArmed && inspectActive) || (isMobile && !!selectedId);
    document.documentElement.style.touchAction = lock ? "none" : "";
    return () => {
      document.documentElement.style.touchAction = "";
    };
  }, [isTouch, isMobile, rotateArmed, inspectActive, selectedId]);

  const scrollVh = isMobile ? SCROLL_VH_MOBILE : SCROLL_VH_DESKTOP;

  const skip = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const top = el.offsetTop + el.offsetHeight - window.innerHeight;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  return (
    <>
    <div ref={containerRef} style={{ position: "relative", height: `${scrollVh}vh` }}>
      {/* sticky 3D stage */}
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", zIndex: 1 }}>
        <HomeScene perfTier={perfTier} reduced={reduced} isTouch={isTouch} />
      </div>

      {/* skip affordance */}
      <div style={{ position: "absolute", top: "calc(100vh - 58px)", right: 24, zIndex: 6 }}>
        <button
          onClick={skip}
          style={{
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: color.textFaint,
            background: "rgba(8,9,11,0.5)",
            border: `1px solid ${color.line}`,
            borderRadius: radius.sm,
            padding: "7px 12px",
            cursor: "pointer",
          }}
        >
          SKIP ↓
        </button>
      </div>

      <ProgressRail scrollYProgress={scrollYProgress} />

      {/* ---- overlay content, phase-mapped (must not block canvas input) ---- */}
      <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none" }}>
        {/* HERO */}
        <Overlay phase="hero" scrollYProgress={scrollYProgress} align="left" interactive>
          <div style={{ pointerEvents: "auto" }}>
            <div
              style={{
                fontFamily: font.mono,
                fontSize: 11,
                letterSpacing: "0.3em",
                color: color.textFaint,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              {PROJECT_LABEL}
            </div>
            <h1
              style={{
                fontFamily: font.display,
                fontSize: "clamp(38px, 6vw, 78px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.0,
                color: color.text,
                margin: 0,
                textShadow: "0 2px 30px rgba(8,9,11,0.9)",
              }}
            >
              Active Fin
              <br />
              <span
                style={{
                  background: `linear-gradient(120deg, ${color.blueBright}, ${color.orange})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Control System
              </span>
            </h1>
            <p
              style={{
                fontFamily: font.body,
                fontSize: 16,
                lineHeight: 1.65,
                color: color.textDim,
                maxWidth: 440,
                margin: "22px 0 30px",
                textShadow: "0 1px 16px rgba(8,9,11,0.95)",
              }}
            >
              {TAGLINE}
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Button to="/mission">Our Mission →</Button>
              <Button to="/telemetry" variant="ghost">Live Telemetry</Button>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 56,
                fontFamily: font.mono,
                fontSize: 10,
                letterSpacing: "0.24em",
                color: color.textFaint,
              }}
            >
              <svg width="12" height="18" viewBox="0 0 12 18" aria-hidden>
                <rect x="1" y="1" width="10" height="16" rx="5" fill="none" stroke={color.metalDim} strokeWidth="1" />
                <circle cx="6" cy="6" r="1.6" fill={color.blue} style={{ animation: "ts-pulse 1.8s ease-in-out infinite" }} />
              </svg>
              SCROLL TO EXPLORE
            </div>
          </div>
        </Overlay>

        {/* OVERVIEW / MISSION */}
        <Overlay phase="overview" scrollYProgress={scrollYProgress} align="right" interactive>
          <div style={{ pointerEvents: "auto", maxWidth: 460 }}>
            <OverlayText kicker="THE MISSION" tone="blue" title="What we're building.">
              {MISSION_STATEMENT}
            </OverlayText>
            <div style={{ marginTop: 22 }}>
              <Button to="/mission" size="sm" variant="ghost">Read the mission →</Button>
            </div>
          </div>
        </Overlay>

        {/* CANARDS */}
        <Overlay phase="canards" scrollYProgress={scrollYProgress} dodge={!!selectedId} align="left" interactive>
          <div style={{ pointerEvents: "auto", maxWidth: 440 }}>
            <OverlayText kicker="CANARD CONTROL" tone="orange" title="Four canards, four servos.">
              Four canards near the nose deflect in flight to hold the rocket on its planned
              path. Each one runs off its own BMS-127WV+ servo, sitting in a mount the team
              designed to fit inside the forward fin can.
            </OverlayText>
            <div
              style={{
                marginTop: 18,
                fontFamily: font.mono,
                fontSize: 10.5,
                letterSpacing: "0.16em",
                color: color.orangeBright,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.orange, animation: "ts-pulse 1.6s infinite" }} />
              {`${"ontouchstart" in window ? "TAP" : "HOVER"} THE MOUNTS + CANARDS TO INSPECT`}
            </div>
          </div>
        </Overlay>

        {/* EXPLODE */}
        <Overlay phase="explode" scrollYProgress={scrollYProgress} dodge={!!selectedId} align="left">
          <OverlayText kicker="AIRFRAME" tone="blue" title="Five sections, one stack.">
            Nose cone, forward airframe, servo fin can, aft airframe, and static fin can,
            straight from the team's CAD assembly. The avionics ride in the nose.
          </OverlayText>
        </Overlay>

        {/* SLED OUT */}
        <Overlay phase="sledOut" scrollYProgress={scrollYProgress} dodge={!!selectedId} align="left">
          <OverlayText kicker="AVIONICS BAY" tone="green" title="The sled comes out.">
            Every sensor, radio, and computer rides on one deck inside the nose cone. On this
            vehicle the nose <em style={{ fontStyle: "normal", color: "inherit" }}>is</em> the
            avionics bay. Boards run in a single column down the taper, power hardware on the
            back face, and the whole bay slides out the base in one piece.
          </OverlayText>
        </Overlay>

        {/* INSPECT */}
        <Overlay phase="inspect" scrollYProgress={scrollYProgress} dodge={!!selectedId} align="left" interactive>
          <div style={{ pointerEvents: "auto", maxWidth: 400 }}>
            <OverlayText kicker="FLIGHT HARDWARE" tone="green" title="Nine boards on one sled.">
              Pick any component, on the sled or in the list, to pull it out and see what it
              does and how it wires in.
            </OverlayText>
            {!isMobile && <ComponentLegend />}
          </div>
        </Overlay>

        {/* OUTRO */}
        <Overlay phase="outro" scrollYProgress={scrollYProgress} align="left" interactive>
          <div style={{ pointerEvents: "auto", maxWidth: 460 }}>
            <OverlayText kicker="GO / NO-GO" tone="blue" title="See the rest of the project.">
              Hardware breakdowns, a live telemetry simulation, the build timeline, and the
              four of us behind the vehicle.
            </OverlayText>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
              <Button to="/hardware">Hardware</Button>
              <Button to="/telemetry" variant="ghost">Telemetry</Button>
              <Button to="/timeline" variant="ghost">Timeline</Button>
              <Button to="/team" variant="ghost">Team</Button>
            </div>
          </div>
        </Overlay>
      </div>

      <BayControls />
      <InfoPanel />
    </div>

    {/* Video section: extra scroll room at the end, a plain content block that
        the 3D scene doesn't drive. */}
    <VideoSection />
    </>
  );
}

// ------------------------------------------------------- static fallback

function StaticHome() {
  return (
    <section
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "120px min(7vw, 90px) 80px",
      }}
    >
      <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.3em", color: color.textFaint, textTransform: "uppercase", marginBottom: 20 }}>
        {PROJECT_LABEL}
      </div>
      <h1
        style={{
          fontFamily: font.display,
          fontSize: "clamp(38px, 6vw, 78px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.0,
          color: color.text,
          margin: 0,
        }}
      >
        Active Fin
        <br />
        <span
          style={{
            background: `linear-gradient(120deg, ${color.blueBright}, ${color.orange})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Control System
        </span>
      </h1>
      <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.7, color: color.textDim, maxWidth: 520, margin: "24px 0 32px" }}>
        {TAGLINE} {MISSION_STATEMENT}
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Button to="/mission">Our Mission →</Button>
        <Button to="/hardware" variant="ghost">Hardware</Button>
        <Button to="/telemetry" variant="ghost">Telemetry</Button>
      </div>
      <p style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", color: color.textGhost, marginTop: 48 }}>
        3D EXPERIENCE UNAVAILABLE / WEBGL NOT SUPPORTED ON THIS DEVICE
      </p>
    </section>
  );
}

export default function Home() {
  const webgl = useWebGLSupport();
  if (!webgl) return <StaticHome />;
  return (
    <InteractionProvider>
      <HomeExperience />
    </InteractionProvider>
  );
}
