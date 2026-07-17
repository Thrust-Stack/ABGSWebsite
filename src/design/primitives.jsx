import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { color, font, ease, radius } from "./tokens";

// ---- Hooks ----
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ---- Kicker / section label ----
export function Kicker({ children, tone = "blue", style }) {
  const c = tone === "orange" ? color.orange : tone === "green" ? color.green : color.blue;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        fontFamily: font.mono,
        fontSize: 11,
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        color: c,
        ...style,
      }}
    >
      <span style={{ width: 22, height: 1, background: c, opacity: 0.6 }} />
      {children}
    </div>
  );
}

export function SectionTitle({ children, style }) {
  return (
    <h2
      style={{
        fontFamily: font.display,
        fontSize: "clamp(28px, 4.5vw, 46px)",
        fontWeight: 600,
        letterSpacing: "-0.02em",
        lineHeight: 1.08,
        color: color.text,
        margin: "14px 0 0",
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

export function Lead({ children, style }) {
  return (
    <p
      style={{
        fontFamily: font.body,
        fontSize: "clamp(15px, 1.5vw, 17px)",
        lineHeight: 1.7,
        color: color.textDim,
        maxWidth: 620,
        margin: "18px 0 0",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

// ---- Button ----
export function Button({ children, to, href, onClick, variant = "primary", size = "md", style, ...rest }) {
  const [hover, setHover] = useState(false);
  const pad = size === "sm" ? "9px 18px" : "13px 26px";
  const fs = size === "sm" ? 12 : 13;

  const variants = {
    primary: {
      base: { background: color.blueDim, border: `1px solid rgba(59,130,246,0.5)`, color: color.blueBright },
      hover: { background: "rgba(59,130,246,0.22)", border: `1px solid rgba(59,130,246,0.8)` },
    },
    heat: {
      base: { background: color.orangeDim, border: `1px solid rgba(255,106,44,0.5)`, color: color.orangeBright },
      hover: { background: "rgba(255,106,44,0.22)", border: `1px solid rgba(255,106,44,0.85)` },
    },
    ghost: {
      base: { background: "rgba(255,255,255,0.02)", border: `1px solid ${color.line2}`, color: color.textDim },
      hover: { background: "rgba(255,255,255,0.05)", border: `1px solid ${color.lineStrong}`, color: color.text },
    },
  };
  const v = variants[variant] || variants.primary;
  const composed = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    fontFamily: font.mono,
    fontSize: fs,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    padding: pad,
    borderRadius: radius.sm,
    textDecoration: "none",
    cursor: "pointer",
    transition: `all 200ms ${ease.out}`,
    ...v.base,
    ...(hover ? v.hover : null),
    ...style,
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setHover(true),
    onBlur: () => setHover(false),
  };

  if (to) return <Link to={to} style={composed} {...handlers} {...rest}>{children}</Link>;
  if (href) return <a href={href} style={composed} {...handlers} {...rest}>{children}</a>;
  return <button type="button" onClick={onClick} style={{ ...composed, font: "inherit", fontFamily: font.mono }} {...handlers} {...rest}>{children}</button>;
}

// ---- Panel / Card ----
export function Panel({ children, style, hover, interactive, accentEdge, ...rest }) {
  const [h, setH] = useState(false);
  const active = interactive && h;
  return (
    <div
      onMouseEnter={interactive ? () => setH(true) : undefined}
      onMouseLeave={interactive ? () => setH(false) : undefined}
      style={{
        position: "relative",
        background: active ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.018)",
        border: `1px solid ${active ? color.line2 : color.line}`,
        borderRadius: radius.base,
        transition: `all 260ms ${ease.out}`,
        overflow: "hidden",
        ...(accentEdge ? { borderTop: `1px solid ${color.blue}` } : null),
        ...style,
        ...(active && hover ? hover : null),
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// ---- Status badge ----
export function StatusBadge({ status }) {
  const map = {
    active: { c: color.green, bg: color.greenDim, b: "rgba(18,226,154,0.4)", label: "IN PROGRESS" },
    complete: { c: color.blue, bg: color.blueDim, b: "rgba(59,130,246,0.4)", label: "COMPLETE" },
    upcoming: { c: color.textFaint, bg: "rgba(255,255,255,0.03)", b: color.line2, label: "UPCOMING" },
  };
  const s = map[status] || map.upcoming;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 11px",
        borderRadius: radius.sm,
        fontSize: 10,
        fontFamily: font.mono,
        fontWeight: 600,
        letterSpacing: "0.15em",
        background: s.bg,
        border: `1px solid ${s.b}`,
        color: s.c,
      }}
    >
      {s.label}
    </span>
  );
}

// ---- Tag / chip ----
export function Tag({ children, tone = "metal" }) {
  const c = tone === "blue" ? color.blue : tone === "orange" ? color.orange : tone === "green" ? color.green : color.metal;
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: c,
        border: `1px solid ${color.line2}`,
        background: "rgba(255,255,255,0.02)",
        padding: "3px 8px",
        borderRadius: radius.sm,
      }}
    >
      {children}
    </span>
  );
}

export function Divider({ style }) {
  return <div style={{ height: 1, background: color.line, width: "100%", ...style }} />;
}

// ---- Data readout ----
export function Stat({ label, value, unit, tone }) {
  const c = tone === "blue" ? color.blueBright : tone === "orange" ? color.orangeBright : tone === "green" ? color.green : color.text;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: color.textFaint }}>{label}</span>
      <span style={{ fontFamily: font.mono, fontSize: 22, fontWeight: 600, color: c, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: color.textFaint, marginLeft: 5 }}>{unit}</span>}
      </span>
    </div>
  );
}
