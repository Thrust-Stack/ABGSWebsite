// Shared board hardware. Everything here is modelled in millimetres at real
// published dimensions; the boards that use these are scaled to sled units in
// one place (MM in boards.jsx), so the numbers below can be read straight off a
// datasheet or a pair of calipers.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---- shared materials -------------------------------------------------
// One instance each: fewer materials means fewer shader programs, and the
// hover fade in InteractivePart clones per-part anyway.
export const M = {
  blackPlastic: () => new THREE.MeshStandardMaterial({ color: "#0d0f13", metalness: 0.0, roughness: 0.62 }),
  darkPlastic: () => new THREE.MeshStandardMaterial({ color: "#1a1d22", metalness: 0.05, roughness: 0.55 }),
  whitePlastic: () => new THREE.MeshStandardMaterial({ color: "#e9e9e3", metalness: 0.0, roughness: 0.48 }),
  gold: () => new THREE.MeshStandardMaterial({ color: "#c9a227", metalness: 1.0, roughness: 0.26 }),
  tin: () => new THREE.MeshStandardMaterial({ color: "#b9c0c9", metalness: 1.0, roughness: 0.3 }),
  shield: () => new THREE.MeshStandardMaterial({ color: "#a8afb9", metalness: 1.0, roughness: 0.42 }),
  anodized: () => new THREE.MeshStandardMaterial({ color: "#1e2127", metalness: 0.85, roughness: 0.44 }),
  epoxy: () => new THREE.MeshStandardMaterial({ color: "#121418", metalness: 0.0, roughness: 0.5 }),
  ceramic: () => new THREE.MeshStandardMaterial({ color: "#cfd4d9", metalness: 0.0, roughness: 0.66 }),
};

/**
 * Invisible-but-raycastable volume, so a 21 mm sensor at true scale is still
 * comfortable to click. Excluded from the hover fade via noPartFade.
 */
export function HitBox({ args, position = [0, 0, 0] }) {
  return (
    <mesh position={position} userData={{ noPartFade: true }}>
      <boxGeometry args={args} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  );
}

// ---- pin headers ------------------------------------------------------
const pinCache = new Map();

/**
 * Merged pin field: `cols` × `rows` square pins on `pitch` centres.
 * One geometry, one draw call — a Pi 5's 40-pin header is 40 boxes otherwise.
 */
export function pinFieldGeometry(cols, rows, pitch = 2.54, len = 6, thick = 0.64) {
  const key = `${cols}:${rows}:${pitch}:${len}:${thick}`;
  const hit = pinCache.get(key);
  if (hit) return hit;
  const parts = [];
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const g = new THREE.BoxGeometry(thick, thick, len);
      g.translate((i - (cols - 1) / 2) * pitch, (j - (rows - 1) / 2) * pitch, len / 2);
      parts.push(g);
    }
  }
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  pinCache.set(key, merged);
  return merged;
}

/**
 * A 2.54 mm header: black plastic base with gold pins standing out of it.
 * Origin at the board surface; pins run +z.
 */
export function PinHeader({ cols, rows = 1, pitch = 2.54, baseH = 2.5, pinLen = 6, color = "#0d0f13" }) {
  const w = cols * pitch;
  const d = rows * pitch;
  return (
    <group>
      <mesh position={[0, 0, baseH / 2]}>
        <boxGeometry args={[w, d, baseH]} />
        <meshStandardMaterial color={color} metalness={0} roughness={0.62} />
      </mesh>
      <mesh geometry={pinFieldGeometry(cols, rows, pitch, pinLen)} position={[0, 0, baseH - 0.6]}>
        <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.26} />
      </mesh>
    </group>
  );
}

// ---- chips ------------------------------------------------------------

