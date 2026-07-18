// Geometry layout + scroll phase map for the home 3D experience.
//
// The airframe is the team's real CAD assembly (Rocket Assembly.STEP ->
// public/models/rocket-assembly.glb, 19 named parts). It is normalized at
// load: centered on the origin, Y up, total length scaled to LENGTH units.
// The measured constants below are derived from the CAD (1052 mm long,
// Ø79 mm; the avionics sled rides inside the nose cone — see the team's
// build photos).

export const LENGTH = 7.6; // rocket length in scene units
const MM = LENGTH / 1052.0; // mm -> scene units
export const MM_TO_UNIT = MM;
export const CAD_CENTER = { x: 688.0, y: 841.8, z: 1323.2 }; // assembly centroid (mm)

export const R = 39.3 * MM; // hull radius (~0.284)

// Section Y ranges in scene units (from CAD bounding boxes)
export const SECTIONS = {
  staticFinCan: { y0: -3.684, y1: -2.961 },
  lowerBody: { y0: -2.889, y1: 0.147 },
  servoFinCan: { y0: 0.146, y1: 1.085 },
  upperBody: { y0: 0.868, y1: 1.735 },
  noseCone: { y0: 1.221, y1: 3.8 },
};

export const CANARD_Y = 0.508; // canard shaft centerline
export const CANARD_RADIUS = 0.328; // canard centroid distance from axis

export const mid = (s) => (s.y0 + s.y1) / 2;
export const len = (s) => s.y1 - s.y0;

// Vertical offsets applied to each section at full explode (progress = 1).
export const EXPLODE_OFFSETS = {
  noseCone: 1.6, // carries the sled with it
  upperBody: 0.85,
  servoFinCan: 0.45,
  lowerBody: -0.35,
  staticFinCan: -1.1,
};

// Which CAD node names belong to which section. Matching happens on the
// name lowercased with all non-alphanumerics stripped, because GLTFLoader
// sanitizes node names (spaces/parens are removed or replaced).
export const SECTION_OF_NODE = [
  { key: "nosecone", section: "noseCone" },
  { key: "upperbody", section: "upperBody" },
  { key: "servofincan", section: "servoFinCan" },
  { key: "smallbearing", section: "servoFinCan" },
  { key: "airfoilcanard", section: "canard" }, // gets its own pivot
  { key: "lowerbearingmount", section: "staticFinCan" }, // check before lowerbody-ish keys
  { key: "lowerbody", section: "lowerBody" },
  { key: "staticfin", section: "staticFinCan" },
  { key: "airfoilfin", section: "staticFinCan" },
  { key: "fakemotor", section: "staticFinCan" },
];

// ---- avionics bay ----
// The real bay, measured off the team's two "Avionics Bay Plate" CAD exports:
// a 178.7 mm forward tapered half + a 170.0 mm aft cylindrical half, Ø71.6 mm.
// It is essentially the full length of the nose cone (2.58 units), which is the
// point — the nose *is* the avionics bay on this vehicle.
export const BAY = { lenMM: 348.7, diaMM: 71.6 };

// Millimetres -> sled-local units. Boards are authored in mm and the sled group
// is scaled by SLED.baseScale, so a board's on-screen size against the airframe
// is SLED_MM * baseScale per mm — set below so that product is exactly
// MM_TO_UNIT, i.e. the boards are the same scale as the rocket they fly in.
export const SLED_MM = 0.0036;

export const SLED = {
  length: BAY.lenMM * SLED_MM, // 1.255
  radius: (BAY.diaMM / 2) * SLED_MM, // 0.129
  deckThickness: 0.014,
  baseScale: MM / SLED_MM, // true scale against the airframe (~2.007)
  presentScale: 2.4, // absolute scale while inspected in front of the camera
  noseLocalY: 2.48, // resting position inside the nose (pre-explode)
  // Offset up so the *boards* land on the camera's look point rather than the
  // bay's midpoint — the forward third of the bay is empty taper.
  presentPos: [0.38, 0.37, 2.45],
  // Turned off face-on while inspected: the bay is a 1:4.9 sliver, and a
  // three-quarter view is what gives it depth instead of reading as a decal.
  presentYaw: -0.36,
};

// ---- Scroll phase map (progress 0..1 across the whole home scroll) ----
export const PHASES = {
  hero: { start: 0.0, end: 0.12 },
  overview: { start: 0.12, end: 0.26 },
  canards: { start: 0.26, end: 0.44 },
  explode: { start: 0.44, end: 0.58 },
  sledOut: { start: 0.58, end: 0.7 },
  inspect: { start: 0.7, end: 0.88 },
  outro: { start: 0.88, end: 1.0 },
};

export const phaseT = (p, phase) => {
  const { start, end } = PHASES[phase];
  return Math.min(1, Math.max(0, (p - start) / (end - start)));
};

