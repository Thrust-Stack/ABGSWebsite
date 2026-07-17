// Page atmosphere — an infinitely drifting technical grid that lights up
// around the cursor, under a restrained aerospace glow.
//
// Adapted from "The Infinite Grid" by @moazamtrade on 21st.dev: the two-layer
// grid (dim base + bright cursor-masked reveal), the modulo pattern offset for
// seamless infinite drift, and the radial mask-image technique are theirs.
// Retuned here for our palette (blue/orange on charcoal, no purple), our
// 72px technical grid, window-level pointer tracking (this layer is fixed and
// pointer-events:none), and reduced-motion / touch fallbacks.
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useMotionTemplate, useAnimationFrame } from "motion/react";
import { color } from "../design/tokens";
import { usePrefersReducedMotion, useIsTouch } from "../three/hooks";

const CELL = 72; // grid cell size, matches the site's technical rhythm
const DRIFT = 0.12; // px/frame — a slow parallax creep, not a moving pattern

function GridPattern({ offsetX, offsetY, id, stroke, strokeWidth = 1 }) {
  return (
    <svg width="100%" height="100%" aria-hidden>
      <defs>
        <motion.pattern id={id} width={CELL} height={CELL} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
          <path d={`M ${CELL} 0 L 0 0 0 ${CELL}`} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export default function Atmosphere() {
  const reduced = usePrefersReducedMotion();
  const isTouch = useIsTouch();

  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const active = useRef(false);

  // Infinite drift: modulo the cell size so the pattern never visibly jumps.
  useAnimationFrame(() => {
    if (reduced) return;
    offsetX.set((offsetX.get() + DRIFT) % CELL);
    offsetY.set((offsetY.get() + DRIFT * 0.6) % CELL);
  });

  // The reveal layer follows the cursor. Tracked on window because this
  // element is fixed and ignores pointer events.
  useEffect(() => {
    if (isTouch || reduced) return;
    const onMove = (e) => {
      active.current = true;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isTouch, reduced, mouseX, mouseY]);

  const maskImage = useMotionTemplate`radial-gradient(320px circle at ${mouseX}px ${mouseY}px, #000 0%, transparent 75%)`;
  const showReveal = !isTouch && !reduced;

  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* base grid — always present, very quiet */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          maskImage: "radial-gradient(ellipse at 50% 30%, #000 25%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, #000 25%, transparent 80%)",
        }}
      >
        <GridPattern id="ts-grid-base" offsetX={offsetX} offsetY={offsetY} stroke="rgba(255,255,255,0.045)" />
      </div>

      {/* reveal grid — brightens the cells around the cursor */}
      {showReveal && (
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            maskImage,
            WebkitMaskImage: maskImage,
          }}
        >
          <GridPattern id="ts-grid-reveal" offsetX={offsetX} offsetY={offsetY} stroke="rgba(99,160,255,0.55)" strokeWidth={1} />
        </motion.div>
      )}

      {/* cool glow from top */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,130,246,0.10), transparent 60%)",
        }}
      />
      {/* restrained ignition warmth, low-right */}
      <div
        style={{
          position: "absolute",
          right: "-15%",
          bottom: "-10%",
          width: "45%",
          height: "45%",
          borderRadius: "50%",
          background: "rgba(255,106,44,0.07)",
          filter: "blur(120px)",
        }}
      />
      {/* horizon fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background: `linear-gradient(to top, ${color.bg0} 0%, rgba(8,9,11,0.4) 40%, transparent 100%)`,
        }}
      />
      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 240px 40px rgba(0,0,0,0.6)" }} />
    </div>
  );
}
