// Orbital team view — team members orbit the Thrust Stack logo.
//
// Adapted from "Radial Orbital Timeline" by @jatin-yadav05 on 21st.dev. The
// orbital model is theirs: node angle = (index/total)*360 + rotationAngle,
// polar placement at a fixed radius, depth faked via z-index and opacity from
// cos/sin of the angle, auto-rotation that pauses on selection, and
// click-to-center by solving rotationAngle = 270 - targetAngle.
//
// Ported off Tailwind/shadcn/lucide to this project's inline-style system and
// retuned for the aerospace identity: photo avatars instead of icons, the
// team's logo as the gravitational center, blue/orange accents, connection
// lines drawn to a member's collaborators, and reduced-motion + touch support.
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { color, font, radius, ease } from "../design/tokens";
import { useIsMobile } from "../design/primitives";
import { usePrefersReducedMotion } from "../three/hooks";

const AUTO_ROTATE_DEG_PER_TICK = 0.25;
const TICK_MS = 50;

export default function OrbitalTeam({ members }) {
  const isMobile = useIsMobile();
  const reduced = usePrefersReducedMotion();

  const [rotationAngle, setRotationAngle] = useState(0);
  const [activeIndex, setActiveIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const containerRef = useRef(null);
  const orbitRef = useRef(null);

  const radiusPx = isMobile ? 128 : 200;
  const size = isMobile ? 320 : 520;
  // centre mark, sized to leave the orbit clear (source art is 324x460)
  const markH = isMobile ? 104 : 150;
  const markW = Math.round(markH * (324 / 460));
  // Hovering halts the orbit so a member is never a moving click target.
  const autoRotate = activeIndex === null && hoveredIndex === null && !reduced;

  // Auto-rotation. Node transforms carry a CSS transition, so a coarse tick
  // reads as continuous motion without re-rendering every frame.
  useEffect(() => {
    if (!autoRotate) return;
    const t = setInterval(() => {
      setRotationAngle((prev) => (prev + AUTO_ROTATE_DEG_PER_TICK) % 360);
    }, TICK_MS);
    return () => clearInterval(t);
  }, [autoRotate]);

  // Bring a member to the front of the orbit when selected.
  const centerOn = useCallback(
    (index) => {
      const target = (index / members.length) * 360;
      setRotationAngle(270 - target);
    },
    [members.length]
  );

  const select = useCallback(
    (index) => {
      setActiveIndex((prev) => {
        if (prev === index) return null;
        centerOn(index);
        return index;
      });
    },
    [centerOn]
  );

  const close = useCallback(() => setActiveIndex(null), []);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close]);

  const positionOf = useCallback(
    (index) => {
      const angle = ((index / members.length) * 360 + rotationAngle) % 360;
      const rad = (angle * Math.PI) / 180;
      const x = radiusPx * Math.cos(rad);
      const y = radiusPx * Math.sin(rad);
      // depth cues: nodes swinging toward the viewer sit above and brighter
      const zIndex = Math.round(20 + 10 * Math.cos(rad));
      const depth = (1 + Math.sin(rad)) / 2;
      const opacity = Math.max(0.55, Math.min(1, 0.55 + 0.45 * depth));
      const scale = 0.9 + 0.12 * depth;
      return { x, y, zIndex, opacity, scale };
    },
    [members.length, rotationAngle, radiusPx]
  );

  const positions = useMemo(() => members.map((_, i) => positionOf(i)), [members, positionOf]);

  const onBackdrop = (e) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) close();
  };

  return (
    <div
      ref={containerRef}
      onClick={onBackdrop}
      style={{
        position: "relative",
        width: "100%",
        height: size + (isMobile ? 150 : 180),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <div
        ref={orbitRef}
        style={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* orbit rings */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: radiusPx * 2,
            height: radiusPx * 2,
            borderRadius: "50%",
            border: `1px solid ${color.line2}`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: radiusPx * 2 + 34,
            height: radiusPx * 2 + 34,
            borderRadius: "50%",
            border: `1px dashed rgba(255,255,255,0.05)`,
          }}
        />

        {/* connection lines from the selected member to their collaborators */}
        {activeIndex !== null && (
          <svg
            aria-hidden
            width={size}
            height={size}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}
          >
            {(members[activeIndex].relatedIndexes || []).map((ri) => {
              const a = positions[activeIndex];
              const b = positions[ri];
              if (!b) return null;
              return (
                <line
                  key={ri}
                  x1={size / 2 + a.x}
                  y1={size / 2 + a.y}
                  x2={size / 2 + b.x}
                  y2={size / 2 + b.y}
                  stroke={color.blue}
                  strokeOpacity="0.4"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              );
            })}
          </svg>
        )}

        {/* gravitational center — the Thrust Stack mark */}
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              width: markH * 1.45,
              height: markH * 1.45,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 68%)",
            }}
          />
          <img
            src="/logo-mark.png"
            alt="Thrust Stack"
            width={markW}
            height={markH}
            loading="lazy"
            style={{
              // explicit px: a percentage height on a centered grid item has
              // no definite containing block and falls back to intrinsic size
              width: markW,
              height: markH,
              objectFit: "contain",
              position: "relative",
              // The asset's black backdrop is cut to real transparency at build
              // time (scripts/make-logo-mark.mjs), so it needs no blend mode —
              // which matters, because this wrapper's z-index isolates the
              // stacking context and would neutralise `mix-blend-mode: screen`.
            }}
          />
        </div>

        {/* member nodes */}
        {members.map((m, i) => {
          const p = positions[i];
          const isActive = activeIndex === i;
          const isRelated =
            activeIndex !== null && (members[activeIndex].relatedIndexes || []).includes(i);
          const dim = activeIndex !== null && !isActive && !isRelated;
          const isHovered = hoveredIndex === i;
          const avatar = isMobile ? 52 : 62;

          return (
            <div
              key={m.name}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                zIndex: isActive ? 60 : p.zIndex,
                transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`,
                transition: reduced ? "none" : `transform 700ms ${ease.out}, opacity 400ms ${ease.out}`,
                opacity: dim ? 0.28 : p.opacity,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  select(i);
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
                aria-label={`${m.name} — ${m.role}`}
                aria-expanded={isActive}
                style={{
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  width: avatar,
                  height: avatar,
                  padding: 0,
                  borderRadius: "50%",
                  cursor: "pointer",
                  background: color.bg2,
                  border: `1px solid ${
                    isActive || isHovered ? color.orange : isRelated ? color.blue : color.line2
                  }`,
                  boxShadow: isActive
                    ? `0 0 0 4px rgba(255,106,44,0.14), 0 10px 30px -8px rgba(0,0,0,0.8)`
                    : isHovered
                      ? `0 0 0 3px rgba(255,106,44,0.10), 0 10px 30px -8px rgba(0,0,0,0.8)`
                      : "0 8px 24px -10px rgba(0,0,0,0.8)",
                  transform: `scale(${isActive ? 1.16 : isHovered ? 1.1 : p.scale})`,
                  transition: `transform 400ms ${ease.out}, border-color 260ms, box-shadow 260ms`,
                  overflow: "hidden",
                }}
              >
                {m.photo ? (
                  <img
                    src={m.photo}
                    alt=""
                    loading="lazy"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                  />
                ) : (
                  <span style={{ fontFamily: font.mono, fontSize: 15, color: color.blueBright }}>
                    {m.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                )}
              </button>

              {/* name tag under the node */}
              <div
                style={{
                  position: "absolute",
                  top: avatar + 8,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                  fontFamily: font.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: isActive || isHovered ? color.text : color.textFaint,
                  pointerEvents: "none",
                  transition: "color 260ms",
                }}
              >
                {m.name.split(" ")[0]}
              </div>
            </div>
          );
        })}
      </div>

      {/* detail card for the selected member */}
      {activeIndex !== null && (
        <MemberCard
          member={members[activeIndex]}
          members={members}
          onClose={close}
          isMobile={isMobile}
        />
      )}

      {/* idle hint */}
      {activeIndex === null && (
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? 10 : 22,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: font.mono,
            fontSize: 10,
            letterSpacing: "0.22em",
            color: color.textGhost,
            pointerEvents: "none",
          }}
        >
          SELECT A CREW MEMBER
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, members, onClose, isMobile }) {
  const related = (member.relatedIndexes || []).map((i) => members[i]?.name).filter(Boolean);
  return (
    <div
      role="dialog"
      aria-label={`${member.name} details`}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: isMobile ? "94%" : 420,
        zIndex: 80,
        background: "rgba(13,15,19,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${color.line2}`,
        borderTop: `1px solid ${color.orange}`,
        borderRadius: radius.lg,
        padding: isMobile ? "16px 18px" : "20px 22px",
        boxShadow: "0 30px 80px -24px rgba(0,0,0,0.9)",
        animation: `ts-fade-up 320ms ${ease.out} both`,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${color.line2}`,
          borderRadius: radius.sm,
          color: color.textDim,
          cursor: "pointer",
        }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" />
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.orange, textTransform: "uppercase" }}>
        {member.role}
      </div>
      <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 600, color: color.text, margin: "6px 0 10px", paddingRight: 30 }}>
        {member.name}
      </div>
      <p style={{ fontFamily: font.body, fontSize: 13, lineHeight: 1.65, color: color.textDim, margin: 0 }}>
        {member.focus}
      </p>

      {related.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.18em", color: color.textGhost }}>
            WORKS WITH
          </span>
          {related.map((n) => (
            <span
              key={n}
              style={{
                fontFamily: font.mono,
                fontSize: 10,
                color: color.blueBright,
                border: `1px solid rgba(59,130,246,0.3)`,
                borderRadius: 3,
                padding: "2px 7px",
              }}
            >
              {n.split(" ")[0]}
            </span>
          ))}
        </div>
      )}

      {member.linkedin && (
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            marginTop: 16,
            fontFamily: font.mono,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: color.blueBright,
            textDecoration: "none",
            border: `1px solid rgba(59,130,246,0.4)`,
            background: color.blueDim,
            borderRadius: radius.sm,
            padding: "8px 14px",
          }}
        >
          LinkedIn ↗
        </a>
      )}
    </div>
  );
}
