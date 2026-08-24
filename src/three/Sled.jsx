// The avionics sled — the deck that carries the whole avionics assembly inside
// the nose.
//
// Built to the real bay: 348.7 mm long, Ø71.6 mm, from the team's two
// "Avionics Bay Plate" CAD exports. The layout follows the build photos in
// public/components: a perfboard on the *front* face carrying all six modules
// on its component side with the point-to-point wiring on its back, and the
// power system — two LiPo packs, a step-down converter each, and the switch
// housing — on the *back* face. Everything is at true scale against the
// airframe, so the taper really is what decides how wide the board can be.
//
// Note on the CAD: the two bay exports are the printed *tubes* that line the
// nose, not flat plates (the previous code read them as plates and normalized
// them into slabs). Rendering them as tubes would seal the assembly inside the
// thing you're meant to be looking at, so the sled carries the deck and the
// centring rings — the black ring joint visible in the build photos — while the
// nose cone geometry already plays the bay wall around it.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import InteractivePart from "./InteractivePart";
import { PHASES, C3, SLED_MM, layerSpreadAt } from "./config";
import {
  POS, DECK_T, DECK_Y0, DECK_Y1, BAY_LEN, deckHalf, sideSign, posZ,
} from "./parts/layout";
import { HitBox } from "./parts/primitives";
import { useInteraction } from "./interaction";
import {
  MM, Perfboard, Esp32, HeltecEsp32, Mpu6500, Bmp585, UltimateGps,
  MicroSdReader, StepDown, SwitchHousing, LipoPack,
} from "./parts/boards";

export { default as SledWiring } from "./parts/wiring";

// Every part is at true scale relative to every other one — an MPU6500 really
// is a thumbnail next to a LiPo pack, and pretending otherwise is what made the
// old sled read as a diagram. `hit` is the invisible click volume that keeps the
// small parts comfortably selectable at true size; `inspect` is how much to
// enlarge each one when it's pulled out, so a sensor and a battery both arrive
// at a readable size. `hitY` offsets that volume for parts whose geometry isn't
// centred on their anchor (the perfboard, which runs on past its own origin).
//
// The three arrays are the three physical layers, and they are what the
// exploded view separates along the deck normal.
const MODULES = [
  { id: "mpu6500", el: <Mpu6500 raised={11} />, hit: [0.09, 0.07, 0.06], inspect: 4.2 },
  { id: "microsd", el: <MicroSdReader />, hit: [0.095, 0.17, 0.05], inspect: 2.3 },
  { id: "heltec-esp32", el: <HeltecEsp32 />, hit: [0.105, 0.195, 0.055], inspect: 2.1 },
  { id: "esp32-main", el: <Esp32 />, hit: [0.11, 0.21, 0.06], inspect: 2.0 },
  { id: "bmp585", el: <Bmp585 />, hit: [0.1, 0.075, 0.05], inspect: 3.8 },
  { id: "gps-module", el: <UltimateGps />, hit: [0.1, 0.14, 0.06], inspect: 2.6 },
];

const BOARD = [
  // The perfboard's origin is the main segment; the forward segment runs on
  // past it, so its click volume is offset to cover both.
  { id: "perfboard", el: <Perfboard />, hit: [0.14, 0.8, 0.035], hitY: 0.095, inspect: 0.6 },
];

const POWER = [
  {
    id: "battery-electronics",
    el: <LipoPack w={30} l={50} t={14} accent="#3b82f6" />,
    hit: [0.12, 0.2, 0.07],
    inspect: 1.8,
  },
  { id: "stepdown-electronics", el: <StepDown id="buck-elec" tone="blue" />, hit: [0.1, 0.075, 0.05], inspect: 3.4 },
  { id: "stepdown-servo", el: <StepDown id="buck-servo" tone="green" />, hit: [0.1, 0.075, 0.05], inspect: 3.4 },
  {
    id: "battery-servo",
    el: <LipoPack w={35} l={62} t={18} accent="#ff6a2c" />,
    hit: [0.14, 0.24, 0.085],
    inspect: 1.5,
  },
  { id: "switch-housing", el: <SwitchHousing />, hit: [0.175, 0.09, 0.06], inspect: 2.4 },
];

