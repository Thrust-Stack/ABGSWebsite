// Lightweight interaction state shared between the R3F scene and the HTML
// overlay (hover labels, the component info panel, and the rotation controls).
//
// Hover/select are plain React state (low-frequency). Everything the render
// loop needs to read every frame — scroll progress and the manual-rotation
// targets — lives in refs so it never triggers a React render.
import { createContext, useContext, useMemo, useState, useCallback, useRef } from "react";
import { components, servoSystem, airframe } from "../data/project";
import { createQuaternionTarget, REST_SLED } from "./interactionMath";

export { REST_SLED } from "./interactionMath";

const InteractionCtx = createContext(null);

export const dataIdOf = (instanceId) => (instanceId ? instanceId.split("#")[0] : null);

// Every inspectable part, keyed by id — components, servo system, airframe.
export const PART_INDEX = (() => {
  const idx = {};
  for (const c of components) idx[c.id] = { kind: "component", ...c };
  for (const key of Object.keys(servoSystem)) {
    const s = servoSystem[key];
    idx[s.id] = { kind: "servo-system", ...s };
  }
  for (const a of airframe) idx[a.id] = { kind: "airframe", tone: "metal", ...a };
  return idx;
})();

export function InteractionProvider({ children }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  // True while the avionics bay is presented for inspection (drives the
  // rotation-control affordances). Set from the scroll handler in Home.
  const [inspectActive, setInspectActive] = useState(false);
  // Mobile only: the user has explicitly armed rotation, which locks page
  // scroll so a one-finger drag rotates instead of scrolling.
  const [rotateArmed, setRotateArmed] = useState(false);

  // Scroll progress — updated every scroll event, read in useFrame.
  const progressRef = useRef(0);

  // Manual-rotation targets (world-space desired orientations). The sled spin
  // group and the selected part's spin group each damp toward their target
  // every frame; the RotationController writes to them from pointer drags.
  const sledRot = useRef(createQuaternionTarget().copy(REST_SLED));
  const partRot = useRef(createQuaternionTarget());
  const partRest = useRef(createQuaternionTarget());
  // True from the moment a press crosses the drag threshold until the next
  // press — the click handler reads it so a rotate drag never selects.
  const dragging = useRef(false);

  const select = useCallback((id) => setSelectedId(id), []);
  const close = useCallback(() => setSelectedId(null), []);
  const hover = useCallback((id) => setHoveredId(id), []);
  const armRotate = useCallback((v) => setRotateArmed(v), []);

  // Reset whichever view is currently being manipulated.
  const resetView = useCallback(() => {
    if (selectedId) partRot.current.copy(partRest.current);
    else sledRot.current.copy(REST_SLED);
  }, [selectedId]);

  const value = useMemo(
    () => ({
      hoveredId,
      selectedId,
      inspectActive,
      setInspectActive,
      rotateArmed,
      armRotate,
      hover,
      select,
      close,
      resetView,
      progressRef,
      sledRot,
      partRot,
      partRest,
      dragging,
    }),
    [hoveredId, selectedId, inspectActive, rotateArmed, armRotate, hover, select, close, resetView]
  );

  return <InteractionCtx.Provider value={value}>{children}</InteractionCtx.Provider>;
}

export function useInteraction() {
  const ctx = useContext(InteractionCtx);
  if (!ctx) throw new Error("useInteraction must be used inside InteractionProvider");
  return ctx;
}
