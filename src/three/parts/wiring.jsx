// The sled harness.
//
// Cables are modelled the way the loom is actually built rather than drawn as
// single tubes: every run is a bundle of individual conductors that stay
// parallel along a shared spline, arch off the deck between anchors, and land
// on real pins (see layout.js). Signal runs keep the site's subsystem colour
// code; the servo leads and the battery leads use their real colours, because
// those are the ones a person would recognise.
//
// The four canard servos land on channels 0-3 of the PCA9685's header field and
// leave the sled as one loom through the base — the same way they leave the
// real nose cone, heading aft to the servo can.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C3 } from "../config";
import { MM } from "./boards";
import { at, pcaChannel, PIN_TOP, DECK_Z, DECK_Y0, channelX, deckHalf } from "./layout";
import { useInteraction, PART_INDEX } from "../interaction";
import { dataIdOf } from "../InteractivePart";

// Subsystem colour code for signal runs.
const WIRE = {
  sense: C3.green,
  data: C3.blue,
  act: C3.orange,
  pos: "#c0392b", // +V
  neg: "#15171b", // ground
};

// Futaba-standard servo lead: signal / +V / ground.
const SERVO_LEAD = ["#e8862c", "#c0392b", "#5b3a29"];

const INSULATION = {
  metalness: 0.0,
  roughness: 0.36, // PVC insulation is glossy — this is what reads as "wire"
};

/** Spline through the anchors, arched off the deck in between. */
function makeCurve(points, arch) {
  const v = points.map((p) => new THREE.Vector3(p[0], p[1], p[2] ?? DECK_Z + 0.004));
  if (arch) {
    for (let i = 1; i < v.length - 1; i++) {
      v[i].z += arch * Math.sin((Math.PI * i) / (v.length - 1));
    }
  }
  return new THREE.CatmullRomCurve3(v, false, "catmullrom", 0.5);
}

/** Copy of a curve displaced sideways in its own frame — one conductor of a bundle. */
function offsetCurve(base, du, samples = 40) {
  const frames = base.computeFrenetFrames(samples, false);
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const p = base.getPoint(i / samples);
    p.addScaledVector(frames.binormals[i], du);
    pts.push(p);
  }
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

// One conductor tube of a bundle.
function conductorGeo({ points, colorIndex, count, r, spread, arch, segs }) {
  const base = makeCurve(points, arch);
  const off = (colorIndex - (count - 1) / 2) * spread;
  const c = count === 1 ? base : offsetCurve(base, off, segs);
  return new THREE.TubeGeometry(c, segs, r, 6, false);
}

/**
 * Build one merged geometry per wire colour across every run, so the whole
 * harness draws in ~8 calls instead of ~50 individual tube meshes. Each run is
 * a bundle of parallel conductors; a run's conductors are distributed to their
 * colour buckets, then each bucket is merged.
 */
function mergeHarness(runs) {
  const byColor = new Map();
  for (const run of runs) {
    const { points, colors, r = 0.0034, spread = 0.0078, arch = 0.012, segs = 40 } = run;
    colors.forEach((col, i) => {
      const geo = conductorGeo({ points, colorIndex: i, count: colors.length, r, spread, arch, segs });
      if (!byColor.has(col)) byColor.set(col, []);
      byColor.get(col).push(geo);
    });
  }
  const out = [];
  for (const [color, geos] of byColor) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    out.push({ color, geo: merged });
  }
  return out;
}

/**
 * A cable bundle rendered inline (used off the sled, e.g. the servo-side lead
 * where there's only one bundle and merging buys nothing).
 */
function Bundle({ points, colors, r = 0.0034, spread = 0.0078, arch = 0.012, segs = 40 }) {
  const geos = useMemo(
    () =>
      colors.map((_, i) => conductorGeo({ points, colorIndex: i, count: colors.length, r, spread, arch, segs })),
    [points, colors, r, spread, arch, segs]
  );
  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={colors[i]} {...INSULATION} />
        </mesh>
      ))}
    </group>
  );
}

