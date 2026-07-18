// ===================================================================
// THRUST STACK — verified project data (single source of truth)
//
// Provenance rules:
//  - Facts here were carried over from the original site (src/shared.jsx)
//    or are manufacturer datasheet values, marked source: "datasheet".
//  - Project-specific engineering claims we don't have yet are marked
//    pending: true and render as "SPEC PENDING" — never invented.
// ===================================================================

export const TEAM_NAME = "THRUST STACK";
export const PROJECT_NAME = "Fin Control System";
export const PROJECT_LABEL = "Avionics Bay Ground Station Communications & Canard Control";
export const TAGLINE = "Active canard control for high-power rocketry, built from parts you can order online.";

export const MISSION_STATEMENT =
  "We're a four-person undergrad team building a canard control system for a high-power rocket. Four small fins near the nose, each on its own servo, deflect in flight to keep the rocket pointed where we want it. A Raspberry Pi 5 runs the control loop, an ESP32 handles the sensors, and everything downlinks to a laptop on the ground. It's all off-the-shelf hardware and our own code, and we're writing down the wiring and software so another student team can rebuild it.";

export const goals = [
  {
    num: "01",
    title: "Keep it pointed",
    desc: "Hold the rocket on its planned attitude through powered flight. The Pi runs a PID loop on the IMU and barometer data and trims the four canards to correct pitch, yaw, and roll.",
  },
  {
    num: "02",
    title: "See the flight",
    desc: "Downlink altitude, velocity, orientation, and GPS position to a laptop over 915 MHz LoRa, fast enough to watch the flight as it happens and log every frame for later.",
  },
  {
    num: "03",
    title: "Make it repeatable",
    desc: "Write down the parts list, the wiring, and the code so another team can order the same hardware and get it flying without reverse-engineering our build.",
  },
];

// Each phase carries the short line plus a fuller story: what we did, what we
// learned, and what fought us. Phases we haven't reached yet get the plan in
// `did` and leave `learned`/`problems` null so the page shows them as pending
// rather than inventing a story (same rule as the pending specs below).
//
// `images` holds photo slots. Real build photos live in public/components; the
// rest are marked `{ placeholder: true }` with a caption describing the shot we
// still need to take.
export const milestones = [
  {
    phase: "01",
    title: "Sensor Integration",
    status: "active",
    desc: "Reading the IMU, barometer, and GPS live on the ESP32.",
    did: "Wired the MPU6050 and BMP585 to the ESP32 over I2C and the Adafruit Ultimate GPS over UART, then wrote the polling loop that timestamps every sample before it goes up to the Pi. Right now all three sensors read on the bench at a steady 100 Hz.",
    learned: "Keeping the I2C addresses straight matters more than we expected. Once we had two sensors on the same bus we had to check each address before both would enumerate, and we moved the pull-ups onto one board instead of doubling them up.",
    problems: "The GPS took a long time to get its first fix indoors. We ended up testing next to a window and relying on the CR1220 backup cell so it keeps almanac data between power cycles instead of cold-starting every time.",
    images: [
      { src: "/components/IMG_9479.jpg", cap: "Component side: GPS, ESP32, and Pi 5 on the sled" },
      { placeholder: true, cap: "Add: bench shot of the sensors reading on the serial monitor" },
    ],
  },
  {
    phase: "02",
    title: "Telemetry Link",
    status: "upcoming",
    desc: "RFM95W downlinking packets to the ground station over 915 MHz.",
    did: "Plan: bring up the RFM95W on the Pi's SPI bus and lock down a packet format for altitude, velocity, orientation, and GPS position. Bench range test first, then an open-field test to check dropouts.",
    learned: null,
    problems: null,
    images: [{ placeholder: true, cap: "Add: RFM95W wired to the Pi, ground station receiver" }],
  },
  {
    phase: "03",
    title: "Flight Software",
    status: "upcoming",
    desc: "PID control loop and sensor fusion running on the Pi.",
    did: "Plan: fuse the IMU, barometer, and GPS into an attitude estimate on the Pi, run the PID loop at 100 Hz, and send canard commands back down through the ESP32 to the PCA9685.",
    learned: null,
    problems: null,
    images: [{ placeholder: true, cap: "Add: screen recording of the control loop tracking a test input" }],
  },
  {
    phase: "04",
    title: "Ground Station",
    status: "upcoming",
    desc: "Laptop dashboard plotting the downlink in real time.",
    did: "Plan: decode the telemetry frames on a laptop and plot altitude, speed, and attitude live, plus log every frame to disk for post-flight review.",
    learned: null,
    problems: null,
    images: [{ placeholder: true, cap: "Add: dashboard screenshot during a bench run" }],
  },
  {
    phase: "05",
    title: "Static Test",
    status: "upcoming",
    desc: "Full avionics bay powered on the bench, servos driving canards.",
    did: "Plan: run the whole stack off the 2S pack and BEC, command all four BMS-127WV+ servos through the PCA9685, and check for voltage sag when several canards move at once.",
    learned: null,
    problems: null,
    images: [
      { src: "/components/IMG_9480.jpg", cap: "Power side: BEC, regulation, and terminals" },
      { placeholder: true, cap: "Add: full bay powered up on the bench" },
    ],
  },
  {
    phase: "06",
    title: "First Flight",
    status: "upcoming",
    desc: "Launch with the canards live and telemetry on the ground.",
    did: "Plan: fly the vehicle with the control loop active and the ground station recording. Compare the commanded canard angles against the logged attitude to see how well it held.",
    learned: null,
    problems: null,
    images: [{ placeholder: true, cap: "Add: pad photo and onboard footage from the first flight" }],
  },
];

