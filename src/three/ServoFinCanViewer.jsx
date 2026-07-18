// The servo fin can, rendered on its own for the Telemetry page and driven live
// by the telemetry simulation. Four canards on radial shafts, each with a
// BlueBird BMS-127WV+ (the real Servo component from parts/boards.jsx) inside a
// semi-transparent printed can so the mechanism reads. Deflection is tied to the
// simulated gyro rates, so the surfaces visibly correct as the numbers move.
//
// This is a lightweight procedural stand-in for the servoFinCan section of the
// full model — it deliberately does NOT load rocket-assembly.glb.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { C3 } from "./config";
import { Servo } from "./parts/boards";
import { MiniCanvas } from "./MiniViewer";

const RC = 0.62; // can radius
const HC = 1.15; // can height
const SHAFT_Y = 0.14; // canard shaft height on the can
const SERVO_SCALE = 0.012;
const DEFL_GAIN = 0.075; // rad of canard per °/s of gyro
const DEFL_MAX = 0.34; // ~19° hard stop

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// One tapered metal canard blade, built in a frame where +X is span (radial),
// +Y is chord (along the airframe axis), +Z is thickness. Deflecting = rotating
// the blade about the radial +X shaft.
function useCanardGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.17);
    shape.lineTo(0.5, -0.1);
    shape.lineTo(0.5, 0.1);
    shape.lineTo(0, 0.17);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
    geo.translate(0, 0, -0.025); // center the thickness
    geo.computeVertexNormals();
    return geo;
  }, []);
}

// Servo + bracket + output shaft, oriented so the spline points radially out
// toward the canard shaft — the same arrangement as the home model's mount.
function ServoUnit({ hornRef }) {
  return (
    <group position={[0.12, SHAFT_Y, 0]}>
      {/* machined bracket clamping the servo body */}
      <mesh castShadow position={[0.02, 0, 0]}>
        <boxGeometry args={[0.26, 0.34, 0.2]} />
        <meshStandardMaterial color="#4c525d" metalness={0.9} roughness={0.36} />
      </mesh>
      {/* the real servo, spline turned onto the radial (+X) shaft axis */}
      <group rotation={[0, Math.PI / 2, 0]} scale={SERVO_SCALE}>
        <Servo hornRef={hornRef} />
      </group>
      {/* output shaft to the canard root + bearing collar */}
      <mesh position={[0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.34, 16]} />
        <meshStandardMaterial color="#8d949e" metalness={1} roughness={0.28} />
      </mesh>
      <mesh position={[0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 0.06, 20]} />
        <meshStandardMaterial color="#6d7480" metalness={0.95} roughness={0.32} />
      </mesh>
    </group>
  );
}

function FinCan({ gyroRef, reduced }) {
  const spinRef = useRef();
  const canardGeo = useCanardGeometry();
  const pivotRefs = useRef([]);
  const hornRefs = [useRef(), useRef(), useRef(), useRef()];

  // canard angular positions around the can
  const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  useFrame((_, dt) => {
    // idle turntable so the can reads dimensional
    if (spinRef.current && !reduced) spinRef.current.rotation.y += dt * 0.28;

    const { x: gx, y: gy } = gyroRef.current;
    // pitch pair (fore/aft canards) follow gyroY, yaw pair follow gyroX
    const targets = reduced ? [0, 0, 0, 0] : [
      clamp(gy * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
      clamp(gx * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
      clamp(-gy * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
      clamp(-gx * DEFL_GAIN, -DEFL_MAX, DEFL_MAX),
    ];

    pivotRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, targets[i], 8, dt);
      // horn tracks the blade about the servo's own spline axis, mechanically synced
      if (hornRefs[i].current) hornRefs[i].current.rotation.z = -pivot.rotation.x * 1.4;
    });
  });

  return (
    <group ref={spinRef}>
      {/* semi-transparent printed can shell so the servos read inside it */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[RC, RC, HC, 56, 1, true]} />
        <meshPhysicalMaterial
          color={C3.hullDark}
          metalness={0}
          roughness={0.62}
          clearcoat={0.25}
          clearcoatRoughness={0.55}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* structural rings top and bottom */}
      {[HC / 2 - 0.03, -HC / 2 + 0.03].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RC - 0.01, 0.02, 10, 56]} />
          <meshPhysicalMaterial color={C3.hullDark} metalness={0} roughness={0.6} clearcoat={0.2} />
        </mesh>
      ))}

      {/* four canard + servo stations */}
      {angles.map((theta, i) => (
        <group key={i} rotation={[0, theta, 0]}>
          <group ref={(el) => (pivotRefs.current[i] = el)} position={[RC, SHAFT_Y, 0]}>
            <mesh geometry={canardGeo} castShadow receiveShadow>
              <meshStandardMaterial color="#9aa1ab" metalness={1} roughness={0.3} envMapIntensity={1.15} />
            </mesh>
          </group>
          <ServoUnit hornRef={hornRefs[i]} />
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
    <MiniCanvas height={height} cameraPosition={[1.9, 1.35, 2.6]} fov={42} groundY={-0.72}>
      <FinCan gyroRef={gyroRef} reduced={reduced} />
    </MiniCanvas>
  );
}
