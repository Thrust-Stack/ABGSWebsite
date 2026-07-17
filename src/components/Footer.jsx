import { Link } from "react-router-dom";
import { color, font, MAXW } from "../design/tokens";
import { TEAM_NAME, LINKS } from "../data/project";

const cols = [
  {
    title: "SITE",
    items: [
      { label: "Mission", to: "/mission" },
      { label: "Telemetry", to: "/telemetry" },
      { label: "Hardware", to: "/hardware" },
    ],
  },
  {
    title: "PROJECT",
    items: [
      { label: "Timeline", to: "/timeline" },
      { label: "Team", to: "/team" },
      { label: "GitHub", href: LINKS.github },
    ],
  },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${color.line}`, marginTop: 40 }}>
      <div
        style={{
          maxWidth: MAXW,
          margin: "0 auto",
          padding: "56px 24px 40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "40px 80px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path d="M9 1 L14 15 L9 12 L4 15 Z" fill="none" stroke={color.orange} strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.24em", color: color.text }}>
              {TEAM_NAME}
            </span>
          </div>
          <p style={{ fontFamily: font.body, fontSize: 13, lineHeight: 1.7, color: color.textFaint, margin: "14px 0 0" }}>
            Open-source active fin control for high-power rocketry.
          </p>
        </div>

        <div style={{ display: "flex", gap: 64, flexWrap: "wrap" }}>
          {cols.map((c) => (
            <div key={c.title}>
              <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.24em", color: color.textFaint, marginBottom: 14 }}>
                {c.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {c.items.map((it) =>
                  it.to ? (
                    <Link key={it.label} to={it.to} style={{ fontFamily: font.body, fontSize: 13, color: color.textDim, textDecoration: "none" }}>
                      {it.label}
                    </Link>
                  ) : (
                    <a key={it.label} href={it.href} target="_blank" rel="noopener noreferrer" style={{ fontFamily: font.body, fontSize: 13, color: color.textDim, textDecoration: "none" }}>
                      {it.label} ↗
                    </a>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${color.line}` }}>
        <div
          style={{
            maxWidth: MAXW,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textGhost }}>
            © {new Date().getFullYear()} {TEAM_NAME}
          </span>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textGhost }}>
            BUILT FOR THE SKY
          </span>
        </div>
      </div>
    </footer>
  );
}
