// The avionics hardware, modelled from the real build.
//
// Reference note: these are built from geometry at each part's real published
// dimensions rather than imported from the model libraries the team linked
// (Sketchfab / CGTrader / GrabCAD). Those assets are individually licensed and
// would have to be redistributed with this repo; building them keeps the
// vehicle wholly ours, keeps the payload to kilobytes instead of megabytes, and
// lets every part share one lighting and interaction model. Dimensions come
// from the manufacturers' mechanical drawings; colours and layout are matched
// to the team's build photos in public/components.
//
// Everything below is in millimetres. `MM` converts to sled units at the point
// of assembly, so no number in this file is a magic scale factor.
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pcbMaps, perfMaps, boardGeometry, edgeMaterial } from "./pcb";
import { SLED_MM } from "../config";
import { PERF_MAIN, PERF_FWD, PERF_FWD_LOCAL_Y, PERF_T } from "./layout";
import {
  PinHeader, Chip, Shield, Passive, Led, UsbC, MicroUsb, StemmaQt,
  TerminalBlock, CoinCell, AntennaTrace,
} from "./primitives";

export const MM = SLED_MM; // mm -> sled units

// A finished PCB blank: generated maps on the faces, raw FR4 on the routed edge.
function Pcb({ id, w, h, tone, seed = 7, silk, t = 1.6 }) {
  const maps = useMemo(
    () => pcbMaps({ key: id, wmm: w, hmm: h, tone, seed, silk }),
    [id, w, h, tone, seed, silk]
  );
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        map: maps.map,
        roughnessMap: maps.roughnessMap,
        metalnessMap: maps.metalnessMap,
        metalness: 1, // maps drive these fully
        roughness: 1,
      }),
      edgeMaterial(maps.edge),
    ],
    [maps]
  );
  return <mesh geometry={boardGeometry(w, h, t)} material={mats} />;
}

const TOP = 0.8; // board half-thickness — the component-side surface

// ---- the perfboard -----------------------------------------------------
//
// Two soldered segments carrying every avionics module on the front of the
// sled. Sizes come from layout.js, which derives them from the nose cone
// taper, so the board rendered here is the board the modules were placed on.

/** One bare perfboard segment: tan FR4 on a 2.54 mm grid of tinned pads. */
function PerfSegment({ id, w, h }) {
  const maps = useMemo(() => perfMaps({ key: id, wmm: w, hmm: h }), [id, w, h]);
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({
        map: maps.map,
        roughnessMap: maps.roughnessMap,
        metalnessMap: maps.metalnessMap,
        metalness: 1,
        roughness: 1,
      }),
      edgeMaterial(maps.edge),
    ],
    [maps]
  );
  return <mesh geometry={boardGeometry(w, h, PERF_T, 1.0)} material={mats} />;
}

/**
 * The solder side.
 *
 * This is the face that turns in toward the sled deck, and it is the reason
 * the build is one rigid assembly rather than a stack of jumper leads — so it
 * has to be visible when the board is pulled out and turned over, not implied.
 *
 * Built as two merged geometries (one for the solder joints, one for the wire
 * runs) so the whole face costs two draw calls. The runs follow the column the
 * modules sit in: bus lines down the board with short hops between adjacent
 * footprints, which is what the point-to-point wiring in perfboard-solder.jpg looks like.
 */
