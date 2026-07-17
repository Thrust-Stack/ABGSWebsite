// The rocket — the team's real CAD assembly (19 named parts), normalized to
// scene units at load. Sections explode along the axis; the four canards get
// deflection pivots about their own radial shaft axes; procedural servo
// mounts sit inside the servo fin can (the mounts are not part of the CFD
// assembly); the avionics sled rides inside the nose cone, exactly like the
// real vehicle, and slides out of it for inspection.
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  PHASES, SECTIONS, EXPLODE_OFFSETS, SECTION_OF_NODE, SLED,
  R, C3, CANARD_Y, MM_TO_UNIT, CAD_CENTER,
  phaseT, smoothstep, stageFadeAt,
} from "./config";
import InteractivePart from "./InteractivePart";
import SledElectronics, { SledDeck, SledWiring } from "./Sled";
import { HitBox } from "./parts/primitives";
import { Servo } from "./parts/boards";
import { ServoLead } from "./parts/wiring";
import { useInteraction, REST_SLED } from "./interaction";

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// The servo is authored in millimetres (23 x 12 x 25.4 BMS-127WV+); this puts
// it into the mount's scene units.
const SERVO_MM = 0.0042;

// Manual rotation pivots the bay about its board-cluster centre (sled-local,
// pre-scale) so it turns in place instead of orbiting an off-centre origin.
const SLED_PIVOT_Y = -0.1;
const _IDENT_Q = new THREE.Quaternion();

// Section materials.
//
// The printed parts (nose, fin cans) and the metal parts (body tubes, canards)
// are physically different and have to be described differently — the previous
// half-metal plastic was most of why the vehicle read as a CAD viewport.
// Printed ASA is a dielectric: metalness 0, fairly rough, with a thin clearcoat
// standing in for the sheen off the print layers. The tubes are real aluminium:
// full metalness, low roughness, leaning on the environment for their
// reflections.
const printed = (color) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.0,
    roughness: 0.62,
    clearcoat: 0.28,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.8,
  });

const machined = (color, roughness = 0.28) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 1.0,
    roughness,
    envMapIntensity: 1.15,
  });

const MATS = {
  noseCone: () => printed(C3.nosePrint),
  upperBody: () => machined(C3.hull),
  servoFinCan: () => printed(C3.hullDark),
  canard: () => machined("#9aa1ab", 0.3),
  lowerBody: () => machined(C3.hull),
  staticFinCan: () => printed(C3.nosePrint),
};