export const dataFlow = [
  { from: "BMP585", to: "ESP32", protocol: "I2C" },
  { from: "MPU6050", to: "ESP32", protocol: "I2C" },
  { from: "GPS V3", to: "ESP32", protocol: "UART" },
  { from: "ESP32", to: "Raspberry Pi 5", protocol: "UART" },
  { from: "ESP32", to: "PCA9685", protocol: "I2C" },
  { from: "PCA9685", to: "Servos", protocol: "PWM" },
  { from: "Raspberry Pi 5", to: "RFM95W", protocol: "SPI" },
  { from: "RFM95W", to: "Ground Station", protocol: "915MHz" },
  { from: "Ground Station", to: "Laptop", protocol: "USB" },
  { from: "Battery 7.4V", to: "BEC Step-Down", protocol: "PWR" },
  { from: "BEC Step-Down", to: "Raspberry Pi 5", protocol: "5V PWR" },
];

// `relatedIndexes` drives the orbital view's connection lines — who each
// member's work directly interfaces with (by index in this array).
export const teamMembers = [
  {
    name: "Bryan Pham",
    role: "Design and Manufacturing Engineer",
    focus: "CFD simulation, structural design, aerodynamics, airframe design, and avionics bay sled CAD design",
    photo: "/team/BP1.png",
    linkedin: "https://www.linkedin.com/in/bryan-pham2028/",
    relatedIndexes: [2, 3], // sled CAD -> avionics; airframe -> aero sim
  },
  {
    name: "Isaiah Tracy",
    role: "Control Systems Engineer",
    focus: "Canard actuation control calculations, radio frequency communications, and antenna design",
    photo: "/team/IT.jpg",
    linkedin: "https://www.linkedin.com/in/isaiah-tracy/",
    relatedIndexes: [2, 3], // control calcs -> flight software; canard actuation -> aero
  },
  {
    name: "Taanish Patel",
    role: "Computer Systems Engineer",
    focus: "Avionics, electrical, flight software, telemetry systems, and flight computer systems",
    photo: "/team/TP.png",
    linkedin: "https://www.linkedin.com/in/taanish-patel/",
    relatedIndexes: [0, 1], // avionics -> sled CAD; flight software -> control calcs
  },
  {
    name: "Tariq Akilah",
    role: "Fluid Dynamics Engineer",
    focus: "Aerodynamic simulation, structural design, and servo mount CAD design",
    photo: "/team/TA.jpg",
    linkedin: "https://www.linkedin.com/in/tariq-akilah/",
    relatedIndexes: [0, 1], // servo mount CAD -> airframe; aero -> canard control
  },
];

// ===================================================================
// Avionics components — drives both the Hardware page and the 3D
// interactive sled. `specs` entries are manufacturer datasheet values
// (source shown in the UI). `whySelected` beyond what the original site
// said is left pending until the team supplies it.
// ===================================================================

