// Manual rotation for the avionics bay and for a selected component.
//
// One controller drives both, choosing its target at the moment a drag starts:
//   - a component is selected  -> rotate only that component
//   - otherwise, bay presented -> rotate the whole bay
//   - neither                  -> ignore (let the click/scroll through)
// so the two modes can never fight each other.
//
// Rotation is a virtual-trackball: the pointer is projected onto a sphere and
// successive positions define an axis + angle. Because the axis comes from the
// sphere (not fixed screen axes), dragging tangentially near the edge produces
// roll — full X/Y/Z control, not just yaw/pitch. The axis is taken into world
// space through the camera, and premultiplied onto a world-space target
// quaternion that the spin groups follow with damping, so the model stays put
// and never flips or gimbal-locks.
//
// A small movement threshold separates a click (select/close) from a drag
// (rotate): the shared `dragging` ref stays true from threshold-crossing until
// the next press, and the parts' click handler bails while it's set.
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useInteraction, PART_INDEX } from "./interaction";
import { dataIdOf } from "./InteractivePart";
import { PHASES } from "./config";

const DRAG_THRESH = 5; // px of movement before a press becomes a rotate
const SENS = 2.3; // trackball angular gain
const FLICK_DECAY = 0.86; // inertia decay per 1/60 s
const _IDENT = new THREE.Quaternion();

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _dq = new THREE.Quaternion();

// Project a normalized [-1,1] pointer position onto the virtual trackball
// sphere (Shoemake): inside the unit circle use the sphere, outside fall onto
// the rim so edge drags read as roll.
function arcball(nx, ny, out) {
  const r2 = nx * nx + ny * ny;
  out.set(nx, ny, r2 < 1 ? Math.sqrt(1 - r2) : 0);
  if (r2 >= 1) out.normalize();
  return out;
}

export default function RotationController({ isTouch, reduced }) {
  const { camera, gl } = useThree();
  const {
    selectedId,
    inspectActive,
    rotateArmed,
    hoveredId,
    progressRef,
    sledRot,
    partRot,
    dragging,
  } = useInteraction();

  const drag = useRef({
    down: false,
    target: null,
    sx: 0,
    sy: 0,
    lastX: 0,
    lastY: 0,
    rect: null,
    vel: new THREE.Quaternion(),
    velActive: false,
  });

  // Latest reactive values for the stable DOM listeners.
  const live = useRef({});
  live.current = { selectedId, inspectActive, rotateArmed, isTouch };

  useEffect(() => {
    const el = gl.domElement;
    const s = drag.current;

    const partRotatable = (id) => id && PART_INDEX[dataIdOf(id)]?.kind !== "airframe";

    const pickTarget = () => {
      const { selectedId, inspectActive, rotateArmed, isTouch } = live.current;
      if (selectedId) return partRotatable(selectedId) ? partRot.current : null;
      const presented =
        inspectActive &&
        progressRef.current > PHASES.sledOut.start + 0.06 &&
        progressRef.current < PHASES.outro.start;
      if (!presented) return null;
      if (isTouch && !rotateArmed) return null; // mobile requires the explicit toggle
      return sledRot.current;
    };

    const toNdc = (e) => [
      ((e.clientX - s.rect.left) / s.rect.width) * 2 - 1,
      -(((e.clientY - s.rect.top) / s.rect.height) * 2 - 1),
    ];

    // A press starts a rotation only when it lands on a rotate surface: the
    // canvas itself, or the info-panel backdrop (which sits above the canvas
    // while a part is inspected). Presses on the panel, the list, or any
    // control fall through so those UIs work normally.
    const onRotateSurface = (t) =>
      t === el || (t && t.closest && t.closest("[data-rotate-surface]") != null);

    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!onRotateSurface(e.target)) {
        s.down = false;
        return;
      }
      dragging.current = false; // new press: clear the drag guard
      const target = pickTarget();
      if (!target) {
        s.down = false;
        return;
      }
      s.down = true;
      s.target = target;
      s.velActive = false;
      s.rect = el.getBoundingClientRect();
      const [x, y] = toNdc(e);
      s.sx = e.clientX;
      s.sy = e.clientY;
      s.lastX = x;
      s.lastY = y;
    };

    const onMove = (e) => {
      if (!s.down) return;
      if (!dragging.current) {
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < DRAG_THRESH) return;
        dragging.current = true;
        document.body.style.cursor = "grabbing";
      }
      const [x, y] = toNdc(e);
      arcball(s.lastX, s.lastY, _p0);
      arcball(x, y, _p1);
      _axis.crossVectors(_p0, _p1);
      if (_axis.lengthSq() > 1e-9) {
        const ang = Math.acos(Math.min(1, Math.max(-1, _p0.dot(_p1)))) * SENS;
        _axis.normalize().applyQuaternion(camera.quaternion); // view -> world
        _dq.setFromAxisAngle(_axis, ang);
        s.target.premultiply(_dq);
        s.vel.copy(_dq);
        s.velActive = !reduced;
      }
      s.lastX = x;
      s.lastY = y;
      if (e.cancelable) e.preventDefault(); // suppress text-selection / scroll during a drag
    };

    const onUp = () => {
      if (!s.down) return;
      s.down = false;
      document.body.style.cursor = "";
      // dragging.current stays true until the next press so the click that
      // fires right after this pointerup is correctly ignored.
    };

    // pointerdown on window (not just the canvas) so a drag that starts on the
    // panel backdrop still rotates the inspected part.
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, camera, reduced, dragging, partRot, sledRot, progressRef]);

  // touch-action: only suppress the browser's own touch scrolling while a
  // rotate gesture is actually possible, so the page still scrolls normally
  // everywhere else on mobile.
  useEffect(() => {
    const el = gl.domElement;
    const canRotate =
      (selectedId && PART_INDEX[dataIdOf(selectedId)]?.kind !== "airframe") ||
      (isTouch && rotateArmed && inspectActive);
    el.style.touchAction = canRotate ? "none" : "";
    return () => {
      el.style.touchAction = "";
    };
  }, [gl, selectedId, isTouch, rotateArmed, inspectActive]);

  // Cursor affordance (desktop): grab when a rotation is available, pointer
  // when a clickable part is under the cursor.
  useEffect(() => {
    if (isTouch || dragging.current) return;
    const el = gl.domElement;
    const canPart = selectedId && PART_INDEX[dataIdOf(selectedId)]?.kind !== "airframe";
    const canSled = !selectedId && inspectActive;
    el.style.cursor = hoveredId ? "pointer" : canPart || canSled ? "grab" : "";
  }, [gl, hoveredId, selectedId, inspectActive, isTouch, dragging]);

  // Inertia: keep applying the decaying flick after release.
  useFrame((_, dt) => {
    const s = drag.current;
    if (s.down || !s.velActive || reduced || !s.target) return;
    s.vel.slerp(_IDENT, 1 - Math.pow(FLICK_DECAY, dt * 60));
    const ang = 2 * Math.acos(Math.min(1, Math.abs(s.vel.w)));
    if (ang < 0.0008) {
      s.velActive = false;
      return;
    }
    s.target.premultiply(s.vel);
  });

  return null;
}