function solderSideGeometry() {
  const P = 2.54;
  const cols = Math.floor((PERF_MAIN.w - 1.6) / P);
  const rows = Math.floor((PERF_MAIN.h - 1.6) / P);
  const gx = (c) => (c - (cols - 1) / 2) * P;
  const gy = (r) => (r - (rows - 1) / 2) * P;

  // Joints sit under every module footprint's header rows.
  const jointGeo = new THREE.SphereGeometry(0.62, 6, 5);
  const joints = [];
  const addJoint = (x, y) => {
    const g = jointGeo.clone();
    g.scale(1, 1, 0.62);
    g.translate(x, y, -0.2);
    joints.push(g);
  };

  // Wire runs, in board-local mm, as [x, y] polylines down the two bus columns
  // and across to each footprint.
  const runs = [];
  const addRun = (pts, depth) => {
    const v = pts.map(([x, y]) => new THREE.Vector3(x, y, -depth));
    const curve = new THREE.CatmullRomCurve3(v, false, "centripetal", 0.4);
    runs.push(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 5), 0.42, 5, false));
  };

  const leftX = gx(1);
  const rightX = gx(cols - 2);
  // The two power/bus rails that run the length of the board.
  addRun([[leftX, gy(1)], [leftX, gy(rows - 2)]], 1.1);
  addRun([[rightX, gy(1)], [rightX, gy(rows - 2)]], 1.1);

  // Module footprints: header rows to solder, and a hop out to each rail.
  const foot = [
    { y: 56, half: 24, w: 12.7 }, // Heltec
    { y: 0.5, half: 26, w: 12.7 }, // Main ESP32
    { y: -37.5, half: 7, w: 8 }, // BMP585
    { y: -65.5, half: 15, w: 10 }, // GPS
  ];
  for (const f of foot) {
    for (const sx of [-f.w, f.w]) {
      for (let i = -f.half; i <= f.half; i += P * 2) addJoint(sx, f.y + i);
    }
    addRun([[-f.w, f.y + f.half * 0.6], [leftX, f.y + f.half * 0.6]], 1.6);
    addRun([[f.w, f.y - f.half * 0.6], [rightX, f.y - f.half * 0.6]], 1.6);
    // The signal hop between this footprint and the next one down the column.
    addRun(
      [
        [-f.w + 2, f.y - f.half],
        [-f.w + 6, f.y - f.half - 8],
        [f.w - 6, f.y - f.half - 14],
      ],
      2.0
    );
  }

  const solder = mergeGeometries(joints, false);
  joints.forEach((g) => g.dispose());
  jointGeo.dispose();
  const wire = mergeGeometries(runs, false);
  runs.forEach((g) => g.dispose());
  return { solder, wire };
}