// While the sled has the stage (sledOut through outro), the airframe and the
// servo hardware drop back so the exploded stack behind it doesn't compete for
// attention. Shells whose opacity the scroll timeline owns directly (the nose
// and the servo can) have to fold this in themselves — they opt out of the
// per-part fade, so nothing else applies it for them.
// Kept very low deliberately. The body tubes are bright metal, and sRGB
// encoding lifts dark values hard, so even 0.1 alpha over black still reads as
// a solid grey column standing behind the sled.
export const STAGE_FADE = 0.05;
export const stageFadeAt = (p) =>
  p > PHASES.sledOut.start + 0.03 && p < PHASES.outro.start + 0.03 ? STAGE_FADE : 1;

export const smoothstep = (t) => t * t * (3 - 2 * t);

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const span = (t, a, b) => clamp01((t - a) / (b - a));

// ---- outro: re-stack, ignition, launch ----
//
// Beat map across the outro phase (outroT 0..1). Outro is the last phase, so
// the camera rig has no next key to blend toward and parks at
// CAMERA_KEYS.outro for the whole phase — that locked frame is what makes a
// launch readable, because the vehicle moves through it rather than the camera
// moving away from the vehicle.
//
//   0.00-0.50  the sled slides back into the nose
//   0.34-0.64  the stack re-closes into a whole airframe
//   0.60-0.76  the motor lights at the static fin can's nozzle
//   0.70-1.00  the vehicle accelerates and leaves the top of frame
//
// The stack has to be shut before the motor lights, which is why closing now
// finishes at 0.64 instead of running out to the end of the phase.
export const OUTRO = {
  closeStart: 0.34,
  closeEnd: 0.64,
  igniteStart: 0.6,
  igniteEnd: 0.76,
  launchStart: 0.7,
  // Scene units of +Y travel. The outro camera sits ~12 units off the vehicle
  // at fov 42, so the frame is ~9.2 units tall about a look point at y=0.15:
  // the top of frame is ~y=4.75 and the fin can's aft end starts at y=-3.68,
  // so ~8.4 units clears the airframe and the rest clears the plume behind it.
  launchDistance: 12,
};

export const sectionCloseAt = (outroT) => smoothstep(span(outroT, OUTRO.closeStart, OUTRO.closeEnd));

// Motor intensity, 0 (cold) -> 1 (full throttle).
export const igniteAt = (outroT) => smoothstep(span(outroT, OUTRO.igniteStart, OUTRO.igniteEnd));

// Launch displacement in +Y. Squared rather than smoothstepped on purpose: a
// smoothstep decelerates into its end, and the vehicle has to still be
// accelerating when it leaves frame.
export const launchAt = (outroT) => {
  const t = span(outroT, OUTRO.launchStart, 1);
  return t * t * OUTRO.launchDistance;
};

// True from just before the outro phase onward. Everything ignition-related is
// gated on this so it costs nothing across the other 88% of the scroll.
export const outroArmed = (p) => p > PHASES.outro.start - 0.02;

// Height of the scroll track that drives the 3D tour (progress 0..1 maps across
// this). The YouTube video section in Home.jsx is appended *after* this track as
// a normal content block, so it adds its own scroll room at the end without
// remapping the phase timeline above. Bump these only to change 3D-tour pacing.
export const SCROLL_VH_DESKTOP = 850;
export const SCROLL_VH_MOBILE = 700;

// Camera keyframes per phase: [position], [lookAt].
// The rig dwells at each key and blends to the next only late in the phase.
export const CAMERA_KEYS = {
  hero: { pos: [2.8, 0.7, 11.4], look: [-0.5, 0.1, 0] },
  overview: { pos: [-3.4, 1.6, 10.8], look: [0.8, 0.35, 0] },
  canards: { pos: [1.35, 0.9, 2.7], look: [0, 0.5, 0] },
  explode: { pos: [0.5, 0, 14.4], look: [0, 0, 0] },
  sledOut: { pos: [0.8, 0.35, 5.6], look: [0.2, 0.1, 1.0] },
  inspect: { pos: [0.15, 0.25, 6.0], look: [0.38, 0.02, 2.45] },
  outro: { pos: [5.0, 1.7, 10.8], look: [-1.7, 0.15, 0] },
};

// 3D colors (kept in sync with src/design/tokens.js)
export const C3 = {
  hull: "#c9ced6",
  hullDark: "#565c66",
  graphite: "#22262e",
  // The real nose cone and bay are black 3D prints. Printed ASA is a matte
  // dielectric and lifts a long way under studio light, so the base colour sits
  // well below the charcoal it should read as on screen.
  nosePrint: "#16191f",
  panel: "#31363f",
  orange: "#ff6a2c",
  blue: "#3b82f6",
  green: "#12e29a",
  board: "#141a22",
  boardEdge: "#2a323d",
};