/** Connector housing at a cable end. */
function Connector({ position, rotation = [0, 0, 0], ways = 3, color = "#15181d" }) {
  return (
    <group position={position} rotation={rotation} scale={MM}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[ways * 2.54, 5.4, 7.2]} />
        <meshStandardMaterial color={color} metalness={0.05} roughness={0.6} />
      </mesh>
      <mesh position={[0, -2.9, 1.6]}>
        <boxGeometry args={[ways * 2.54 - 1, 0.6, 2]} />
        <meshStandardMaterial color="#0a0b0e" metalness={0.1} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Zip tie holding a run into its channel. */
function ZipTie({ position, rotation = [0, 0, 0], w = 0.028 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[w, 0.0018, 6, 14]} />
      <meshStandardMaterial color="#0e1013" metalness={0.05} roughness={0.5} />
    </mesh>
  );
}

// ---- harness definition -------------------------------------------------
// Anchors come from layout.js, so these follow the boards rather than
// floating near them.

const F = DECK_Z + 0.004; // front-face cable height
const B = -(DECK_Z + 0.004); // back-face cable height

// Cable channel waypoints, following the deck taper.
const L = (y, z = F) => [channelX(y, -1), y, z];
const Rt = (y, z = F) => [channelX(y, 1), y, z];
// Over the deck edge — how a run crosses between the two faces.
const overL = (y) => [-deckHalf(y) - 0.004, y, 0];
const overR = (y) => [deckHalf(y) + 0.004, y, 0];

function harness() {
  const espL = (y) => at("esp32", -12.7, y, PIN_TOP);
  const espR = (y) => at("esp32", 12.7, y, PIN_TOP);
  const piGpio = (y) => at("raspberry-pi-5", 24.5, y, PIN_TOP);

  return [
    // --- I2C sensor bus: MPU6050 + BMP585 -> ESP32 (left channel) ---
    {
      colors: [WIRE.sense, WIRE.sense, WIRE.pos, WIRE.neg],
      arch: 0.008,
      points: [at("mpu6050", 0, -6.3, PIN_TOP), L(0.15), L(0.09), espL(20)],
    },
    {
      colors: [WIRE.sense, WIRE.sense, WIRE.pos, WIRE.neg],
      arch: 0.007,
      points: [at("bmp585", 0, -6.4, PIN_TOP), L(0.09), L(0.05), espL(6)],
    },
    // --- GPS UART -> ESP32 (right channel) ---
    {
      colors: [WIRE.sense, WIRE.sense, WIRE.pos, WIRE.neg],
      arch: 0.008,
      points: [at("gps-v3", 0, -15.6, PIN_TOP), Rt(0.12), Rt(0.06), espR(18)],
    },
    // --- ESP32 -> Pi 5 link (short centre run) ---
    {
      colors: [WIRE.data, WIRE.data, WIRE.neg],
      arch: 0.008,
      spread: 0.007,
      points: [espR(-20), [0.07, -0.14, F], [0.085, -0.18, F], piGpio(36)],
    },
    // --- Pi 5 SPI -> RFM95W: front to back, round the left edge ---
    {
      colors: [WIRE.data, WIRE.data, WIRE.data, WIRE.data, WIRE.pos, WIRE.neg],
      arch: 0.01,
      points: [piGpio(-20), L(-0.3), overL(0.06), L(0.13, B), at("rfm95w", 0, -9.5, PIN_TOP)],
    },
    // --- I2C -> PCA9685: ESP32 (front) round the right edge to the back ---
    {
      colors: [WIRE.act, WIRE.act, WIRE.pos, WIRE.neg],
      arch: 0.01,
      points: [espR(-8), Rt(-0.06), overR(-0.1), Rt(-0.12, B), at("pca9685", -6, -26, PIN_TOP)],
    },
    // --- battery -> BEC (both on the back face) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.009,
      r: 0.0046, // power leads are heavier gauge
      points: [[0.02, -0.24, B - 0.02], [0.04, -0.2, B], at("bec-ubec", 18, 0, 8)],
    },
    // --- BEC 5 V -> Pi: back to front, round the left edge ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.009,
      r: 0.0042,
      points: [at("bec-ubec", -18, 0, 8), L(-0.2, B), overL(-0.26), L(-0.3), piGpio(-2)],
    },
    // --- battery -> PCA9685 V+ terminal (the servo rail is not the 5 V logic rail) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.009,
      r: 0.0042,
      points: [[-0.02, -0.24, B - 0.02], L(-0.16, B), L(-0.06, B), at("pca9685", -4, 26, 8)],
    },
  ];
}

