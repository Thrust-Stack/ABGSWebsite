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
export const TAGLINE = "Active fin control for high-power rocketry — guided flight with off-the-shelf hardware.";

export const MISSION_STATEMENT =
  "We're building an open-source active fin control system for high-power rocketry. Our goal is to prove that low-cost, off-the-shelf components can deliver real-time flight control — making guided rocketry accessible to student teams and hobbyists everywhere.";

export const goals = [
  {
    num: "01",
    title: "Stable Guided Flight",
    desc: "A controlled, canard-guided ascent with real-time attitude correction driven by a PID control loop.",
  },
  {
    num: "02",
    title: "Live Telemetry",
    desc: "Full flight data — position, velocity, orientation, altitude — downlinked to a ground station in real time over 915 MHz LoRa.",
  },
  {
    num: "03",
    title: "Reproducible & Open",
    desc: "Every component, every line of code, every wiring diagram documented so any team can build and fly this system.",
  },
];

export const milestones = [
  { phase: "01", title: "Sensor Integration", status: "active", desc: "GPS + IMU reading live on the ESP32 bridge" },
  { phase: "02", title: "Telemetry Link", status: "upcoming", desc: "LoRa radio transmitting to the ground station" },
  { phase: "03", title: "Flight Software", status: "upcoming", desc: "PID control loop + sensor fusion on the Pi" },
  { phase: "04", title: "Ground Station", status: "upcoming", desc: "Real-time dashboard on a laptop" },
  { phase: "05", title: "Static Test", status: "upcoming", desc: "Full avionics bay bench test" },
  { phase: "06", title: "First Flight", status: "upcoming", desc: "Launch with live control telemetry" },
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
      "Enough compute headroom to run sensor fusion and the control loop in real time while logging full-rate flight data — using an off-the-shelf board any team can buy.",
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
      "Dual-core microcontroller with hardware UART/I2C and a mature toolchain — it offloads deterministic sensor polling from the Pi.",
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
      "Provides angular rate and acceleration for the attitude estimate — the primary input to the canard control loop during powered flight.",
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
      "Tracks altitude through the whole flight profile — verification of apogee and an independent input alongside GPS altitude.",
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
      "Streams the live telemetry frames — position, velocity, orientation, altitude — from the rocket to the ground station during flight.",
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
      "Dedicated PWM hardware guarantees jitter-free servo pulses — critical for smooth control surface deflection.",
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
      "A 2S pack keeps the input voltage close to the 5 V rail the stack actually needs, so the BEC runs efficiently and the servos see stable power even during simultaneous canard corrections — voltage sag under actuation load directly degrades pointing precision.",
    specs: [
      { label: "Nominal voltage", value: "7.4 V (2S LiPo)", source: "project" },
      { label: "Capacity", value: "≈2200 mAh — sized for pad wait + full flight with margin", source: "project" },
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
      "Chosen for precision of actuation at every step: as a high-voltage digital servo it holds a tight deadband, centers repeatably, and resolves the small, frequent deflection commands the 100 Hz control loop issues — so the canard angle the controller commands is the angle the airframe actually gets.",
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
      "Deflecting the four canards generates corrective aerodynamic moments — this is how the control loop physically steers the rocket.",
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
  { id: "nose-cone", name: "Nose Cone", desc: "3D-printed forward section that doubles as the avionics bay — the full sled (flight computer, sensors, radio, and power) rides inside it." },
  { id: "upper-body", name: "Upper Body Tube", desc: "Forward airframe coupler between the nose and the canard control section." },
  { id: "servo-fin-can", name: "Servo Fin Can", desc: "Structural section carrying the four servo mounts, shaft bearings, and canards." },
  { id: "lower-body", name: "Lower Body Tube", desc: "Main airframe section between the control can and the aft end." },
  { id: "static-fin-can", name: "Static Fin Can", desc: "Fixed fins, lower bearing mount, and motor mount — passive stability at the aft end." },
];

export const LINKS = {
  github: "https://github.com/Thrust-Stack",
};
