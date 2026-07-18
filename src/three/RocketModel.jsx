// The rocket — the team's real CAD assembly (19 named parts), normalized to
// scene units at load. Sections explode along the axis; the four canards get
// deflection pivots about their own radial shaft axes; procedural servo
// mounts sit inside the servo fin can (the mounts are not part of the CFD
// assembly); the avionics sled rides inside the nose cone, exactly like the
// real vehicle, and slides out of it for inspection.
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  PHASES, SECTIONS, EXPLODE_OFFSETS, SLED,
  R, C3, CANARD_Y,
  phaseT, smoothstep, stageFadeAt,
} from "./config";
import InteractivePart from "./InteractivePart";
import SledElectronics, { SledDeck, SledWiring } from "./Sled";
import { HitBox } from "./parts/primitives";
import { useInteraction, REST_SLED } from "./interaction";
import { useAssembly, MATS, ServoMountAssembly } from "./assembly";

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Manual rotation pivots the bay about its board-cluster centre (sled-local,
// pre-scale) so it turns in place instead of orbiting an off-centre origin.
const SLED_PIVOT_Y = -0.1;
const _IDENT_Q = new THREE.Quaternion();

// Marking-band geometry, derived from the nose cone taper so the ring always
// hugs the skin. Seated well above the upper body tube's top so it can't fight
// the tube it used to overlap.
const NOSE_LEN = SECTIONS.noseCone.y1 - SECTIONS.noseCone.y0;
const noseRadiusAt = (y) => (R * (SECTIONS.noseCone.y1 - y)) / NOSE_LEN;
const NOSE_BAND = (() => {
  const y = SECTIONS.noseCone.y0 + 0.6; // ~world 1.82, clear of the tube top (~1.735)
  const h = 0.1;
  const proud = 1.02; // ~0.6 mm off the skin so it reads as a painted/taped band
  return { y, h, rBot: noseRadiusAt(y - h / 2) * proud, rTop: noseRadiusAt(y + h / 2) * proud };
})();

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
          {/* Orange marking band on the lower nose. It has to clear the upper
              body tube: the nose base telescopes concentrically inside that tube
              (both at ~R), so a band sitting down at the base z-fought the tube
              from some angles. Placed above the tube's top instead, sized to the
              cone's actual radius at its station (so it hugs the skin rather than
              floating), sat a touch proud, and polygon-offset so it never fights
              the nose surface underneath. */}
          <mesh position={[0, NOSE_BAND.y, 0]}>
            <cylinderGeometry args={[NOSE_BAND.rTop, NOSE_BAND.rBot, NOSE_BAND.h, 48, 1, true]} />
            <meshStandardMaterial
              color={C3.orange}
              metalness={0.55}
              roughness={0.4}
              emissiveIntensity={0}
              side={THREE.DoubleSide}
              polygonOffset
              polygonOffsetFactor={-1}
              polygonOffsetUnits={-1}
            />
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
