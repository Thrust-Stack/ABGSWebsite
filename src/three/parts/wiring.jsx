// The sled harness.
//
// Cables are modelled the way the loom is actually built rather than drawn as
// single tubes: every run is a bundle of individual conductors that stay
// parallel along a shared spline, arch off the deck between anchors, and land
// on real pins (see layout.js). Power runs use their real colours, because
// those are the ones a person would recognise; the servo signal run keeps the
// site's actuation colour.
//
// Scope note: the wiring *between* the six modules is not here — it is soldered
// point-to-point on the back of the perfboard and is modelled there, on the
// board itself (see Perfboard in boards.jsx). What this file carries is
// everything that crosses between the two faces of the deck or leaves the sled:
// the two power systems on the back face, the electronics supply coming round
// the deck edge to the board, and the four canard servo leads heading aft.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { C3, LAYER_SPREAD, layerSpreadAt } from "../config";
import { MM } from "./boards";
import { at, servoPin, DECK_Z, DECK_Y0, channelX, deckHalf } from "./layout";
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
  // Power leads leave each pack's forward end, the same end the balance lead
  // exits on the real packs.
  const packOut = (id, x, y) => at(id, x, y, 9);

  return [
    // --- electronics pack -> its step-down converter (back face) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.009,
      r: 0.0042,
      points: [packOut("battery-electronics", 8, 25), [0.03, -0.19, B - 0.012], at("stepdown-electronics", -8, 6, 6)],
    },
    // --- electronics step-down -> switch housing (down the left channel) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.009,
      r: 0.0042,
      points: [at("stepdown-electronics", 8, -6, 6), L(-0.3, B), L(-0.5, B), at("switch-housing", -13, 7, 11)],
    },
    // --- servo pack -> its step-down converter (back face) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.01,
      r: 0.0048, // the servo rail is the heavier of the two
      points: [packOut("battery-servo", 10, 31), [-0.03, -0.33, B - 0.014], at("stepdown-servo", -8, -6, 6)],
    },
    // --- servo step-down -> switch housing (down the right channel) ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.008,
      spread: 0.01,
      r: 0.0048,
      points: [at("stepdown-servo", 8, 6, 6), Rt(-0.36, B), Rt(-0.52, B), at("switch-housing", 13, 7, 11)],
    },
    // --- switched electronics supply -> the perfboard: back to front, round
    //     the left edge, landing on the board's aft power pads ---
    {
      colors: [WIRE.pos, WIRE.neg],
      arch: 0.01,
      spread: 0.009,
      r: 0.0042,
      points: [
        at("switch-housing", -19, -2, 8),
        L(-0.56, B),
        overL(-0.52),
        L(-0.5),
        at("perfboard", -15, -78, 3),
      ],
    },
    // --- canard servo signal: Main ESP32 (front) round the right edge to the
    //     base, where it joins the servo rail on its way aft ---
    {
      colors: [WIRE.act, WIRE.act, WIRE.act, WIRE.act],
      arch: 0.01,
      spread: 0.0062,
      points: [servoPin(1.5), Rt(-0.42), overR(-0.5), Rt(-0.54, B), at("switch-housing", 6, -9, 6)],
    },
  ];
}

/**
 * The four canard servo leads. Signal comes from the Main ESP32 and the rail
 * comes off the servo step-down, so they meet at the switch housing and leave
 * the bay from there as one loom through the base — the same way they leave the
 * real nose cone, heading aft to the servo can.
 */
function servoHarness() {
  const exitY = DECK_Y0 - 0.03;
  const j = at("switch-housing", 0, -9, 4);
  return [0, 1, 2, 3].map((i) => {
    const laneX = channelX(-0.3, 1) + (i - 1.5) * 0.008;
    return {
      colors: SERVO_LEAD,
      arch: 0.008,
      spread: 0.0072,
      points: [
        [j[0] + (i - 1.5) * 0.012, j[1], j[2]],
        [laneX * 0.7, DECK_Y0 + 0.02, B - 0.008],
        [laneX, exitY, B * 0.6],
      ],
    };
  });
}

export default function SledWiring() {
  const { selectedId, progressRef } = useInteraction();
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
    // As the sled separates into its three layers the cables can no longer be
    // where both ends are; ghost them back so the run is still legible as a
    // route without pretending it still reaches its pins.
    const spread = layerSpreadAt(progressRef.current) / LAYER_SPREAD;
    const target = hide ? 0 : 1 - spread * 0.88;
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
      <ZipTie position={L(-0.5, DECK_Z + 0.006)} rotation={[0, Math.PI / 2, 0]} w={0.016} />
      <ZipTie position={Rt(-0.44, DECK_Z + 0.006)} rotation={[0, Math.PI / 2, 0]} w={0.016} />
      <ZipTie position={[channelX(-0.36, -1), -0.36, -(DECK_Z + 0.008)]} rotation={[0, Math.PI / 2, 0]} w={0.016} />
      <ZipTie position={[channelX(-0.46, 1), -0.46, -(DECK_Z + 0.008)]} rotation={[0, Math.PI / 2, 0]} w={0.016} />
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
