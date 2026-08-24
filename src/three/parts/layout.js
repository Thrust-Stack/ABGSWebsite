// Where every part sits in the avionics bay, in sled units.
//
// Ground truth is the team's build photos (public/components) plus the two bay
// CAD exports. Three facts drive everything here:
//
//  1. The bay *is* the nose cone, so its envelope is a cone, not a tube. The
//     forward tray tapers; only the aft end is anywhere near the Ø71.6 mm the
//     CAD bounding box reports. `deckHalf()` derives that envelope from the
//     nose geometry in config.js rather than assuming a constant width — get
//     this wrong and parts poke out through the airframe.
//  2. The avionics are one perfboard on the *front* face of the deck. All six
//     modules are soldered to its component side; the point-to-point wiring is
//     on its back side, facing the deck. Nothing else rides the front face.
//  3. The power system is on the *back* face: two LiPo packs, a step-down
//     converter for each, and the switch housing at the base. That is the
//     hierarchy the exploded view has to make readable — modules, board,
//     solder side, then power behind.
//
// `at()` converts a part-local millimetre coordinate (straight off the model in
// boards.jsx) into sled space, so the harness anchors to real pins rather than
// guessing. A wire that starts at the ESP32's servo pins starts at the ESP32's
// servo pins.
import { SLED_MM as MM, SLED, SECTIONS, R } from "../config";

export const BAY_LEN = SLED.length; // 1.255
export const BAY_R = SLED.radius; // 0.129

// Deck sits on the bay centreline; the perfboard stands off its front face and
// the power hardware off its back.
export const DECK_T = SLED.deckThickness;
export const DECK_Z = DECK_T / 2 + 0.002;

const NOSE_LEN = SECTIONS.noseCone.y1 - SECTIONS.noseCone.y0;

/** Nose interior radius (sled units) at a sled-local y. */
export const deckHalf = (y) => {
  const worldY = SLED.noseLocalY + y * SLED.baseScale;
  const rScene = (R * (SECTIONS.noseCone.y1 - worldY)) / NOSE_LEN;
  return Math.max(0.018, Math.min(BAY_R, rScene / SLED.baseScale - 0.005));
};

/** Cable channel x at a given y — the deck edge, following the taper. */
export const channelX = (y, side = 1) => side * (deckHalf(y) - 0.012);

// Usable band: forward of ~+0.24 the cone is too narrow to carry anything.
export const DECK_Y0 = -BAY_LEN / 2; // -0.628
export const DECK_Y1 = 0.3;

// ---- the perfboard --------------------------------------------------------
//
// Two soldered segments, exactly as the build photos show: a long main board
// carrying the two controllers, the altimeter, and the GPS, and a short forward
// board carrying the microSD reader with the IMU raised over it. They are split
// because the cone narrows — a single board wide enough for the ESP32 could not
// reach as far forward as the sensors need to sit.
//
// Every dimension below is checked against deckHalf() at the board's forward
// corners, which is the binding constraint: that is where the taper is
// tightest, and it is what decides how wide each segment is allowed to be.
export const PERF_T = 1.6; // board thickness, mm
const PERF_STANDOFF = 3; // nylon standoff between deck and board, mm

export const PERF_MAIN = { w: 36, h: 168 }; // mm
export const PERF_FWD = { w: 26, h: 50 }; // mm

// Main segment sits with its aft edge on the deck base; the forward segment
// picks up just above it with a small expansion gap.
export const PERF_MAIN_Y = DECK_Y0 + (PERF_MAIN.h / 2) * MM; // -0.3226
export const PERF_FWD_Y = PERF_MAIN_Y + ((PERF_MAIN.h + PERF_FWD.h) / 2 + 2.8) * MM;

// Forward segment expressed in the main segment's local mm, so the perfboard
// renders as one part with one transform.
export const PERF_FWD_LOCAL_Y = (PERF_FWD_Y - PERF_MAIN_Y) / MM;

// Board mid-plane, and the plane the modules' own mid-planes sit on above it.
export const PERF_Z = DECK_Z + (PERF_STANDOFF + PERF_T / 2) * MM;
const MODULE_Z = PERF_Z + (PERF_T / 2 + 1.0 + 0.8) * MM;

/** Sled-space position for a module at (xmm, ymm) on a perfboard segment. */
const onPerf = (segY, xmm, ymm, lift = 0) => ({
  xy: [xmm * MM, segY + ymm * MM],
  z: MODULE_Z + lift * MM,
  side: "front",
});

/** Sled-space position for a part sitting on the back face of the deck. */
const onBack = (y, xmm = 0) => ({ xy: [xmm * MM, y], z: DECK_Z, side: "back" });

/**
 * side: "front" (+Z, toward the viewer during inspect) or "back" (-Z).
 * Back-side parts are flipped about Y so their outward face points -Z.
 *
 * Front face, forward -> aft: the IMU raised over the microSD reader on the
 * short board, then the Heltec, the Main ESP32, the altimeter, and the GPS down
 * the main board — the order the build photos show.
 *
 * Back face, forward -> aft: electronics pack, its step-down, the servo
 * step-down, the servo pack, and the switch housing at the base where it can be
 * reached from outside the airframe.
 */
export const POS = {
  // --- front: the perfboard and the six modules on its component side ---
  perfboard: { xy: [0, PERF_MAIN_Y], z: PERF_Z, side: "front" },
  mpu6500: onPerf(PERF_FWD_Y, 0, 13, 11), // raised on its own header, over the reader
  microsd: onPerf(PERF_FWD_Y, 0, -2),
  "heltec-esp32": onPerf(PERF_MAIN_Y, 0, 56),
  "esp32-main": onPerf(PERF_MAIN_Y, 0, 0.5),
  bmp585: onPerf(PERF_MAIN_Y, 3, -37.5),
  "gps-module": onPerf(PERF_MAIN_Y, 0, -65.5),

  // --- back: the two power systems ---
  "battery-electronics": onBack(-0.085),
  "stepdown-electronics": onBack(-0.213),
  "stepdown-servo": onBack(-0.28),
  "battery-servo": onBack(-0.432),
  "switch-housing": onBack(-0.588),
};

export const sideSign = (id) => (POS[id].side === "back" ? -1 : 1);

/** The z a part's own group sits at, signed for its face. */
export const posZ = (id) => sideSign(id) * (POS[id].z ?? DECK_Z);

/** Part-local millimetres -> sled units. z is measured up from that part's own face. */
export const at = (id, xmm = 0, ymm = 0, zmm = 0) => {
  const p = POS[id];
  const s = p.side === "back" ? -1 : 1;
  // The back face is flipped about Y: its local +X runs against sled +X.
  return [p.xy[0] + s * xmm * MM, p.xy[1] + ymm * MM, s * ((p.z ?? DECK_Z) + zmm * MM)];
};

// Header pin-top height above the board face, for a standard 2.54 header:
// board half-thickness + plastic base - seat + pin length.
export const PIN_TOP = 0.8 + 2.5 - 0.6 + 6;

/**
 * Servo channel `i` (0-3) on the Main ESP32's right-hand breakout row. With the
 * dedicated PWM driver gone the four canard leads come off the controller
 * itself, so this is where the servo loom now starts.
 */
export const servoPin = (i) => at("esp32-main", 12.7, 8 - i * 2.54, PIN_TOP);