function PartGroup({ b, range, isTouch, reduced }) {
  const p = POS[b.id];
  const s = sideSign(b.id);
  return (
    <group position={[p.xy[0], p.xy[1], posZ(b.id)]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
      <InteractivePart
        id={b.id}
        range={range}
        isTouch={isTouch}
        reduced={reduced}
        hoverOffset={[0, 0, 0.07]}
        inspectDistance={2.6}
        inspectScale={b.inspect}
        labelDistanceFactor={4.5}
      >
        {/* parts are authored in mm; this is the only place they're scaled */}
        <group scale={MM}>{b.el}</group>
        <HitBox args={b.hit} position={[0, b.hitY ?? 0, b.hit[2] / 2 - 0.005]} />
      </InteractivePart>
    </group>
  );
}

/**
 * One physical layer. The separation is applied here, on the layer's own group,
 * rather than per part: InteractivePart damps each part's own position every
 * frame for hover and pull-out, so writing to the same transform from two
 * places would fight. A parent group composes cleanly with both and costs one
 * matrix update per layer per frame instead of one per part.
 */
function Layer({ parts, dir, range, isTouch, reduced }) {
  const g = useRef();
  const { progressRef } = useInteraction();
  useFrame((_, dt) => {
    if (!g.current) return;
    const target = layerSpreadAt(progressRef.current) * dir;
    g.current.position.z = THREE.MathUtils.damp(g.current.position.z, target, 6, dt);
  });
  return (
    <group ref={g}>
      {parts.map((b) => (
        <PartGroup key={b.id} b={b} range={range} isTouch={isTouch} reduced={reduced} />
      ))}
    </group>
  );
}

export default function SledElectronics({ isTouch, reduced }) {
  const range = [PHASES.sledOut.start - 0.02, 1];
  return (
    <group>
      {/* modules lift off the front of the board, power drops off the back */}
      <Layer parts={MODULES} dir={1} range={range} isTouch={isTouch} reduced={reduced} />
      <Layer parts={BOARD} dir={0} range={range} isTouch={isTouch} reduced={reduced} />
      <Layer parts={POWER} dir={-1} range={range} isTouch={isTouch} reduced={reduced} />
    </group>
  );
}

// Printed ASA, same as the nose it lives in.
const bayPrint = {
  color: C3.nosePrint,
  metalness: 0,
  roughness: 0.62,
};

/**
 * The deck follows the cone: wide at the base where the packs live, tapering
 * forward into the nose where only the sensor board fits. Built as a flat
 * trapezoid from deckHalf() so the deck and the part layout can never disagree
 * about how much room there is at a given station.
 */
function deckGeometry() {
  const steps = 8;
  const shape = new THREE.Shape();
  const ys = Array.from({ length: steps + 1 }, (_, i) => DECK_Y0 + ((DECK_Y1 - DECK_Y0) * i) / steps);
  shape.moveTo(-deckHalf(ys[0]), ys[0]);
  for (const y of ys) shape.lineTo(-deckHalf(y), y);
  for (const y of [...ys].reverse()) shape.lineTo(deckHalf(y), y);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: DECK_T, bevelEnabled: false });
  geo.translate(0, 0, -DECK_T / 2);
  return geo;
}

// The bay prints in two halves — a 178.7 mm forward tapered piece and a
// 170.0 mm aft cylindrical one — so the joint ring sits just aft of centre,
// which is where the build photos show it.
const JOINT_Y = BAY_LEN / 2 - 178.7 * SLED_MM;

export function SledDeck() {
  const deck = useMemo(() => deckGeometry(), []);
  return (
    <group>
      <mesh geometry={deck} castShadow receiveShadow>
        <meshPhysicalMaterial {...bayPrint} clearcoat={0.2} clearcoatRoughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* the joint ring between the two printed halves */}
      <mesh position={[0, JOINT_Y, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[deckHalf(JOINT_Y) - 0.002, 0.008, 8, 36]} />
        <meshPhysicalMaterial {...bayPrint} clearcoat={0.2} clearcoatRoughness={0.6} />
      </mesh>
    </group>
  );
}