// Normalize + bucket the CAD nodes once per mount.
function useAssembly() {
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
      const geo = o.geometry.clone();
      geo.applyMatrix4(M); // bake into scene units, centered, Y up
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
function ServoMountAssembly({ hornRef }) {
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

export default function RocketModel({ isTouch, reduced }) {
  const { progressRef, sledRot } = useInteraction();
  const { sections, canardPivots, mounts } = useAssembly();

  const rocket = useRef();
  const secRefs = useRef({});
  const sledRef = useRef();
  const sledSpinRef = useRef();
  const noseShellMats = useRef([]);
  const servoShellMats = useRef([]);
  const pivotRefs = useRef([]);
  const hornRefs = [useRef(), useRef(), useRef(), useRef()];

  const setSection = (key) => (el) => {
    secRefs.current[key] = el;
  };

  // Section materials, created once. The x-ray refs are wired in an effect
  // so they always point at the material instances actually committed.
  const sectionMats = useMemo(() => {
    const out = {};
    for (const key of Object.keys(sections)) {
      out[key] = sections[key].map(() => {
        const m = MATS[key]();
        m.transparent = true;
        return m;
      });
    }
    return out;
  }, [sections]);

  // The static fin can mixes materials by part name: the airfoil fins are
  // machined like the canards, the motor case is tube aluminium, the can
  // itself is printed. Built once — these used to be constructed inline during
  // render, which leaked a material set per frame.
  const finCanMats = useMemo(
    () =>
      sections.staticFinCan.map((n, i) => {
        if (/airfoil fin/i.test(n.name)) return MATS.canard();
        if (/fake motor/i.test(n.name)) return MATS.upperBody();
        return sectionMats.staticFinCan[i];
      }),
    [sections.staticFinCan, sectionMats.staticFinCan]
  );

  useEffect(() => {
    noseShellMats.current = sectionMats.noseCone;
    servoShellMats.current = sectionMats.servoFinCan;
  }, [sectionMats]);

  const canardMats = useMemo(() => canardPivots.map(() => MATS.canard()), [canardPivots]);

  useFrame((state, dt) => {
    const p = progressRef.current;
    const t = state.clock.elapsedTime;
    const lambda = reduced ? 30 : 6;

    // ---- phase weights ----
    const outroT = phaseT(p, "outro");
    const sledReturn = smoothstep(clamp01(outroT / 0.5));
    const sectionClose = smoothstep(clamp01((outroT - 0.45) / 0.55));
    const explodeK = smoothstep(phaseT(p, "explode")) * (1 - sectionClose);
    const sledK = smoothstep(phaseT(p, "sledOut")) * (1 - sledReturn);
    const canT = phaseT(p, "canards");
    const canardWindow = clamp01(canT * 4) * clamp01(1 - phaseT(p, "explode") * 4);

    // ---- hero idle sway ----
    if (rocket.current) {
      const heroW = 1 - smoothstep(clamp01(phaseT(p, "overview") * 2));
      const target = reduced ? 0 : Math.sin(t * 0.14) * 0.16 * heroW;
      rocket.current.rotation.y = THREE.MathUtils.damp(rocket.current.rotation.y, target, 3, dt);
    }

    // ---- explode offsets ----
    for (const key of Object.keys(EXPLODE_OFFSETS)) {
      const g = secRefs.current[key];
      if (!g) continue;
      g.position.y = THREE.MathUtils.damp(g.position.y, EXPLODE_OFFSETS[key] * explodeK, lambda, dt);
    }

    // These two shells own their own opacity (they opt out of the per-part
    // fade), so they have to honour the stage fade themselves — whichever of
    // the two wants them more transparent wins.
    const stage = stageFadeAt(p);

    // ---- nose shell x-ray while the sled leaves it ----
    const noseTarget = Math.min(1 - 0.9 * clamp01(sledK * 2.2), stage);
    for (const m of noseShellMats.current) {
      m.opacity = THREE.MathUtils.damp(m.opacity, noseTarget, lambda, dt);
    }

    // ---- servo can x-ray during the canard phase ----
    const servoTarget = Math.min(1 - 0.86 * canardWindow, stage);
    for (const m of servoShellMats.current) {
      m.opacity = THREE.MathUtils.damp(m.opacity, servoTarget, lambda, dt);
    }

    // ---- canard deflection demo, mechanically synced with servo horns ----
    const amp = reduced ? 0 : THREE.MathUtils.degToRad(9) * canardWindow;
    pivotRefs.current.forEach((pivot, i) => {
      if (!pivot) return;
      const defl = Math.sin(t * 1.15 + (i * Math.PI) / 2) * amp;
      pivot.rotation.x = defl;
      // The horn turns about the servo's own spline axis (model Z), which the
      // mount rotation lines up with the canard's radial shaft.
      if (hornRefs[i].current) hornRefs[i].current.rotation.z = -defl * 1.4;
    });

    // ---- sled: rest in the nose -> slide out its base -> present ----
    if (sledRef.current) {
      const g = sledRef.current;
      const noseOffset = (secRefs.current.noseCone?.position.y || 0);
      const drop = clamp01(sledK * 1.9); // slide down out of the nose base
      const present = clamp01((sledK - 0.42) / 0.58);
      const restY = SLED.noseLocalY;
      const exitY = SECTIONS.noseCone.y0 - (SLED.length * SLED.baseScale) / 2 - 0.1;
      let yTarget = restY + (exitY - restY) * drop;
      let zTarget = 0;
      let sTarget = SLED.baseScale;
      if (present > 0) {
        // world presentation target, converted to nose-local
        yTarget = exitY + (SLED.presentPos[1] - noseOffset - exitY) * present;
        zTarget = SLED.presentPos[2] * present;
        sTarget = SLED.baseScale + (SLED.presentScale - SLED.baseScale) * present;
      }
      g.position.y = THREE.MathUtils.damp(g.position.y, yTarget, lambda, dt);
      g.position.z = THREE.MathUtils.damp(g.position.z, zTarget, lambda, dt);
      g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, sTarget, lambda, dt));

      // ---- manual bay rotation ----
      // Presented: follow the user's rotation target (rest = three-quarter
      // view). Stowed: unwind to straight and re-arm the rest orientation so
      // the next presentation starts from the same clean pose. The bay's
      // parents carry no rotation during inspection, so the local quaternion
      // equals the world target.
      if (sledSpinRef.current) {
        const presented = present > 0.5;
        if (!presented) sledRot.current.copy(REST_SLED);
        const targetQ = presented ? sledRot.current : _IDENT_Q;
        const kk = reduced ? 1 : 1 - Math.exp(-(presented ? 14 : 8) * dt);
        sledSpinRef.current.quaternion.slerp(targetQ, kk);
      }
    }
  });

  const airframeRange = [0, PHASES.explode.end];
  const servoRange = [PHASES.canards.start - 0.03, PHASES.explode.start + 0.04];

  const sectionPartProps = {
    mode: "highlight",
    isTouch,
    reduced,
    labelDistanceFactor: 8,
  };

  return (
    <group ref={rocket}>
      {/* ================= NOSE CONE (houses the avionics sled) ================= */}
      <group ref={setSection("noseCone")}>
        <InteractivePart id="nose-cone" range={[0, PHASES.sledOut.start]} {...sectionPartProps}>
          {sections.noseCone.map((n, i) => (
            <mesh
              key={i}
              geometry={n.geo}
              material={sectionMats.noseCone[i]}
              userData={{ noPartFade: true }}
              castShadow
              receiveShadow
            />
          ))}
          {/* orange marking band at the nose base */}
          <mesh position={[0, SECTIONS.noseCone.y0 + 0.12, 0]}>
            <cylinderGeometry args={[R * 1.005, R * 1.02, 0.1, 48, 1, true]} />
            <meshStandardMaterial color={C3.orange} metalness={0.55} roughness={0.4} emissiveIntensity={0} />
          </mesh>
        </InteractivePart>

        {/* the avionics bay — deck, boards at true scale, and the harness.
            The inner spin group carries manual rotation, pivoted at the board
            cluster centre so the bay turns in place. */}
        <group ref={sledRef} position={[0, SLED.noseLocalY, 0]} scale={SLED.baseScale}>
          <group position={[0, SLED_PIVOT_Y, 0]}>
            <group ref={sledSpinRef}>
              <group position={[0, -SLED_PIVOT_Y, 0]}>
                <SledDeck />
                <SledWiring />
                <SledElectronics isTouch={isTouch} reduced={reduced} />
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ================= UPPER BODY ================= */}
      <group ref={setSection("upperBody")}>
        <InteractivePart id="upper-body" range={airframeRange} {...sectionPartProps}>
          {sections.upperBody.map((n, i) => (
            <mesh key={i} geometry={n.geo} material={sectionMats.upperBody[i]} castShadow receiveShadow />
          ))}
        </InteractivePart>
      </group>

      {/* ================= SERVO FIN CAN (canards + mounts) ================= */}
      <group ref={setSection("servoFinCan")}>
        <InteractivePart id="servo-fin-can" range={[0, PHASES.canards.start]} {...sectionPartProps}>
          {sections.servoFinCan.map((n, i) => (
            <mesh
              key={i}
              geometry={n.geo}
              material={sectionMats.servoFinCan[i]}
              userData={{ noPartFade: true }}
              castShadow
              receiveShadow
            />
          ))}
        </InteractivePart>

        {/* Interior fill so the mounts read in x-ray view. Kept modest — it sits
            close to the canard roots and blows their tips out if pushed. */}
        <pointLight position={[0.3, CANARD_Y - 0.02, 0.6]} intensity={0.7} distance={2.6} color="#dfe6f0" />

        {/* real canards on deflection pivots */}
        {canardPivots.map((cp, i) => (
          <group key={i} position={cp.root} quaternion={cp.q}>
            <group ref={(el) => (pivotRefs.current[i] = el)}>
              <InteractivePart
                id={`canard#${i}`}
                range={servoRange}
                isTouch={isTouch}
                reduced={reduced}
                hoverOffset={[0.04, 0, 0]}
                inspectDistance={1.6}
                inspectScale={2.2}
                labelDistanceFactor={3}
              >
                <group quaternion={cp.qInv} position={cp.holderPos}>
                  <mesh geometry={cp.geo} material={canardMats[i]} castShadow receiveShadow />
                </group>
                <HitBox args={[0.3, 0.28, 0.24]} position={[0.1, 0, 0]} />
              </InteractivePart>
            </group>
          </group>
        ))}

        {/* servo mounts (in-house design; not in the CFD assembly) */}
        {mounts.map((m, i) => (
          <group key={i} position={m.pos} quaternion={m.q}>
            <InteractivePart
              id={`servo-mount#${i}`}
              range={servoRange}
              isTouch={isTouch}
              reduced={reduced}
              hoverOffset={[0.04, 0, 0.03]}
              inspectDistance={1.5}
              inspectScale={2.6}
              labelDistanceFactor={3}
            >
              <ServoMountAssembly hornRef={hornRefs[i]} />
            </InteractivePart>
          </group>
        ))}
      </group>

      {/* ================= LOWER BODY ================= */}
      <group ref={setSection("lowerBody")}>
        <InteractivePart id="lower-body" range={airframeRange} {...sectionPartProps}>
          {sections.lowerBody.map((n, i) => (
            <mesh key={i} geometry={n.geo} material={sectionMats.lowerBody[i]} castShadow receiveShadow />
          ))}
        </InteractivePart>
      </group>

      {/* ================= STATIC FIN CAN (+ fins, motor, bearing mount) ================= */}
      <group ref={setSection("staticFinCan")}>
        <InteractivePart id="static-fin-can" range={airframeRange} {...sectionPartProps}>
          {sections.staticFinCan.map((n, i) => (
            <mesh key={i} geometry={n.geo} material={finCanMats[i]} castShadow receiveShadow />
          ))}
        </InteractivePart>
      </group>
    </group>
  );
}

useGLTF.preload("/models/rocket-assembly.glb");
