// Generic interactive 3D part.
//
// Hover:  offsets slightly outward, emissive glow, name label, others in the
//         same group dim. Click: pulls out toward a viewing anchor in front
//         of the camera, enlarges, slow turntable; the HTML info panel opens
//         alongside. Close returns it exactly to its original transform.
//
// Instance ids may be "dataId#n" for repeated parts (e.g. servo-mount#2);
// the part data is resolved from the id before the "#".
import { useRef, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useInteraction, PART_INDEX } from "./interaction";
import { C3, stageFadeAt } from "./config";
import { color as uiColor, font } from "../design/tokens";

export const dataIdOf = (instanceId) => (instanceId ? instanceId.split("#")[0] : null);

const TONE3 = {
  blue: C3.blue,
  orange: C3.orange,
  green: C3.green,
  metal: "#aab2bf",
};

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _pq = new THREE.Quaternion();
const _localQ = new THREE.Quaternion();
const _IDENTP = new THREE.Quaternion();

// Resting presentation orientation for a pulled-out part: a gentle three-
// quarter view so it reads dimensionally the moment it appears. This is a
// world-space orientation, so it faces the camera the same way regardless of
// how the part was mounted (front or back face of the deck) or whether the bay
// itself has been rotated. Manual rotation composes on top; "Reset view"
// returns here.
const REST_PART = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0.5, 0));