/**
 * The four canard servo leads: channels 0-3 of the PCA9685 on the back face,
 * gathered into one loom and out through the base of the bay, heading aft to
 * the servo can — the same route they take on the real vehicle.
 */
function servoHarness() {
  const exitY = DECK_Y0 - 0.03;
  return [0, 1, 2, 3].map((i) => {
    const ch = pcaChannel(i);
    const laneX = channelX(-0.3, 1) + (i - 1.5) * 0.008;
    return {
      colors: SERVO_LEAD,
      arch: 0.01,
      spread: 0.0072,
      points: [
        [ch[0], ch[1], ch[2] - 0.004],
        [ch[0] + 0.014, ch[1] - 0.02, ch[2] - 0.014],
        [laneX, -0.3, B - 0.006],
        [laneX, -0.5, B - 0.006],
        [laneX, exitY, B * 0.6],
      ],
    };
  });
}

export default function SledWiring() {
  const { selectedId } = useInteraction();
  const group = useRef();
  const mats = useRef([]);

  // All conductors merged into one geometry per colour, built once.
  const merged = useMemo(() => mergeHarness([...harness(), ...servoHarness()]), []);
  const servos = useMemo(() => servoHarness(), []);

  // A selected board flies to the camera; its cables can't follow it, so the
  // harness fades out rather than visibly tearing off the connector.
  const hide = !!selectedId && PART_INDEX[dataIdOf(selectedId)]?.kind === "component";

  useFrame((_, dt) => {
    if (!mats.current.length && group.current) {
      const list = [];
      group.current.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.transparent = true;
          list.push(o.material);
        }
      });
      mats.current = list;
    }
    const target = hide ? 0 : 1;
    for (const m of mats.current) {
      m.opacity = THREE.MathUtils.damp(m.opacity, target, 8, dt);
      m.visible = m.opacity > 0.02;
    }
  });

  return (
    <group ref={group}>
      {/* Not shadow casters: at 2 mm across they'd contribute nothing to a
          shadow map sized for the whole vehicle, and the AO pass is what
          actually grounds them against the deck. */}
      {merged.map(({ color, geo }) => (
        <mesh key={color} geometry={geo}>
          <meshStandardMaterial color={color} {...INSULATION} />
        </mesh>
      ))}

      {/* servo connectors, just clear of the bay base */}
      {servos.map((w, i) => {
        const end = w.points[w.points.length - 1];
        return <Connector key={`c${i}`} position={[end[0], end[1] - 0.012, end[2]]} ways={3} />;
      })}

      {/* ties holding the looms into their channels along the deck edges */}
      <ZipTie position={L(0.1, DECK_Z + 0.006)} rotation={[0, Math.PI / 2, 0]} w={0.014} />
      <ZipTie position={Rt(0.06, DECK_Z + 0.006)} rotation={[0, Math.PI / 2, 0]} w={0.014} />
      <ZipTie position={L(-0.3, DECK_Z + 0.006)} rotation={[0, Math.PI / 2, 0]} w={0.016} />
      <ZipTie position={[channelX(-0.42, 1), -0.42, -(DECK_Z + 0.008)]} rotation={[0, Math.PI / 2, 0]} w={0.016} />
    </group>
  );
}

/**
 * The servo end of the same loom: a 3-wire lead leaving the servo case and
 * running up into the airframe. The run between here and the sled is inside the
 * body tubes on the real vehicle, so it's modelled at both ends and hidden in
 * between — exactly where it goes.
 */
export function ServoLead({ scale = 1 }) {
  // Mount-local: +X is radial (outboard), +Y is forward toward the nose. The
  // lead leaves the case, turns inboard off the can wall, and runs forward
  // until the body tube swallows it.
  const points = useMemo(
    () => [
      [-0.01, -0.06, 0.0],
      [-0.05, -0.03, 0.03],
      [-0.075, 0.08, 0.045],
      [-0.07, 0.35, 0.05],
      [-0.06, 0.79, 0.03],
    ],
    []
  );
  return (
    <group scale={scale}>
      <Bundle points={points} colors={SERVO_LEAD} r={0.0038} spread={0.008} arch={0} segs={28} />
    </group>
  );
}