export const components = [
  {
    id: "raspberry-pi-5",
    photos: ["/components/IMG_9479.jpg"],
    name: "Raspberry Pi 5",
    shortName: "PI 5",
    role: "Flight Computer",
    system: "Processing / Control",
    tone: "blue",
    desc: "Quad-core brain running the PID control loop, sensor fusion, and telemetry packaging.",
    connectsTo: ["ESP32 (UART)", "RFM95W LoRa (SPI)", "BEC 5V rail (power)"],
    usage:
      "Runs the flight software: fuses IMU, barometer, and GPS data into a state estimate, computes canard corrections through the PID loop, and packages telemetry frames for downlink.",
    whySelected:
      "It has enough compute headroom to run sensor fusion and the control loop in real time while logging full-rate flight data, and it's an off-the-shelf board any team can buy.",
    specs: [
      { label: "SoC", value: "Broadcom BCM2712, 4× Cortex-A76 @ 2.4 GHz", source: "datasheet" },
      { label: "RAM", value: "up to 8 GB LPDDR4X", source: "datasheet" },
      { label: "I/O", value: "40-pin GPIO, UART, SPI, I2C", source: "datasheet" },
      { label: "Power", value: "5 V via BEC rail", source: "project" },
    ],
  },
  {
    id: "esp32",
    photos: ["/components/IMG_9479.jpg"],
    name: "ESP32",
    shortName: "ESP32",
    role: "Sensor Comms & Servo Control",
    system: "Processing / Control",
    tone: "blue",
    desc: "Collects IMU, altimeter, and GPS data, relays it to the Pi, and drives the PCA9685 servo controller.",
    connectsTo: ["MPU6050 (I2C)", "BMP585 (I2C)", "GPS V3 (UART)", "Raspberry Pi 5 (UART)", "PCA9685 (I2C)"],
    usage:
      "Acts as the real-time I/O bridge: polls all sensors on tight timing, streams packets up to the Pi, and translates the Pi's control outputs into servo commands via the PCA9685.",
    whySelected:
      "It's a dual-core microcontroller with hardware UART and I2C, so it can poll the sensors on tight timing and keep that work off the Pi.",
    specs: [
      { label: "MCU", value: "Xtensa dual-core LX6 @ 240 MHz", source: "datasheet" },
      { label: "Interfaces", value: "UART, I2C, SPI, PWM", source: "datasheet" },
      { label: "Role", value: "Sensor aggregation + servo command relay", source: "project" },
    ],
  },
  {
    id: "mpu6050",
    photos: ["/components/IMG_9479.jpg"],
    name: "MPU6050",
    shortName: "IMU",
    role: "Inertial Measurement Unit",
    system: "Sensing",
    tone: "green",
    desc: "6-axis accelerometer + gyroscope for attitude determination at 100 Hz.",
    connectsTo: ["ESP32 (I2C)"],
    usage:
      "Provides angular rate and acceleration for the attitude estimate. It's the primary input to the canard control loop during powered flight.",
    whySelected:
      "Ubiquitous, well-documented 6-axis IMU with proven Arduino/ESP32 libraries; sufficient rate for a 100 Hz attitude loop.",
    specs: [
      { label: "Sensors", value: "3-axis gyro + 3-axis accelerometer", source: "datasheet" },
      { label: "Gyro range", value: "±250 to ±2000 °/s", source: "datasheet" },
      { label: "Accel range", value: "±2 g to ±16 g", source: "datasheet" },
      { label: "Sample rate (project)", value: "100 Hz", source: "project" },
    ],
  },
  {
    id: "bmp585",
    name: "BMP585",
    shortName: "BARO",
    role: "Barometric Altimeter",
    system: "Sensing",
    tone: "green",
    desc: "High-precision barometric pressure sensor for altitude tracking.",
    connectsTo: ["ESP32 (I2C)"],
    usage:
      "Tracks altitude through the whole flight profile. It confirms apogee and gives an independent altitude reading alongside the GPS.",
    whySelected:
      "High-resolution pressure sensing in a small package, giving fine-grained altitude data during ascent.",
    specs: [
      { label: "Type", value: "Barometric pressure sensor (Bosch)", source: "datasheet" },
      { label: "Interface", value: "I2C / SPI", source: "datasheet" },
      { label: "Use", value: "Altitude tracking", source: "project" },
    ],
  },
  {
    id: "gps-v3",
    photos: ["/components/IMG_9479.jpg"],
    name: "Adafruit Ultimate GPS V3",
    shortName: "GPS",
    role: "Position & Velocity",
    system: "Sensing",
    tone: "green",
    desc: "66-channel GPS receiver for latitude/longitude, ground speed, and heading.",
    connectsTo: ["ESP32 (UART)"],
    usage:
      "Supplies absolute position and velocity for the telemetry stream and post-flight trajectory reconstruction.",
    whySelected:
      "Breadboard-friendly GPS module with strong community support and a built-in antenna option.",
    specs: [
      { label: "Channels", value: "66 (22 tracking)", source: "datasheet" },
      { label: "Update rate", value: "up to 10 Hz", source: "datasheet" },
      { label: "Interface", value: "UART", source: "datasheet" },
    ],
  },
  {
    id: "rfm95w",
    name: "RFM95W LoRa",
    shortName: "LoRa",
    role: "Telemetry Downlink",
    system: "Communications",
    tone: "orange",
    desc: "915 MHz long-range radio transmitting live flight data to the ground station.",
    connectsTo: ["Raspberry Pi 5 (SPI)", "Ground station (915 MHz RF)"],
    usage:
      "Streams the live telemetry frames (position, velocity, orientation, and altitude) from the rocket to the ground station during flight.",
    whySelected:
      "LoRa modulation gives kilometers of range at low power without licensing, ideal for a student telemetry downlink.",
    specs: [
      { label: "Frequency", value: "915 MHz ISM band", source: "datasheet" },
      { label: "Modulation", value: "LoRa (SX1276)", source: "datasheet" },
      { label: "Interface", value: "SPI", source: "datasheet" },
    ],
  },
  {
    id: "pca9685",
    name: "PCA9685",
    shortName: "PWM",
    role: "Servo Driver",
    system: "Actuation",
    tone: "orange",
    desc: "16-channel I2C PWM driver translating ESP32 commands into precise servo signals.",
    connectsTo: ["ESP32 (I2C)", "Canard servos ×4 (PWM)"],
    usage:
      "Generates clean, hardware-timed PWM for all four canard servos, decoupling servo timing from the microcontroller's workload.",
    whySelected:
      "Dedicated PWM hardware keeps the servo pulses steady no matter how busy the ESP32 is, which keeps the canard motion smooth.",
    specs: [
      { label: "Channels", value: "16 × 12-bit PWM", source: "datasheet" },
      { label: "Interface", value: "I2C", source: "datasheet" },
      { label: "Outputs used", value: "4 (canard servos)", source: "project" },
    ],
  },
  {
    id: "battery",
    photos: ["/components/IMG_9480.jpg"],
    name: "7.4V Battery",
    shortName: "BATT",
    role: "Power Source",
    system: "Power",
    tone: "metal",
    desc: "7.4 V battery pack supplying the avionics power rail.",
    connectsTo: ["BEC UBEC (7.4 V)"],
    usage: "Primary energy source for the entire avionics bay through the regulated 5 V rail.",
    whySelected:
      "A 2S pack keeps the input voltage close to the 5 V rail the stack needs, so the BEC runs efficiently and the servos see stable power when several canards move at once. Voltage sag under that load would show up as sloppy pointing, so we oversized it.",
    specs: [
      { label: "Nominal voltage", value: "7.4 V (2S LiPo)", source: "project" },
      { label: "Capacity", value: "≈2200 mAh, sized for pad wait plus a full flight with margin", source: "project" },
    ],
  },
  {
    id: "bec-ubec",
    photos: ["/components/IMG_9480.jpg"],
    name: "RC BEC UBEC",
    shortName: "BEC",
    role: "5V 5A Step-Down",
    system: "Power",
    tone: "metal",
    desc: "Switching regulator converting 7.4 V battery power into a clean 5 V rail for the flight computer.",
    connectsTo: ["Battery (7.4 V in)", "Raspberry Pi 5 (5 V out)"],
    usage: "Regulates the battery down to a stable 5 V / 5 A rail so the Pi never browns out under load.",
    whySelected:
      "Switching (not linear) regulation keeps conversion losses and heat low while meeting the Pi 5's current demands.",
    specs: [
      { label: "Output", value: "5 V @ 5 A", source: "datasheet" },
      { label: "Input", value: "7.4 V battery", source: "project" },
      { label: "Topology", value: "Switching buck", source: "datasheet" },
    ],
  },
];