export function Perfboard() {
  const { solder, wire } = useMemo(() => solderSideGeometry(), []);
  return (
    <group>
      {/* main segment: Heltec, Main ESP32, altimeter, GPS */}
      <PerfSegment id="perf-main" w={PERF_MAIN.w} h={PERF_MAIN.h} />
      {/* forward segment: microSD reader with the IMU raised over it */}
      <group position={[0, PERF_FWD_LOCAL_Y, 0]}>
        <PerfSegment id="perf-fwd" w={PERF_FWD.w} h={PERF_FWD.h} />
      </group>

      {/* solder side — faces the deck when mounted, visible when turned over */}
      <group position={[0, 0, -PERF_T / 2]}>
        <mesh geometry={solder}>
          <meshStandardMaterial color="#b6bcc4" metalness={0.92} roughness={0.28} />
        </mesh>
        <mesh geometry={wire}>
          <meshStandardMaterial color="#1a1d22" metalness={0.05} roughness={0.42} />
        </mesh>
      </group>

      {/* nylon standoffs at the four corners of the main segment */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <mesh
            key={`${sx}${sy}`}
            position={[sx * (PERF_MAIN.w / 2 - 3), sy * (PERF_MAIN.h / 2 - 3), -2.3]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[1.5, 1.5, 3, 10]} />
            <meshStandardMaterial color="#15181d" metalness={0.1} roughness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

// ---- Main ESP32 (NodeMCU-style dev board) — 55 x 28 mm -----------------
const espSilk = (s, W, H, u) => {
  s.text("ESP32", W / 2, H - 4.5 * u, 2.4 * u);
  s.each((c) => c.strokeRect(4 * u, 1.5 * u, W - 8 * u, 27 * u));
};

export function Esp32() {
  return (
    <group>
      <Pcb id="esp32" w={28} h={55} tone="black" seed={23} silk={espSilk} />

      {/* ESP32-WROOM-32 module: own substrate, shield, exposed antenna trace */}
      <group position={[0, 14, TOP]}>
        <mesh position={[0, 0, 0.4]}>
          <boxGeometry args={[18, 25.5, 0.8]} />
          <meshStandardMaterial color="#101216" metalness={0} roughness={0.55} />
        </mesh>
        <group position={[0, -3.4, 0.8]}>
          <Shield w={15.8} d={18.4} h={2.6} />
        </group>
        <group position={[0, 9.2, 0.8]}>
          <AntennaTrace w={14} d={5} />
        </group>
      </group>

      {/* USB-UART bridge + micro-USB + EN/BOOT buttons */}
      <group position={[0, -6, TOP]}>
        <Chip w={5} d={5} h={1} />
      </group>
      <group position={[0, -25.4, TOP]}>
        <MicroUsb />
      </group>
      {[-9, 9].map((x) => (
        <group key={x} position={[x, -20, TOP]}>
          <mesh position={[0, 0, 1.6]}>
            <boxGeometry args={[6, 6, 3.2]} />
            <meshStandardMaterial color="#15181d" metalness={0.1} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 3.5]}>
            <boxGeometry args={[3.4, 3.4, 0.8]} />
            <meshStandardMaterial color="#2f343c" metalness={0.2} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* the two 19-pin breakout rows — the servo leads leave from the right */}
      {[-12.7, 12.7].map((x) => (
        <group key={x} position={[x, 0, TOP]} rotation={[0, 0, Math.PI / 2]}>
          <PinHeader cols={19} rows={1} />
        </group>
      ))}

      <group position={[6, -13, TOP]}>
        <Led color="#ff3b30" size={1.4} />
      </group>
      <group position={[-6, -13, TOP]}>
        <Led color="#3b82f6" size={1.4} />
      </group>
    </group>
  );
}

// ---- Heltec ESP32 telemetry transmitter — 50.2 x 25.5 mm ---------------
// An ESP32 module with the LoRa radio and its antenna connector on the same
// board, plus the small OLED at the forward end that identifies it on sight.
const heltecSilk = (s, W, H, u) => {
  s.text("HELTEC LoRa", W / 2, H - 3.2 * u, 1.9 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function HeltecEsp32() {
  return (
    <group>
      <Pcb id="heltec" w={25.5} h={50.2} tone="black" seed={37} silk={heltecSilk} />

      {/* SoC under its shield can */}
      <group position={[0, 6, TOP]}>
        <mesh position={[0, 0, 0.4]}>
          <boxGeometry args={[17, 17.5, 0.8]} />
          <meshStandardMaterial color="#101216" metalness={0} roughness={0.55} />
        </mesh>
        <group position={[0, -1.5, 0.8]}>
          <Shield w={15} d={13} h={2.4} />
        </group>
        <group position={[0, 6.6, 0.8]}>
          <AntennaTrace w={12} d={4} />
        </group>
      </group>

      {/* 0.96" OLED at the forward end — glass over a black carrier */}
      <group position={[0, 19.5, TOP]}>
        <mesh position={[0, 0, 1.1]}>
          <boxGeometry args={[22, 11, 2.2]} />
          <meshStandardMaterial color="#0a0c0f" metalness={0.1} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.6, 2.25]}>
          <boxGeometry args={[19.6, 8.2, 0.2]} />
          <meshStandardMaterial
            color="#0d1014"
            metalness={0.35}
            roughness={0.14}
            emissive="#12324a"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>

      {/* LoRa transceiver + u.FL antenna connector */}
      <group position={[-6.5, -6, TOP]}>
        <Chip w={5.5} d={5.5} h={1.1} />
      </group>
      <group position={[8.6, -8, TOP]}>
        <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.4, 1.4, 1.4, 10]} />
          <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.34} />
        </mesh>
      </group>

      {/* USB-C at the aft end */}
      <group position={[0, -24, TOP]}>
        <UsbC />
      </group>

      {/* breakout rows */}
      {[-11.4, 11.4].map((x) => (
        <group key={x} position={[x, -2, TOP]} rotation={[0, 0, Math.PI / 2]}>
          <PinHeader cols={18} rows={1} />
        </group>
      ))}

      <group position={[-6.5, -15, TOP]}>
        <Led color="#12e29a" size={1.3} />
      </group>
    </group>
  );
}