export default function InteractivePart({
  id,
  children,
  hoverOffset = [0, 0, 0.06],
  inspectDistance = 3.0,
  inspectScale = 2.2,
  inspectShift = [-0.5, 0.05], // [right, up] in camera space (desktop)
  mode = "pullout", // "pullout" | "highlight"
  range = [0, 1], // scroll-progress window where interaction is enabled
  isTouch = false,
  reduced = false,
  labelDistanceFactor = 6,
}) {
  const dataId = dataIdOf(id);
  const data = PART_INDEX[dataId];
  const group = useRef();
  const spinRef = useRef();
  const materials = useRef([]);
  const base = useRef({ pos: new THREE.Vector3(), scale: new THREE.Vector3(1, 1, 1) });
  const { hoveredId, selectedId, hover, select, close, progressRef, partRot, partRest, dragging } =
    useInteraction();

  const tone = TONE3[data?.tone] || TONE3.metal;
  const hovered = hoveredId === id;
  const selected = selectedId === id;
  const activeId = selectedId || hoveredId;
  // dim when a sibling of the same kind is active
  const dimmed =
    activeId && activeId !== id && PART_INDEX[dataIdOf(activeId)]?.kind === data?.kind;

  // Collect child materials once; make them fade/glow-capable. Meshes
  // flagged userData.noPartFade (e.g. shells whose opacity is driven by the
  // scroll timeline) are left alone.
  useEffect(() => {
    const mats = [];
    group.current.traverse((o) => {
      if (!o.isMesh || !o.material || o.userData.noPartFade) return;
      // Multi-material meshes (the PCBs carry one material for the faces and
      // one for the routed FR4 edge) arrive as an array — assigning to
      // o.material.opacity would set a property on the array and fade nothing.
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of list) {
        mat.transparent = true;
        if (mat.emissive) mat.emissive.set(tone);
        mats.push({ mat, baseOpacity: mat.opacity ?? 1 });
      }
    });
    materials.current = mats;
    base.current.pos.copy(group.current.position);
    base.current.scale.copy(group.current.scale);
  }, [tone]);

  const inRange = useCallback(() => {
    const p = progressRef.current;
    return p >= range[0] && p <= range[1];
  }, [progressRef, range]);

  const onOver = useCallback(
    (e) => {
      if (!inRange()) return;
      e.stopPropagation();
      hover(id);
    },
    [hover, id, inRange]
  );
  const onOut = useCallback(
    (e) => {
      e.stopPropagation();
      hover(null);
    },
    [hover]
  );
  const onClick = useCallback(
    (e) => {
      if (!inRange()) return;
      // A rotate drag ends in a pointerup that also fires this click; the guard
      // ref (set once movement crosses the threshold) keeps a drag from
      // selecting or closing.
      if (dragging.current) return;
      e.stopPropagation();
      if (selected) close();
      else select(id);
    },
    [select, close, selected, id, inRange, dragging]
  );

  // Arm the resting orientation when this part becomes selected, so it presents
  // at the three-quarter view and "Reset view" has a target to return to.
  useEffect(() => {
    if (selected && mode === "pullout") {
      partRot.current.copy(REST_PART);
      partRest.current.copy(REST_PART);
    }
  }, [selected, mode, partRot, partRest]);

  const { camera } = useThree();

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const lambda = reduced ? 30 : 7;

    if (selected && mode === "pullout") {
      // viewing anchor in front of the camera, shifted so the info panel
      // doesn't cover the part
      camera.getWorldDirection(_dir);
      _right.crossVectors(_dir, camera.up).normalize();
      const shiftR = isTouch ? 0 : inspectShift[0];
      const shiftU = isTouch ? 0.55 : inspectShift[1];
      _v1.copy(camera.position)
        .addScaledVector(_dir, inspectDistance)
        .addScaledVector(_right, shiftR)
        .addScaledVector(camera.up, shiftU);
      g.parent.worldToLocal(_v1);
      g.position.x = THREE.MathUtils.damp(g.position.x, _v1.x, lambda, dt);
      g.position.y = THREE.MathUtils.damp(g.position.y, _v1.y, lambda, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, _v1.z, lambda, dt);
      const s = base.current.scale.x * inspectScale;
      g.scale.x = THREE.MathUtils.damp(g.scale.x, s, lambda, dt);
      g.scale.y = THREE.MathUtils.damp(g.scale.y, s, lambda, dt);
      g.scale.z = THREE.MathUtils.damp(g.scale.z, s, lambda, dt);
    } else {
      // return to base (+ small hover offset)
      const hx = hovered && !selected ? hoverOffset[0] : 0;
      const hy = hovered && !selected ? hoverOffset[1] : 0;
      const hz = hovered && !selected ? hoverOffset[2] : 0;
      _v2.set(base.current.pos.x + hx, base.current.pos.y + hy, base.current.pos.z + hz);
      g.position.x = THREE.MathUtils.damp(g.position.x, _v2.x, lambda, dt);
      g.position.y = THREE.MathUtils.damp(g.position.y, _v2.y, lambda, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, _v2.z, lambda, dt);
      g.scale.x = THREE.MathUtils.damp(g.scale.x, base.current.scale.x, lambda, dt);
      g.scale.y = THREE.MathUtils.damp(g.scale.y, base.current.scale.y, lambda, dt);
      g.scale.z = THREE.MathUtils.damp(g.scale.z, base.current.scale.z, lambda, dt);
    }

    // Manual spin of the selected part. The target is a WORLD-space orientation
    // (rest = three-quarter view, plus the user's drag), converted into this
    // group's local frame so the part faces the camera regardless of how it was
    // mounted or whether the bay was rotated first. Unselected parts hold the
    // identity so they sit and rotate naturally with the bay.
    if (spinRef.current) {
      let target;
      if (selected && mode === "pullout") {
        spinRef.current.parent.getWorldQuaternion(_pq);
        _localQ.copy(_pq).invert().multiply(partRot.current);
        target = _localQ;
      } else {
        target = _IDENTP;
      }
      spinRef.current.quaternion.slerp(target, reduced ? 1 : 1 - Math.exp(-12 * dt));
    }

    // materials: glow + dim. Airframe and servo hardware also fade while
    // the sled has the stage (inspect phase), so the exploded stack behind
    // it doesn't compete for attention.
    const glowTarget = selected ? 0.04 : hovered ? 0.3 : 0;
    let opacityTarget = dimmed ? 0.3 : 1;
    if (data?.kind === "airframe" || data?.kind === "servo-system") {
      opacityTarget *= stageFadeAt(progressRef.current);
    }
    for (const { mat, baseOpacity } of materials.current) {
      if (mat.emissiveIntensity !== undefined)
        mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, glowTarget, lambda, dt);
      mat.opacity = THREE.MathUtils.damp(mat.opacity, baseOpacity * opacityTarget, lambda, dt);
    }
  });

  const label = useMemo(() => data?.shortName || data?.name || "", [data]);

  return (
    <group
      ref={group}
      onPointerOver={onOver}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <group ref={spinRef}>{children}</group>
      {hovered && !selected && (
        <Html
          position={[0, 0.02, 0.12]}
          center
          distanceFactor={labelDistanceFactor}
          style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
          zIndexRange={[90, 0]}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              transform: "translateY(-140%)",
            }}
          >
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: uiColor.text,
                background: "rgba(8,9,11,0.88)",
                border: `1px solid ${tone}`,
                borderRadius: 3,
                padding: "4px 9px",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: 8,
                letterSpacing: "0.2em",
                color: uiColor.textFaint,
                background: "rgba(8,9,11,0.7)",
                padding: "2px 6px",
                borderRadius: 3,
              }}
            >
              {isTouch ? "TAP" : "CLICK"} TO INSPECT
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}
