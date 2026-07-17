// Where each board sits in the avionics bay, in sled units.
//
// Ground truth is the team's build photos (public/components) plus the two bay
// CAD exports. Two facts drive everything here:
//
//  1. The bay *is* the nose cone, so its envelope is a cone, not a tube. The
//     forward tray tapers; only the aft end is anywhere near the Ø71.6 mm the
//     CAD bounding box reports. `deckHalf()` derives that envelope from the
//     nose geometry in config.js rather than assuming a constant width — get
//     this wrong and the boards poke out through the airframe.
//  2. At true scale a Pi 5 (56 mm) nearly fills the bay where it's widest, so
//     the boards run as a single column and the power hardware goes on the back
//     face. That's exactly what the photos show: compute and sensors front,
//     PCA9685 and BEC behind.
//
// `at()` converts a board-local millimetre coordinate (straight off the board
// model in boards.jsx) into sled space, so the harness anchors to real pins
// rather than guessing. A wire that starts at channel 0 of the PCA9685 starts
// at channel 0 of the PCA9685.
import { SLED_MM as MM, SLED, SECTIONS, R } from "../config";

export const BAY_LEN = SLED.length; // 1.255
export const BAY_R = SLED.radius; // 0.129

// Deck sits on the bay centreline; boards stand off it either side.
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

/**
 * side: "front" (+Z, toward the viewer during inspect) or "back" (-Z).
 * Back-side boards are flipped about Y so their component face points -Z.
 *
 * Packing runs narrow-forward to wide-aft, following the cone: sensors and the
 * GPS in the taper, then the ESP32, then the Pi 5 down at the base where the
 * bay is widest — the same order as IMG_9479.
 */
export const POS = {
  // --- front: sensors, GPS, compute ---
  mpu6050: { xy: [-0.055, 0.19], side: "front" },
  "gps-v3": { xy: [0.045, 0.16], side: "front" },
  bmp585: { xy: [-0.055, 0.12], side: "front" },
  esp32: { xy: [0.02, -0.02], side: "front" },
  "raspberry-pi-5": { xy: [0, -0.32], side: "front" },
  // --- back: radio, actuation, power ---
  rfm95w: { xy: [-0.04, 0.16], side: "back" },
  pca9685: { xy: [0.035, 0.0], side: "back" },
  "bec-ubec": { xy: [0, -0.16], side: "back" },
  battery: { xy: [0, -0.38], side: "back" },
};

export const sideSign = (id) => (POS[id].side === "back" ? -1 : 1);

/** Board-local millimetres -> sled units. z is measured up from that board's deck face. */
export const at = (id, xmm = 0, ymm = 0, zmm = 0) => {
  const p = POS[id];
  const s = p.side === "back" ? -1 : 1;
  // The back face is flipped about Y: its local +X runs against sled +X.
  return [p.xy[0] + s * xmm * MM, p.xy[1] + ymm * MM, s * (DECK_Z + zmm * MM)];
};

// Header pin-top height above the board face, for a standard 2.54 header:
// board half-thickness + plastic base - seat + pin length.
export const PIN_TOP = 0.8 + 2.5 - 0.6 + 6;

/** PCA9685 servo channel `i` (0-15): [PWM, V+, GND] pin tops. */
export const pcaChannel = (i, row = 0) =>
  at("pca9685", 6.5 + (row - 1) * 2.54, (i - 7.5) * 2.54, PIN_TOP);