/** Black epoxy package with a chamfer and a pin-1 dimple. */
export function Chip({ w, d, h = 1.0, dimple = true }) {
  return (
    <group>
      <mesh position={[0, 0, h / 2]}>
        <boxGeometry args={[w, d, h]} />
        <meshStandardMaterial color="#121418" metalness={0} roughness={0.48} />
      </mesh>
      {dimple && (
        <mesh position={[-w / 2 + w * 0.16, -d / 2 + d * 0.16, h]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Math.min(w, d) * 0.08, Math.min(w, d) * 0.08, 0.12, 10]} />
          <meshStandardMaterial color="#0a0b0e" metalness={0} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

/** Stamped RF shield — the brushed can over an ESP32 or radio module. */
export function Shield({ w, d, h = 1.0 }) {
  return (
    <mesh position={[0, 0, h / 2]}>
      <boxGeometry args={[w, d, h]} />
      <meshStandardMaterial color="#a8afb9" metalness={1} roughness={0.42} />
    </mesh>
  );
}

/** Surface-mount passive (0805-ish). */
export function Passive({ w = 2, d = 1.25, h = 0.6, color = "#2b2f36" }) {
  return (
    <mesh position={[0, 0, h / 2]}>
      <boxGeometry args={[w, d, h]} />
      <meshStandardMaterial color={color} metalness={0.1} roughness={0.55} />
    </mesh>
  );
}

/** Indicator LED. Emissive so the bloom pass picks it out. */
export function Led({ color = "#ff3b30", size = 1.6, intensity = 2.4 }) {
  return (
    <mesh position={[0, 0, 0.4]} userData={{ noPartFade: true }}>
      <boxGeometry args={[size, size * 0.7, 0.8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        metalness={0}
        roughness={0.35}
      />
    </mesh>
  );
}

// ---- connectors -------------------------------------------------------

/** Shielded connector shell (USB-A, RJ45, HDMI all share this construction). */
function Shell({ w, d, h, color = "#b9c0c9", mouth, mouthColor = "#0b0c0f" }) {
  return (
    <group>
      <mesh position={[0, 0, h / 2]}>
        <boxGeometry args={[w, d, h]} />
        <meshStandardMaterial color={color} metalness={1} roughness={0.32} />
      </mesh>
      {mouth && (
        <mesh position={[0, -d / 2 - 0.01, h / 2]}>
          <boxGeometry args={[mouth[0], 0.6, mouth[1]]} />
          <meshStandardMaterial color={mouthColor} metalness={0.2} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** Stacked USB-A pair. `tone` colours the insulator — blue for USB 3.0. */
export function UsbAStack({ tone = "#12305e" }) {
  return (
    <group>
      <Shell w={13.2} d={17} h={15.6} />
      <mesh position={[0, -8.6, 4.2]}>
        <boxGeometry args={[10.5, 0.8, 4.4]} />
        <meshStandardMaterial color={tone} metalness={0.15} roughness={0.55} />
      </mesh>
      <mesh position={[0, -8.6, 11.4]}>
        <boxGeometry args={[10.5, 0.8, 4.4]} />
        <meshStandardMaterial color={tone} metalness={0.15} roughness={0.55} />
      </mesh>
    </group>
  );
}

export function Rj45() {
  return (
    <group>
      <Shell w={15.9} d={21} h={13.5} mouth={[11.5, 9]} />
      <mesh position={[-4.4, -10.4, 11.5]}>
        <boxGeometry args={[1.6, 0.6, 1.2]} />
        <meshStandardMaterial color="#f0a020" emissive="#f0a020" emissiveIntensity={1.4} roughness={0.4} />
      </mesh>
      <mesh position={[4.4, -10.4, 11.5]}>
        <boxGeometry args={[1.6, 0.6, 1.2]} />
        <meshStandardMaterial color="#39d353" emissive="#39d353" emissiveIntensity={1.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function MicroHdmi() {
  return <Shell w={7.6} d={8} h={3.2} mouth={[6.2, 2]} />;
}

export function UsbC() {
  return (
    <group>
      <mesh position={[0, 0, 1.6]}>
        <boxGeometry args={[9, 7.4, 3.2]} />
        <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, -3.8, 1.6]}>
        <boxGeometry args={[6.8, 0.5, 1.2]} />
        <meshStandardMaterial color="#0b0c0f" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function MicroUsb() {
  return (
    <group>
      <mesh position={[0, 0, 1.35]}>
        <boxGeometry args={[8, 5.9, 2.7]} />
        <meshStandardMaterial color="#b9c0c9" metalness={1} roughness={0.3} />
      </mesh>
      <mesh position={[0, -3.05, 1.35]}>
        <boxGeometry args={[6.4, 0.5, 1.1]} />
        <meshStandardMaterial color="#0b0c0f" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** JST-SH 4-pin — Adafruit's STEMMA QT socket, the white one on every breakout. */
export function StemmaQt() {
  return (
    <group>
      <mesh position={[0, 0, 1.5]}>
        <boxGeometry args={[6.2, 4.2, 3.0]} />
        <meshStandardMaterial color="#e9e9e3" metalness={0} roughness={0.48} />
      </mesh>
      <mesh position={[0, -2.2, 1.5]}>
        <boxGeometry args={[4.6, 0.5, 1.8]} />
        <meshStandardMaterial color="#0b0c0f" metalness={0.2} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Screw terminal block — the PCA9685's V+ input. */
export function TerminalBlock({ ways = 2, color = "#1f4f9e" }) {
  const pitch = 5.08;
  return (
    <group>
      <mesh position={[0, 0, 4]}>
        <boxGeometry args={[ways * pitch, 7.4, 8]} />
        <meshStandardMaterial color={color} metalness={0} roughness={0.5} />
      </mesh>
      {Array.from({ length: ways }, (_, i) => (
        <mesh key={i} position={[(i - (ways - 1) / 2) * pitch, 1.2, 8.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 0.9, 12]} />
          <meshStandardMaterial color="#c3c9d1" metalness={1} roughness={0.34} />
        </mesh>
      ))}
    </group>
  );
}

/** CR1220 coin cell holder — the GPS module's ephemeris backup. */
export function CoinCell() {
  return (
    <group>
      <mesh position={[0, 0, 1.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6.2, 6.2, 3.2, 24]} />
        <meshStandardMaterial color="#c8ced6" metalness={1} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 3.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[5.4, 5.4, 0.3, 24]} />
        <meshStandardMaterial color="#8f959d" metalness={0.9} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Meandered inverted-F antenna trace — the ESP32 module's giveaway detail. */
export function AntennaTrace({ w = 14, d = 6 }) {
  const pts = [];
  const legs = 6;
  for (let i = 0; i < legs; i++) {
    const x = -w / 2 + (i / (legs - 1)) * w;
    pts.push([x, i % 2 === 0 ? -d / 2 : d / 2]);
    if (i < legs - 1) pts.push([x, i % 2 === 0 ? d / 2 : -d / 2]);
  }
  return (
    <group>
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const mx = (p[0] + q[0]) / 2;
        const my = (p[1] + q[1]) / 2;
        const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
        const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
        return (
          <mesh key={i} position={[mx, my, 0.06]} rotation={[0, 0, ang]}>
            <boxGeometry args={[len + 0.5, 0.6, 0.12]} />
            <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.28} />
          </mesh>
        );
      })}
    </group>
  );
}

// ---- heatsink ---------------------------------------------------------
const finCache = new Map();

/** Merged extruded fin stack for the Pi 5 Active Cooler. */
export function finStackGeometry(count, w, d, h, t = 0.6) {
  const key = `${count}:${w}:${d}:${h}:${t}`;
  const hit = finCache.get(key);
  if (hit) return hit;
  const parts = [];
  const gap = w / count;
  for (let i = 0; i < count; i++) {
    const g = new THREE.BoxGeometry(t, d, h);
    g.translate((i - (count - 1) / 2) * gap, 0, h / 2);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  finCache.set(key, merged);
  return merged;
}

export function disposePrimitiveCaches() {
  for (const g of pinCache.values()) g.dispose();
  pinCache.clear();
  for (const g of finCache.values()) g.dispose();
  finCache.clear();
}
