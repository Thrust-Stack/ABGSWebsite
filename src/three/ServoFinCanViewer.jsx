// The servo fin can, rendered on its own for the Telemetry page and driven live
// by the telemetry simulation.
//
// This is the SAME geometry and materials as the landing-page rocket: it pulls
// just the servoFinCan section and its four canards out of the real
// rocket-assembly.glb via the shared useAssembly() hook, instead of rebuilding
// the can/canards from procedural primitives. The can shell is rendered in its
// real printed material at low opacity (the same x-ray look the home scene uses
// during the canard demo) so the mechanism reads inside it; the canards use the
// real machined material and sit on the same radial deflection pivots. Only the
// black BMS-127WV+ actuator (a small internal detail) stays as boxes, via the
// shared ServoMountAssembly. Deflection is tied to the simulated gyro rates, so
// the surfaces visibly correct as the numbers move.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CANARD_Y } from "./config";
import { useAssembly, MATS, ServoMountAssembly } from "./assembly";
import { MiniCanvas, AutoFit } from "./MiniViewer";

const DEFL_GAIN = 0.075; // rad of canard per °/s of gyro
const DEFL_MAX = 0.34; // ~19° hard stop
const CAN_OPACITY = 0.22; // x-ray shell, matching the home scene's canard-phase fade

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function FinCan({ gyroRef, reduced }) {
  const { sections, canardPivots, mounts } = useAssembly();
  const pivotRefs = useRef([]);
  const hornRefs = [useRef(), useRef(), useRef(), useRef()];

  // Real can shell in its printed material, dropped to a translucent x-ray so
  // the servos + canard roots read inside — the same intent as the home scene's
  // servo-can fade during the canard phase, just held constant here.
  const shellMats = useMemo(
    () =>
      sections.servoFinCan.map(() => {
        const m = MATS.servoFinCan();
        m.transparent = true;
        m.opacity = CAN_OPACITY;
        return m;
      }),
    [sections.servoFinCan]
  );
  const canardMats = useMemo(() => canardPivots.map(() => MATS.canard()), [canardPivots]);

  useFrame((_, dt) => {
    const { x: gx, y: gy } = gyroRef.current;
    // pitch pair (fore/aft canards) follow gyroY, yaw pair follow gyroX
    const targets = reduced
      ? [0, 0, 0, 0]
      : [
          clamp(gy * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
          clamp(gx * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
          clamp(-gy * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
          clamp(-gx * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
        ];

    pivotRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, targets[i] ?? 0, 8, dt);
      // horn tracks the blade about the servo's own spline axis, mechanically synced
      if (hornRefs[i]?.current) hornRefs[i].current.rotation.z = -pivot.rotation.x * 1.4;
    });
  });

  return (
    <group>
      {/* real printed can shell (translucent x-ray) */}
      {sections.servoFinCan.map((n, i) => (
        <mesh key={i} geometry={n.geo} material={shellMats[i]} castShadow receiveShadow />
      ))}

      {/* interior fill so the mounts read through the shell */}
      <pointLight position={[0.3, CANARD_Y - 0.02, 0.6]} intensity={0.7} distance={2.6} color="#dfe6f0" />

      {/* real canards on radial deflection pivots — identical transform stack to
          the home model (position=root, q; inner pivot carries rotation.x; the
          geometry sits under qInv/holderPos back in its own frame) */}
      {canardPivots.map((cp, i) => (
        <group key={i} position={cp.root} quaternion={cp.q}>
          <group ref={(el) => (pivotRefs.current[i] = el)}>
            <group quaternion={cp.qInv} position={cp.holderPos}>
              <mesh geometry={cp.geo} material={canardMats[i]} castShadow receiveShadow />
            </group>
          </group>
        </group>
      ))}

      {/* the four servo mounts (black actuator stays as boxes — small detail) */}
      {mounts.map((m, i) => (
        <group key={i} position={m.pos} quaternion={m.q}>
          <ServoMountAssembly hornRef={hornRefs[i]} />
        </group>
      ))}
    </group>
  );
}

export default function ServoFinCanViewer({ gyroX = 0, gyroY = 0, reduced = false, height = 300 }) {
  // Live gyro values arrive as props on every telemetry tick; stash them in a
  // ref so the render loop reads the latest without re-registering useFrame.
  const gyroRef = useRef({ x: 0, y: 0 });
  gyroRef.current.x = gyroX;
  gyroRef.current.y = gyroY;

  return (
    <MiniCanvas height={height} cameraPosition={[1.9, 1.35, 2.6]} fov={42} groundY={-1.2}>
      {/* The servoFinCan slice sits offset from the origin in the full assembly;
          AutoFit centers + normalizes it, and its idle spin gives the turntable. */}
      <AutoFit size={2.4} spin={!reduced} spinSpeed={0.28}>
        <FinCan gyroRef={gyroRef} reduced={reduced} />
      </AutoFit>
    </MiniCanvas>
  );
}
