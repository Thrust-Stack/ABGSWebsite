// Detail panel for an inspected part (avionics component, servo system
// part, or airframe section). Desktop: right-side panel. Mobile: bottom
// sheet. Closes on X, backdrop click, or Escape; the 3D part animates back
// to its original position when closed.
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { color, font, radius, z } from "../design/tokens";
import { useIsMobile } from "../design/primitives";
import { useInteraction, PART_INDEX } from "../three/interaction";
import { dataIdOf } from "../three/InteractivePart";

const TONE = {
  blue: color.blue,
  orange: color.orange,
  green: color.green,
  metal: color.metal,
};

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: "0.22em",
          color: color.textFaint,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: font.body, fontSize: 13.5, lineHeight: 1.65, color: color.textDim }}>{children}</div>
    </div>
  );
}

function Pending() {
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 10,
        letterSpacing: "0.14em",
        color: color.orangeBright,
        border: `1px dashed rgba(255,106,44,0.4)`,
        padding: "2px 8px",
        borderRadius: 3,
      }}
    >
      SPEC PENDING
    </span>
  );
}

export default function InfoPanel() {
  const { selectedId, close, resetView, dragging } = useInteraction();
  const isMobile = useIsMobile();
  const closeBtn = useRef(null);
  const data = selectedId ? PART_INDEX[dataIdOf(selectedId)] : null;
  // Only the pull-out parts (components + servo system) can be freely rotated;
  // airframe sections are inspected in place.
  const rotatable = data && data.kind !== "airframe";

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    closeBtn.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, close]);

  const tone = TONE[data?.tone] || color.metal;

  return (
    <AnimatePresence>
      {data && (
        <>
          {/* Backdrop — click (not drag) to close; the model stays visible so
              it can be rotated. `data-rotate-surface` lets a drag that starts
              here rotate the inspected part instead of closing, and the drag
              guard keeps that same drag's closing click from firing. */}
          <motion.div
            key="backdrop"
            data-rotate-surface=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!dragging.current) close();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: z.panel - 1,
              background: "rgba(4,5,7,0.25)",
            }}
          />
          <motion.aside
            key={data.id}
            role="dialog"
            aria-modal="true"
            aria-label={`${data.name} details`}
            initial={isMobile ? { y: "100%" } : { x: "105%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "105%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={{
              position: "fixed",
              zIndex: z.panel,
              background: "rgba(13,15,19,0.96)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              border: `1px solid ${color.line2}`,
              boxShadow: "0 30px 90px -20px rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              ...(isMobile
                ? {
                    left: 0,
                    right: 0,
                    bottom: 0,
                    maxHeight: "62vh",
                    borderRadius: `${radius.lg} ${radius.lg} 0 0`,
                  }
                : {
                    top: 84,
                    right: 24,
                    bottom: 24,
                    width: "min(420px, 38vw)",
                    borderRadius: radius.lg,
                  }),
            }}
          >
            {/* header */}
            <div
              style={{
                padding: isMobile ? "18px 20px 14px" : "24px 26px 18px",
                borderBottom: `1px solid ${color.line}`,
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: font.mono,
                  fontSize: 10,
                  letterSpacing: "0.24em",
                  color: tone,
                  marginBottom: 8,
                }}
              >
                {(data.system || (data.kind === "airframe" ? "AIRFRAME" : "")).toUpperCase()}
              </div>
              <h3
                style={{
                  fontFamily: font.display,
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: color.text,
                  margin: 0,
                  paddingRight: 44,
                }}
              >
                {data.name}
              </h3>
              {data.role && (
                <div style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.12em", color: color.textDim, marginTop: 6 }}>
                  {data.role}
                </div>
              )}
              <button
                ref={closeBtn}
                onClick={close}
                aria-label="Close details"
                style={{
                  position: "absolute",
                  top: isMobile ? 14 : 20,
                  right: isMobile ? 14 : 20,
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${color.line2}`,
                  borderRadius: radius.sm,
                  color: color.textDim,
                  cursor: "pointer",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                  <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>

            {/* rotate hint + reset (pull-out parts only) */}
            {rotatable && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: isMobile ? "10px 20px" : "12px 26px",
                  borderBottom: `1px solid ${color.line}`,
                }}
              >
                <span
                  style={{
                    fontFamily: font.mono,
                    fontSize: 9.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: color.textFaint,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12a8 8 0 1 1 2.3 5.6" stroke={tone} strokeWidth="2" strokeLinecap="round" />
                    <path d="M4 20v-4h4" stroke={tone} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Drag the model to rotate
                </span>
                <button
                  type="button"
                  onClick={resetView}
                  aria-label={`Reset ${data.name} to its default view`}
                  style={{
                    fontFamily: font.mono,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: color.textDim,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${color.line2}`,
                    borderRadius: radius.sm,
                    padding: "8px 12px",
                    minHeight: isMobile ? 40 : 34,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reset view
                </button>
              </div>
            )}

            {/* body */}
            <div style={{ padding: isMobile ? "16px 20px" : "22px 26px", overflowY: "auto", flex: 1 }}>
              <Row label="WHAT IT DOES">{data.desc}</Row>
              {data.usage && <Row label="HOW IT'S USED">{data.usage}</Row>}
              {data.connectsTo && (
                <Row label="CONNECTS TO">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.connectsTo.map((c) => (
                      <span
                        key={c}
                        style={{
                          fontFamily: font.mono,
                          fontSize: 10.5,
                          letterSpacing: "0.06em",
                          color: color.textDim,
                          border: `1px solid ${color.line2}`,
                          background: "rgba(255,255,255,0.02)",
                          padding: "3px 9px",
                          borderRadius: 3,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </Row>
              )}
              {data.specs && (
                <Row label="SPECIFICATIONS">
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      {data.specs.map((s) => (
                        <tr key={s.label} style={{ borderBottom: `1px solid ${color.line}` }}>
                          <td
                            style={{
                              fontFamily: font.mono,
                              fontSize: 10.5,
                              letterSpacing: "0.06em",
                              color: color.textFaint,
                              padding: "7px 10px 7px 0",
                              verticalAlign: "top",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.label}
                          </td>
                          <td style={{ fontFamily: font.body, fontSize: 12.5, color: color.textDim, padding: "7px 0" }}>
                            {s.value ?? <Pending />}
                            {s.source === "datasheet" && (
                              <span
                                title="Manufacturer datasheet value"
                                style={{
                                  fontFamily: font.mono,
                                  fontSize: 8.5,
                                  letterSpacing: "0.1em",
                                  color: color.textGhost,
                                  marginLeft: 8,
                                }}
                              >
                                DATASHEET
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Row>
              )}
              {"whySelected" in data && (
                <Row label="WHY WE CHOSE IT">{data.whySelected ?? <Pending />}</Row>
              )}
              {data.photos?.length > 0 && (
                <Row label="ON THE REAL SLED">
                  {data.photos.map((src) => (
                    <img
                      key={src}
                      src={src}
                      alt={`${data.name} on the flight avionics sled`}
                      loading="lazy"
                      style={{
                        width: "100%",
                        borderRadius: radius.base,
                        border: `1px solid ${color.line2}`,
                        display: "block",
                        marginTop: 4,
                      }}
                    />
                  ))}
                  <div style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.12em", color: color.textGhost, marginTop: 6 }}>
                    FLIGHT HARDWARE / BUILD IN PROGRESS
                  </div>
                </Row>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
