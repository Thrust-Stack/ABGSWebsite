// The nine avionics boards, modelled from the real hardware.
//
// Reference note: these are built from geometry at each board's real published
// dimensions rather than imported from the model libraries the team linked
// (Sketchfab / CGTrader / GrabCAD). Those assets are individually licensed and
// would have to be redistributed with this repo; building them keeps the
// vehicle wholly ours, keeps the payload to kilobytes instead of megabytes, and
// lets every board share one lighting and interaction model. Dimensions come
// from the manufacturers' mechanical drawings; colours and layout are matched
// to the real parts.
//
// Everything below is in millimetres. `MM` converts to sled units at the point
// of assembly, so no number in this file is a magic scale factor.
import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { pcbMaps, boardGeometry, edgeMaterial } from "./pcb";
import { SLED_MM } from "../config";
import {
  PinHeader, Chip, Shield, Passive, Led, UsbAStack, Rj45, MicroHdmi, UsbC,
  MicroUsb, StemmaQt, TerminalBlock, CoinCell, AntennaTrace, finStackGeometry,
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

// ---- Raspberry Pi 5 — 85 x 56 mm ---------------------------------------
// Long axis on Y, GPIO on the +X edge, ports on the -Y edge.
const piSilk = (s, W, H, u) => {
  s.text("Raspberry Pi 5", W / 2 - 6 * u, H / 2 + 30 * u, 2.6 * u, -Math.PI / 2);
  s.each((c) => c.strokeRect(2 * u, 2 * u, W - 4 * u, H - 4 * u));
};

export function RaspberryPi5() {
  return (
    <group>
      <Pcb id="pi5" w={56} h={85} tone="green" seed={11} silk={piSilk} />

      {/* 40-pin GPIO header, 3.5 mm from the long edge */}
      <group position={[24.5, 13.6, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <PinHeader cols={20} rows={2} />
      </group>

      {/* Official Active Cooler: fan over the PMIC side, fins over the SoC */}
      <group position={[0, 8, TOP]}>
        <mesh position={[0, 0, 1]}>
          <boxGeometry args={[46, 30, 2]} />
          <meshStandardMaterial color="#1e2127" metalness={0.85} roughness={0.44} />
        </mesh>
        <mesh geometry={finStackGeometry(18, 24, 27, 9)} position={[9, 0, 2]}>
          <meshStandardMaterial color="#22262d" metalness={0.88} roughness={0.4} />
        </mesh>
        {/* fan housing + rotor */}
        <mesh position={[-13, 0, 5]}>
          <boxGeometry args={[18, 18, 6]} />
          <meshStandardMaterial color="#15181d" metalness={0.3} roughness={0.6} />
        </mesh>
        <mesh position={[-13, 0, 8.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[7.4, 7.4, 0.8, 20]} />
          <meshStandardMaterial color="#0c0e11" metalness={0.2} roughness={0.7} />
        </mesh>
        <mesh position={[-13, 0, 8.8]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.6, 2.6, 1.2, 14]} />
          <meshStandardMaterial color="#2a2f37" metalness={0.5} roughness={0.5} />
        </mesh>
      </group>

      {/* ports edge: Ethernet, then the two USB stacks */}
      <group position={[18, -35, TOP]}>
        <Rj45 />
      </group>
      <group position={[2, -37, TOP]}>
        <UsbAStack tone="#12305e" />
      </group>
      <group position={[-14, -37, TOP]}>
        <UsbAStack tone="#111318" />
      </group>

      {/* opposite long edge: USB-C power, 2x micro-HDMI */}
      <group position={[-27, 16, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <UsbC />
      </group>
      <group position={[-27.5, 2, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <MicroHdmi />
      </group>
      <group position={[-27.5, -12, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <MicroHdmi />
      </group>

      {/* PCIe FFC, camera/display FFCs, PoE header */}
      <group position={[16, -25, TOP]}>
        <Chip w={4} d={20} h={2.4} dimple={false} />
      </group>
      <group position={[-20, -24, TOP]}>
        <Chip w={2.6} d={17} h={2.2} dimple={false} />
      </group>
      <group position={[-20, -6, TOP]}>
        <Chip w={2.6} d={17} h={2.2} dimple={false} />
      </group>

      <group position={[-22, 32, TOP]}>
        <Passive w={6} d={5} h={1.6} color="#1a1d22" />
      </group>
      <group position={[20, 36, TOP]}>
        <Led color="#39d353" size={1.6} />
      </group>
      <group position={[20, 32, TOP]}>
        <Led color="#ff3b30" size={1.6} />
      </group>
    </group>
  );
}

// ---- ESP32 NodeMCU — 55 x 28 mm ----------------------------------------
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

      {/* the two 19-pin breakout rows */}
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

// ---- MPU6050 (GY-521) — 21.2 x 15.6 mm ---------------------------------
// The GY-521 really is violet; it is the one board on the sled that isn't
// black or green, and leaving it accurate is more honest than palette-matching.
const mpuSilk = (s, W, H, u) => {
  s.text("GY-521", W / 2, H - 3 * u, 2 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function Mpu6050() {
  return (
    <group>
      <Pcb id="mpu6050" w={21.2} h={15.6} tone="violet" seed={5} silk={mpuSilk} />
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

// ---- BMP585 (Adafruit breakout) — 25.5 x 17.5 mm -----------------------
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

// ---- Adafruit Ultimate GPS v3 — 25.5 x 35 mm ---------------------------
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

// ---- RFM95W LoRa breakout — 25.5 x 19 mm -------------------------------
const loraSilk = (s, W, H, u) => {
  s.text("RFM95W 915", W / 2, H - 3.5 * u, 1.9 * u);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function Rfm95w() {
  return (
    <group>
      <Pcb id="rfm95w" w={25.5} h={19} tone="black" seed={41} silk={loraSilk} />
      {/* the HopeRF module: its own substrate under a shield can */}
      <group position={[0, 2, TOP]}>
        <mesh position={[0, 0, 0.5]}>
          <boxGeometry args={[16, 16, 1]} />
          <meshStandardMaterial color="#101216" metalness={0} roughness={0.55} />
        </mesh>
        <group position={[0, 0, 1]}>
          <Shield w={15} d={15} h={2} />
        </group>
      </group>
      {/* u.FL antenna pad */}
      <group position={[10, 2, TOP]}>
        <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 1.2, 10]} />
          <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.34} />
        </mesh>
      </group>
      <group position={[0, -7.2, TOP]}>
        <PinHeader cols={9} rows={1} />
      </group>
    </group>
  );
}

// ---- PCA9685 16-channel servo driver — 25.4 x 62.5 mm ------------------
// The team's board is the blue variant, not Adafruit's black one (build photo
// IMG_9480), with screw terminals for the servo rail. The 16x3 header field is
// its signature, and it's what the canard servo harness lands on.
const pcaSilk = (s, W, H, u) => {
  s.text("PCA9685", W / 2 - 7.5 * u, H / 2, 2.2 * u, -Math.PI / 2);
  s.each((c) => c.strokeRect(1.5 * u, 1.5 * u, W - 3 * u, H - 3 * u));
};

export function Pca9685() {
  return (
    <group>
      <Pcb id="pca9685" w={25.4} h={62.5} tone="blue" seed={13} silk={pcaSilk} />
      {/* 16 channels x (PWM / V+ / GND) */}
      <group position={[6.5, 0, TOP]} rotation={[0, 0, Math.PI / 2]}>
        <PinHeader cols={16} rows={3} />
      </group>
      {/* V+ screw terminal */}
      <group position={[-4, 26, TOP]}>
        <TerminalBlock ways={2} color="#1d3f7a" />
      </group>
      {/* driver IC */}
      <group position={[-6, 4, TOP]}>
        <Chip w={5} d={9.7} h={1.2} />
      </group>
      {/* I2C in / chain out */}
      <group position={[-6, -26, TOP]}>
        <PinHeader cols={6} rows={1} />
      </group>
      <group position={[-9, 14, TOP]}>
        <Passive w={3} d={1.6} h={0.8} />
      </group>
    </group>
  );
}

// ---- 5 V BEC / UBEC — 43 x 17 mm ---------------------------------------
// A small blue regulator board sleeved in clear heatshrink, as in IMG_9480 —
// the shrink is why it reads as a glossy lozenge rather than a bare PCB.
const becSilk = (s, W, H, u) => {
  s.text("5V 5A UBEC", W / 2, H - 3 * u, 1.9 * u);
};

export function Ubec() {
  return (
    <group>
      <Pcb id="bec" w={43} h={17} tone="blue" seed={29} silk={becSilk} />
      {/* shielded inductor — the visual tell of a switching regulator */}
      <group position={[2, 1, TOP]}>
        <mesh position={[0, 0, 2.5]}>
          <boxGeometry args={[7, 7, 5]} />
          <meshStandardMaterial color="#14171c" metalness={0.25} roughness={0.62} />
        </mesh>
      </group>
      {/* output electrolytic */}
      <group position={[-9, 0, TOP]}>
        <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[3, 3, 7, 18]} />
          <meshStandardMaterial color="#1b2942" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 7.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2.9, 2.9, 0.3, 18]} />
          <meshStandardMaterial color="#8f959d" metalness={0.9} roughness={0.45} />
        </mesh>
      </group>
      <group position={[13, 0, TOP]}>
        <Chip w={4} d={5} h={1.1} />
      </group>
      {/* Clear heatshrink sleeve. A real transmissive material re-renders the
          whole scene to a buffer every frame for this one small part; a plain
          transparent glossy shell is visually indistinguishable on a sleeve
          this size and costs nothing. */}
      <mesh position={[0, 0, 3.4]}>
        <boxGeometry args={[45, 19, 11]} />
        <meshStandardMaterial
          color="#aeb8c6"
          roughness={0.22}
          metalness={0}
          transparent
          opacity={0.28}
        />
      </mesh>
    </group>
  );
}

// ---- 2S LiPo pack -------------------------------------------------------
// Foil pouch with a printed wrap; leads exit the +Y end toward the BEC.
export function LipoPack({ w = 35, l = 72, t = 18 }) {
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
        <meshStandardMaterial color="#ff6a2c" metalness={0.1} roughness={0.6} />
      </mesh>
      {/* balance connector */}
      <mesh position={[10, l / 2 + 2.5, t / 2]}>
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
