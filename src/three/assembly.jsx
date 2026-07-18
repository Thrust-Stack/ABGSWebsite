// Shared CAD-assembly extraction + section materials.
//
// This is the team's real rocket-assembly.glb (19 named parts), normalized to
// scene units at load, bucketed into sections, with the four canards resolved
// onto radial deflection pivots and one servo-mount anchor derived per canard.
//
// It lives here (rather than inside RocketModel.jsx) so both the home scene and
// the Telemetry servo-fin-can viewer can render from the *same* geometry and
// materials: the Telemetry page pulls just the servoFinCan slice + its canards
// out of what useAssembly() returns instead of rebuilding a procedural stand-in.
// drei caches useGLTF by URL, so loading it on a second page reuses the parse.
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SECTION_OF_NODE, R, CANARD_Y, MM_TO_UNIT, CAD_CENTER, C3 } from "./config";
import { Servo } from "./parts/boards";
import { HitBox } from "./parts/primitives";
import { ServoLead } from "./parts/wiring";

// The servo is authored in millimetres (23 x 12 x 25.4 BMS-127WV+); this puts
// it into the mount's scene units.
export const SERVO_MM = 0.0042;

// Section materials.
//
// The printed parts (nose, fin cans) and the metal parts (body tubes, canards)
// are physically different and have to be described differently — the previous
// half-metal plastic was most of why the vehicle read as a CAD viewport.
// Printed ASA is a dielectric: metalness 0, fairly rough, with a thin clearcoat
// standing in for the sheen off the print layers. The tubes are real aluminium:
// full metalness, low roughness, leaning on the environment for their
// reflections.
//
// DoubleSide throughout: the CAD came out of OpenCascade tessellation, and a few
// solids carry inconsistent triangle winding, which made some sections (the
// diameter step-down aft) drop out under backface culling from certain camera
// angles. Rendering both faces makes every section show at any orientation, and
// it also lets the x-ray states read the interior walls instead of showing
// through to nothing. These are closed solids, so there's no self-z-fighting.
export const printed = (color) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.0,
    roughness: 0.62,
    clearcoat: 0.28,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.8,
    side: THREE.DoubleSide,
  });

export const machined = (color, roughness = 0.28) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 1.0,
    roughness,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
  });

export const MATS = {
  noseCone: () => printed(C3.nosePrint),
  upperBody: () => machined(C3.hull),
  servoFinCan: () => printed(C3.hullDark),
  canard: () => machined("#9aa1ab", 0.3),
  lowerBody: () => machined(C3.hull),
  staticFinCan: () => printed(C3.nosePrint),
};

// Normalize + bucket the CAD nodes once per mount.
export function useAssembly() {
  const { scene } = useGLTF("/models/rocket-assembly.glb");
  return useMemo(() => {
    const M = new THREE.Matrix4()
      .makeScale(MM_TO_UNIT, MM_TO_UNIT, MM_TO_UNIT)
      .multiply(new THREE.Matrix4().makeTranslation(-CAD_CENTER.x, -CAD_CENTER.y, -CAD_CENTER.z));

    const sections = { noseCone: [], upperBody: [], servoFinCan: [], lowerBody: [], staticFinCan: [] };
    const canards = [];

    scene.traverse((o) => {
      if (!o.isMesh) return;
      const raw = o.name || o.parent?.name || "";
      const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
      const rule = SECTION_OF_NODE.find((r) => norm.includes(r.key));
      if (!rule) return;
      const name = raw;
      let geo = o.geometry.clone();
      geo.applyMatrix4(M); // bake into scene units, centered, Y up

      // The nose cone came out of the STEP tessellation with only ~580 tris and
      // faceted per-face normals, which read as clumps/lumps under the physical
      // clearcoat. Re-smoothing the normals by crease angle welds the shared
      // vertices and averages them across the curved skin while leaving the base
      // rim (a ~90° edge) sharp — this fixes the shading facets. The remaining
      // silhouette faceting is baked into the mesh; smoothing it fully needs a
      // finer re-export (see scripts/step-to-glb.mjs + npm run convert:cad).
      if (rule.section === "noseCone") {
        geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(50));
      }

      geo.computeBoundingBox();
      const c = new THREE.Vector3();
      geo.boundingBox.getCenter(c);
      if (rule.section === "canard") canards.push({ geo, center: c });
      else sections[rule.section].push({ geo, center: c, name });
    });

    // Canard pivots: rotate about the radial shaft axis through each root.
    const canardPivots = canards.map(({ geo, center }) => {
      const radial = new THREE.Vector3(center.x, 0, center.z).normalize();
      const root = radial.clone().multiplyScalar(R * 0.98).setY(center.y);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), radial);
      const qInv = q.clone().invert();
      const holderPos = root.clone().negate().applyQuaternion(qInv);
      return { geo, root, q, qInv, holderPos, radial };
    });

    // Servo mount anchors: one per canard, inside the can below the shaft.
    const mounts = canardPivots.map(({ radial }) => {
      const pos = radial.clone().multiplyScalar(R * 0.42).setY(CANARD_Y - 0.135);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), radial);
      return { pos, q };
    });

    return { sections, canardPivots, mounts };
  }, [scene]);
}

// Servo mount assembly: the team's in-house bracket carrying a real
// BlueBird BMS-127WV+, its lead running up into the airframe toward the sled.
export function ServoMountAssembly({ hornRef }) {
  const s = 0.62;
  return (
    <group scale={s}>
      <HitBox args={[0.34, 0.36, 0.3]} position={[0, 0.04, 0]} />
      {/* machined bracket */}
      <mesh castShadow>
        <boxGeometry args={[0.06, 0.22, 0.16]} />
        <meshStandardMaterial color="#5a6270" metalness={0.92} roughness={0.34} emissiveIntensity={0} />
      </mesh>
      {/* The servo, positioned so its output spline lands on the canard shaft:
          the -90 deg Y rotation puts the servo's height axis on the mount's
          radial +X, which is the shaft axis the horn has to turn about. */}
      <group position={[0.018, 0.066, 0]} rotation={[0, -Math.PI / 2, 0]} scale={SERVO_MM}>
        <Servo hornRef={hornRef} />
      </group>
      {/* output shaft toward hull */}
      <mesh position={[0.13, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.22, 14]} />
        <meshStandardMaterial color="#8d949e" metalness={1} roughness={0.28} emissiveIntensity={0} />
      </mesh>
      {/* bearing collar */}
      <mesh position={[0.2, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.03, 18]} />
        <meshStandardMaterial color="#6d7480" metalness={0.95} roughness={0.32} emissiveIntensity={0} />
      </mesh>
      {/* 3-wire lead to the PCA9685, disappearing forward into the body tube */}
      <ServoLead scale={1.4} />
    </group>
  );
}

useGLTF.preload("/models/rocket-assembly.glb");
