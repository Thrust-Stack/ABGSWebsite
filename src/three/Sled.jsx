// The avionics sled — the deck that carries the nine boards inside the nose.
//
// Built to the real bay: 348.7 mm long, Ø71.6 mm, from the team's two
// "Avionics Bay Plate" CAD exports. Boards are laid out per the build photos
// (public/components) — compute and sensors on the front face, PCA9685 and the
// BEC on the back — and the whole thing is at true scale, so a Pi 5 nearly fills
// the bay width the way it does in the photo.
//
// Note on the CAD: the two bay exports are the printed *tubes* that line the
// nose, not flat plates (the previous code read them as plates and normalized
// them into slabs). Rendering them as tubes would seal the boards inside the
// thing you're meant to be looking at, so the sled carries the deck and the
// centring rings — the black ring joint visible in IMG_9479 — while the nose
// cone geometry already plays the bay wall around it.
import { useMemo } from "react";
import * as THREE from "three";
import InteractivePart from "./InteractivePart";
import { PHASES, C3, SLED_MM } from "./config";
import { POS, DECK_Z, DECK_T, DECK_Y0, DECK_Y1, BAY_LEN, deckHalf, sideSign } from "./parts/layout";
import { HitBox } from "./parts/primitives";
import { MM, RaspberryPi5, Esp32, Mpu6050, Bmp585, UltimateGps, Rfm95w, Pca9685, Ubec, LipoPack } from "./parts/boards";

export { default as SledWiring } from "./parts/wiring";

// Every board is at true scale relative to every other one — an MPU6050 really
// is a thumbnail next to a Pi 5, and pretending otherwise is what made the old
// sled read as a diagram. `hit` is the invisible click volume that keeps the
// small boards comfortably selectable at true size; `inspect` is how much to
// enlarge each one when it's pulled out, so a sensor and a flight computer both
// arrive at a readable size.
const BOARDS = [
  { id: "mpu6050", el: <Mpu6050 />, hit: [0.09, 0.07, 0.05], inspect: 4.2 },
  { id: "bmp585", el: <Bmp585 />, hit: [0.1, 0.075, 0.05], inspect: 3.8 },
  { id: "gps-v3", el: <UltimateGps />, hit: [0.1, 0.14, 0.06], inspect: 2.6 },
  { id: "esp32", el: <Esp32 />, hit: [0.11, 0.21, 0.06], inspect: 2.0 },
  { id: "raspberry-pi-5", el: <RaspberryPi5 />, hit: [0.21, 0.32, 0.08], inspect: 1.3 },
  { id: "rfm95w", el: <Rfm95w />, hit: [0.1, 0.08, 0.05], inspect: 3.6 },
  { id: "pca9685", el: <Pca9685 />, hit: [0.1, 0.24, 0.06], inspect: 1.8 },
  { id: "battery", el: <LipoPack />, hit: [0.13, 0.27, 0.09], inspect: 1.5 },
  { id: "bec-ubec", el: <Ubec />, hit: [0.16, 0.07, 0.05], inspect: 2.8 },
];

export default function SledElectronics({ isTouch, reduced }) {
  const range = [PHASES.sledOut.start - 0.02, 1];
  return (
    <group>
      {BOARDS.map((b) => {
        const p = POS[b.id];
        const s = sideSign(b.id);
        return (
          <group key={b.id} position={[p.xy[0], p.xy[1], s * DECK_Z]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
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
              {/* boards are authored in mm; this is the only place they're scaled */}
              <group scale={MM}>{b.el}</group>
              <HitBox args={b.hit} position={[0, 0, b.hit[2] / 2 - 0.005]} />
            </InteractivePart>
          </group>
        );
      })}
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
 * The deck follows the cone: wide at the base where the Pi 5 lives, tapering
 * forward into the nose where only the sensors fit. Built as a flat trapezoid
 * from deckHalf() so the deck and the board layout can never disagree about how
 * much room there is at a given station.
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
// which is where IMG_9479 shows it.
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

      {/* 2200 µF bulk capacitor on the servo rail — the team's board doesn't
          carry enough local bulk for four servos stalling together, so this
          sits across the rail. On the back face at the base, clear of the Pi
          which now fills the widest part of the front deck. */}
      <group position={[0.05, -0.56, -DECK_Z]}>
        <mesh position={[0, 0, -0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.029, 0.029, 0.09, 20]} />
          <meshStandardMaterial color="#0e1013" metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0, -0.0905]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.004, 20]} />
          <meshStandardMaterial color="#9aa1ab" metalness={0.9} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