// ---- MPU6500 IMU (GY-6500 breakout) — 21.2 x 15.6 mm -------------------
// The GY breakout really is violet; it is the one board on the sled that isn't
// black or tan, and leaving it accurate is more honest than palette-matching.
const mpuSilk = (s, W, H, u) => {
  s.text("GY-6500", W / 2, H - 3 * u, 1.9 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function Mpu6500({ raised = 0 }) {
  return (
    <group>
      {/* On the sled this board is stood off over the microSD reader on its own
          header, so it needs the pins that hold it there — without them it
          reads as floating rather than mounted. `raised` is the standoff height
          in mm, and is 0 anywhere the board is shown on its own. */}
      {raised > 0 &&
        [-7.5, 7.5].map((x) => (
          <group key={x} position={[x, -6.3, -raised / 2 - 0.8]}>
            <mesh>
              <boxGeometry args={[1.5, 12, raised]} />
              <meshStandardMaterial color="#0d0f13" metalness={0.2} roughness={0.55} />
            </mesh>
          </group>
        ))}
      <Pcb id="mpu6500" w={21.2} h={15.6} tone="violet" seed={5} silk={mpuSilk} />
      <group position={[0, 1.5, TOP]}>
        <Chip w={4} d={4} h={0.9} />
      </group>
      <group position={[0, -6.3, TOP]}>
        <PinHeader cols={8} rows={1} />
      </group>
      <group position={[7, 3, TOP]}>
        <Passive w={1.6} d={0.8} h={0.5} />
      </group>
      <group position={[-7, 3, TOP]}>
        <Passive w={1.6} d={0.8} h={0.5} />
      </group>
      <group position={[-7, 5.5, TOP]}>
        <Led color="#ff3b30" size={1.2} />
      </group>
    </group>
  );
}

// ---- BMP585 barometric altimeter (Adafruit breakout) — 25.5 x 17.5 mm --
const bmpSilk = (s, W, H, u) => {
  s.text("BMP585", W / 2, 4 * u, 2.2 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function Bmp585() {
  return (
    <group>
      <Pcb id="bmp585" w={25.5} h={17.5} tone="black" seed={31} silk={bmpSilk} />
      {/* STEMMA QT on both short ends */}
      <group position={[-10.6, 0, TOP]} rotation={[0, 0, -Math.PI / 2]}>
        <StemmaQt />
      </group>
      <group position={[10.6, 0, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <StemmaQt />
      </group>
      {/* the sensor itself — a 2 mm metal-lid package */}
      <group position={[0, 1.5, TOP]}>
        <mesh position={[0, 0, 0.5]}>
          <boxGeometry args={[2.2, 2.2, 1]} />
          <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.36} />
        </mesh>
      </group>
      <group position={[0, -6.4, TOP]}>
        <PinHeader cols={7} rows={1} />
      </group>
      <group position={[6, 4, TOP]}>
        <Led color="#39d353" size={1.2} />
      </group>
    </group>
  );
}

// ---- GPS module (Adafruit Ultimate GPS v3) — 25.5 x 35 mm --------------
const gpsSilk = (s, W, H, u) => {
  s.text("ULTIMATE GPS", W / 2, H - 8.5 * u, 1.9 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function UltimateGps() {
  return (
    <group>
      <Pcb id="gps" w={25.5} h={35} tone="black" seed={17} silk={gpsSilk} />
      {/* ceramic patch antenna */}
      <group position={[0, 7, TOP]}>
        <mesh position={[0, 0, 2]}>
          <boxGeometry args={[15, 15, 4]} />
          <meshStandardMaterial color="#cfd4d9" metalness={0} roughness={0.66} />
        </mesh>
        <mesh position={[0, 0, 4.1]}>
          <boxGeometry args={[13.4, 13.4, 0.3]} />
          <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.3} />
        </mesh>
      </group>
      {/* CR1220 backup cell */}
      <group position={[0, -6, TOP]}>
        <CoinCell />
      </group>
      <group position={[9, -11, TOP]}>
        <Led color="#ff3b30" size={1.4} />
      </group>
      <group position={[0, -15.6, TOP]}>
        <PinHeader cols={9} rows={1} />
      </group>
    </group>
  );
}

// ---- Adafruit MicroSD card reader — 23 x 43 mm -------------------------
// The 5 V-ready breakout: level shifter on the aft half, the card socket
// forward, and the header row down the long edge that lands on the perfboard.
const sdSilk = (s, W, H, u) => {
  s.text("MICRO-SD", W / 2, 5 * u, 2.0 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function MicroSdReader() {
  return (
    <group>
      <Pcb id="microsd" w={23} h={43} tone="blue" seed={19} silk={sdSilk} />

      {/* the card socket — a steel shell with the card slot on the forward end */}
      <group position={[1, 10, TOP]}>
        <mesh position={[0, 0, 1.4]}>
          <boxGeometry args={[15, 17, 2.8]} />
          <meshStandardMaterial color="#b3b9c1" metalness={0.95} roughness={0.34} />
        </mesh>
        {/* the exposed card, sitting proud of the slot */}
        <mesh position={[0, 9.4, 1.3]}>
          <boxGeometry args={[11, 4.4, 1]} />
          <meshStandardMaterial color="#1d2a1f" metalness={0.1} roughness={0.62} />
        </mesh>
        <mesh position={[6.2, -8.6, 0.5]}>
          <boxGeometry args={[1.6, 1.6, 1]} />
          <meshStandardMaterial color="#2a2f37" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>

      {/* level shifter + regulator */}
      <group position={[-2, -8, TOP]}>
        <Chip w={5} d={9.7} h={1.2} />
      </group>
      <group position={[5.5, -15, TOP]}>
        <Passive w={3} d={1.6} h={0.9} color="#22262e" />
      </group>
      <group position={[-3, -17, TOP]}>
        <Led color="#39d353" size={1.3} />
      </group>

      {/* the 8-way header down the long edge */}
      <group position={[-9.4, -4, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <PinHeader cols={8} rows={1} />
      </group>
    </group>
  );
}

// ---- step-down converter — 25 x 16 mm ----------------------------------
// A small switching buck module. Two of these ride the back of the sled, one
// per power system; `tone` distinguishes the electronics one from the servo
// one without inventing a difference in the hardware itself.
const buckSilk = (s, W, H, u) => {
  s.text("STEP-DOWN", W / 2, H - 3 * u, 1.7 * u);
};

export function StepDown({ id = "buck", tone = "blue" }) {
  return (
    <group>
      <Pcb id={id} w={25} h={16} tone={tone} seed={29} silk={buckSilk} />
      {/* shielded inductor — the visual tell of a switching regulator */}
      <group position={[3, 0, TOP]}>
        <mesh position={[0, 0, 2.5]}>
          <boxGeometry args={[7, 7, 5]} />
          <meshStandardMaterial color="#14171c" metalness={0.25} roughness={0.62} />
        </mesh>
      </group>
      {/* input and output electrolytics */}
      {[-8.5, 9].map((x, i) => (
        <group key={x} position={[x, 0, TOP]}>
          <mesh position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.7, 2.7, 6.4, 16]} />
            <meshStandardMaterial color="#1b2942" metalness={0.35} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 6.5]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[2.6, 2.6, 0.3, 16]} />
            <meshStandardMaterial color="#8f959d" metalness={0.9} roughness={0.45} />
          </mesh>
          {i === 0 && <Led color="#ff3b30" size={1.1} />}
        </group>
      ))}
      {/* switching IC */}
      <group position={[-2, -5, TOP]}>
        <Chip w={4} d={5} h={1.1} />
      </group>
      {/* input / output screw terminals */}
      <group position={[-10, 5.5, TOP]}>
        <TerminalBlock ways={2} color="#1d3f7a" />
      </group>
    </group>
  );
}

// ---- switch housing — 44 x 20 mm ---------------------------------------
// The printed block at the base of the sled. Both step-down converters land on
// its terminal strip and each power system gets its own arming switch, reachable
// from outside the airframe with the vehicle on the pad.
export function SwitchHousing({ w = 44, h = 20, t = 12 }) {
  return (
    <group>
      <RoundedBox args={[w, h, t]} radius={1.4} smoothness={3} position={[0, 0, t / 2]}>
        <meshStandardMaterial color="#16191f" metalness={0.05} roughness={0.66} />
      </RoundedBox>

      {/* two arming switches: bezel, toggle bat, and its throw */}
      {[-10, 10].map((x, i) => (
        <group key={x} position={[x, 1, t]}>
          <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[3.6, 3.6, 1.2, 16]} />
            <meshStandardMaterial color="#8f959d" metalness={0.92} roughness={0.34} />
          </mesh>
          <mesh
            position={[0, i === 0 ? 1.1 : -1.1, 2.6]}
            rotation={[i === 0 ? 0.5 : -0.5, 0, 0]}
          >
            <cylinderGeometry args={[0.9, 1.2, 4.4, 10]} />
            <meshStandardMaterial color="#c3c9d1" metalness={1} roughness={0.3} />
          </mesh>
          <Led
            color={i === 0 ? "#12e29a" : "#ff6a2c"}
            size={1.2}
            intensity={1.8}
          />
        </group>
      ))}

      {/* the terminal strip both converters land on */}
      <group position={[0, -6.5, t]} rotation={[0, 0, Math.PI / 2]}>
        <TerminalBlock ways={4} color="#1a1d22" />
      </group>
    </group>
  );
}

// ---- 2S LiPo pack -------------------------------------------------------
// Foil pouch with a printed wrap; leads exit the +Y end toward its converter.
// Two of these ride the back of the sled at different sizes — the electronics
// pack and the larger servo pack.
export function LipoPack({ w = 35, l = 72, t = 18, accent = "#ff6a2c" }) {
  return (
    <group>
      <RoundedBox args={[w, l, t]} radius={2.2} smoothness={3} position={[0, 0, t / 2]}>
        <meshStandardMaterial color="#8d939c" metalness={0.72} roughness={0.38} />
      </RoundedBox>
      {/* printed label wrap */}
      <mesh position={[0, -4, t / 2]}>
        <boxGeometry args={[w + 0.4, l * 0.52, t + 0.4]} />
        <meshStandardMaterial color="#14171c" metalness={0.15} roughness={0.62} />
      </mesh>
      <mesh position={[0, -4, t + 0.3]}>
        <boxGeometry args={[w * 0.62, 5, 0.2]} />
        <meshStandardMaterial color={accent} metalness={0.1} roughness={0.6} />
      </mesh>
      {/* balance connector */}
      <mesh position={[w * 0.28, l / 2 + 2.5, t / 2]}>
        <boxGeometry args={[7.5, 5, 5.5]} />
        <meshStandardMaterial color="#e9e9e3" metalness={0} roughness={0.48} />
      </mesh>
    </group>
  );
}

// ---- BlueBird BMS-127WV+ canard servo -----------------------------------
// 23 x 12 x 25.4 mm digital HV servo: black case, alloy top plate, spline horn.
export function Servo({ hornRef }) {
  return (
    <group>
      {/* case */}
      <mesh position={[0, 0, 12]}>
        <boxGeometry args={[12, 23, 24]} />
        <meshStandardMaterial color="#101216" metalness={0.1} roughness={0.55} />
      </mesh>
      {/* mounting tabs */}
      <mesh position={[0, 0, 19]}>
        <boxGeometry args={[12, 32, 2.4]} />
        <meshStandardMaterial color="#101216" metalness={0.1} roughness={0.55} />
      </mesh>
      {/* alloy gear-case top */}
      <mesh position={[0, 0, 24.6]}>
        <boxGeometry args={[12, 23, 3]} />
        <meshStandardMaterial color="#9aa1ab" metalness={0.95} roughness={0.36} />
      </mesh>
      {/* blue label */}
      <mesh position={[6.1, 0, 10]}>
        <boxGeometry args={[0.2, 18, 12]} />
        <meshStandardMaterial color="#1f4f9e" metalness={0.1} roughness={0.5} />
      </mesh>
      {/* output spline + horn */}
      <mesh position={[0, 5.8, 26.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 3, 14]} />
        <meshStandardMaterial color="#c3c9d1" metalness={1} roughness={0.32} />
      </mesh>
      <group ref={hornRef} position={[0, 5.8, 27.6]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3, 16, 1.6]} />
          <meshStandardMaterial color="#d7dbe0" metalness={0.5} roughness={0.42} />
        </mesh>
      </group>
    </group>
  );
}