// ===================================================================
// Servo / canard control hardware — matches the CAD parts
// (Servo Mount, Lower Bearing Mount, Small Bearing, Airfoil Canard,
//  Servo Fin Can) supplied by the team.
// ===================================================================

export const servoSystem = {
  servo: {
    id: "servo-bms127",
    name: "BlueBird BMS-127WV+",
    role: "Canard Servo (×4)",
    system: "Actuation",
    desc: "High-torque digital servos actuating the canards for active flight control.",
    connectsTo: ["PCA9685 (PWM)", "Servo mount (mechanical)", "Canard shaft"],
    usage:
      "Each of the four servos drives one canard. Commands originate in the Pi's control loop, pass through the ESP32 to the PCA9685, and arrive as PWM pulses that set canard deflection.",
    whySelected:
      "As a high-voltage digital servo it holds a tight deadband, centers repeatably, and resolves the small, frequent deflection commands the 100 Hz loop issues. That's what keeps the canard angle the controller asks for close to the angle the airframe actually gets.",
    specs: [
      { label: "Type", value: "Digital, high-voltage, coreless", source: "datasheet" },
      { label: "Command", value: "50 Hz PWM from PCA9685 (hardware-timed)", source: "project" },
      { label: "Quantity", value: "4 (one per canard)", source: "project" },
    ],
  },
  mount: {
    id: "servo-mount",
    name: "Servo Mount",
    role: "Servo-to-Airframe Interface",
    system: "Structure / Actuation",
    desc: "Custom CAD-designed mount fixing each servo inside the fin can and transferring actuation torque to the canard shaft.",
    connectsTo: ["Servo fin can (structure)", "Servo body", "Canard shaft via bearing"],
    usage:
      "Holds the servo rigidly against aerodynamic loads so all servo output goes into canard deflection instead of flexing the structure. Designed in-house (CAD by Tariq Akilah).",
    whySelected:
      "Every degree of structural flex between servo and canard is a degree of control the loop commands but never gets. The in-house mount clamps the servo body and supports the canard shaft through a bearing pair, so commanded deflection translates one-to-one into surface deflection with minimal backlash.",
    specs: [
      { label: "Design", value: "Custom in-house CAD (SolidWorks)", source: "project" },
      { label: "Supports", value: "Lower bearing mount + small bearing", source: "project" },
    ],
  },
  canard: {
    id: "canard",
    name: "Airfoil Canard",
    role: "Control Surface (×4)",
    system: "Aerodynamics",
    desc: "Airfoil-profile canards near the nose providing pitch/yaw/roll authority during powered flight.",
    connectsTo: ["Servo (via shaft + bearings)"],
    usage:
      "Deflecting the four canards generates corrective aerodynamic moments. This is how the control loop physically steers the rocket.",
    whySelected:
      "An airfoil profile (validated in CFD) gives a predictable, near-linear lift response across the small deflection angles the controller uses, which keeps the control loop's output mapping accurate through the flight envelope.",
    specs: [
      { label: "Profile", value: "Airfoil section (CFD-analyzed)", source: "project" },
      { label: "Quantity", value: "4", source: "project" },
    ],
  },
};

// Rocket airframe sections — matches CAD assembly parts.
export const airframe = [
  { id: "nose-cone", name: "Nose Cone", desc: "3D-printed forward section that doubles as the avionics bay. The full sled (flight computer, sensors, radio, and power) rides inside it." },
  { id: "upper-body", name: "Upper Body Tube", desc: "Forward airframe coupler between the nose and the canard control section." },
  { id: "servo-fin-can", name: "Servo Fin Can", desc: "Structural section carrying the four servo mounts, shaft bearings, and canards." },
  { id: "lower-body", name: "Lower Body Tube", desc: "Main airframe section between the control can and the aft end." },
  { id: "static-fin-can", name: "Static Fin Can", desc: "Fixed fins, lower bearing mount, and motor mount. This is the passive stability at the aft end." },
];

export const LINKS = {
  github: "https://github.com/Thrust-Stack",
};
