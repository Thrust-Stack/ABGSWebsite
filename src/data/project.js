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
  "We're a four-person undergrad team building a canard control system for a high-power rocket. Four small fins near the nose, each on its own servo, deflect in flight to keep the rocket pointed where we want it. A Main ESP32 runs the flight loop and logs to a microSD card, a Heltec ESP32 downlinks telemetry to a laptop on the ground, and two separate battery systems keep servo current off the electronics rail. It's all off-the-shelf hardware on one perfboard and our own code, and we're writing down the wiring and software so another student team can rebuild it.";

export const goals = [
  {
    num: "01",
    title: "Keep it pointed",
    desc: "Hold the rocket on its planned attitude through powered flight. The Main ESP32 runs the control loop on the IMU and altimeter data and trims the four canards to correct pitch, yaw, and roll.",
  },
  {
    num: "02",
    title: "See the flight",
    desc: "Downlink altitude, velocity, orientation, and GPS position to a laptop over the Heltec's long-range radio, fast enough to watch the flight as it happens, and log every frame to the onboard card for later.",
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
    desc: "Reading the IMU, altimeter, and GPS live on the Main ESP32.",
    did: "Wired the MPU6500 and BMP585 to the Main ESP32 over I2C and the GPS module over UART, then wrote the polling loop that timestamps every sample before it is logged or downlinked. Right now all three sensors read on the bench at a steady 100 Hz.",
    learned: "Keeping the I2C addresses straight matters more than we expected. Once we had two sensors on the same bus we had to check each address before both would enumerate, and we moved the pull-ups onto one board instead of doubling them up.",
    problems: "The GPS took a long time to get its first fix indoors. We ended up testing next to a window and relying on the CR1220 backup cell so it keeps almanac data between power cycles instead of cold-starting every time.",
    images: [
      { src: "/components/perfboard-front.jpg", cap: "Component side: every module on the perfboard, labelled" },
      { placeholder: true, cap: "Add: bench shot of the sensors reading on the serial monitor" },
    ],
  },
  {
    phase: "02",
    title: "Telemetry Link",
    status: "upcoming",
    desc: "The Heltec ESP32 downlinking packets to the ground station.",
    did: "Plan: bring up the Heltec's onboard radio, lock down a packet format for altitude, velocity, orientation, and GPS position, and hand frames to it from the Main ESP32. Bench range test first, then an open-field test to check dropouts.",
    learned: null,
    problems: null,
    images: [{ placeholder: true, cap: "Add: the Heltec transmitting, ground station receiver alongside" }],
  },
  {
    phase: "03",
    title: "Flight Software",
    status: "upcoming",
    desc: "Control loop and sensor fusion running on the Main ESP32.",
    did: "Plan: fuse the IMU, altimeter, and GPS into an attitude estimate on the Main ESP32, run the control loop at 100 Hz, and drive the four canard servos directly from it.",
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
    did: "Plan: run the perfboard off the electronics pack and its step-down converter, run all four BMS-127WV+ servos off the separate servo pack and its own step-down converter, and confirm that a stalling canard no longer disturbs the electronics rail.",
    learned: null,
    problems: null,
    images: [
      { src: "/components/sled-back.jpg", cap: "Back of the sled: both packs, the converters, and the switch terminals at the base" },
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

// Signal and power edges, in the same terminology the architecture diagram and
// the 3D harness use. `kind` separates data flow from power flow so the two can
// be drawn distinguishably wherever this is rendered.
export const dataFlow = [
  { from: "MPU6500", to: "Main ESP32", protocol: "I2C", kind: "data" },
  { from: "BMP585", to: "Main ESP32", protocol: "I2C", kind: "data" },
  { from: "GPS Module", to: "Main ESP32", protocol: "UART", kind: "data" },
  { from: "Main ESP32", to: "MicroSD Card Reader", protocol: "SPI", kind: "data" },
  { from: "Main ESP32", to: "Heltec ESP32", protocol: "UART", kind: "data" },
  { from: "Heltec ESP32", to: "Ground Station", protocol: "RF", kind: "data" },
  { from: "Ground Station", to: "Laptop", protocol: "USB", kind: "data" },
  { from: "Main ESP32", to: "Servos ×4", protocol: "PWM", kind: "data" },
  { from: "Electronics LiPo", to: "Electronics Step-Down", protocol: "7.4V", kind: "power" },
  { from: "Servo LiPo", to: "Servo Step-Down", protocol: "8.4V", kind: "power" },
  { from: "Electronics Step-Down", to: "Switch Housing", protocol: "PWR", kind: "power" },
  { from: "Servo Step-Down", to: "Switch Housing", protocol: "PWR", kind: "power" },
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
// Avionics components — drives the Hardware page, the architecture
// diagram, and the 3D interactive sled.
//
// Physical hierarchy, front to back:
//   front layer    the six electronic modules
//   middle layer   the perfboard they are soldered to
//   rear of board  the point-to-point solder wiring
//   back of sled   batteries, step-down converters, switch housing
//
// `mount` records which of those layers a part belongs to; the 3D layout and
// the exploded animation both read it, so a part can never drift out of the
// layer its description claims. `specs` entries are manufacturer datasheet
// values (source shown in the UI); project claims we have no measured number
// for are left out rather than invented.
// ===================================================================

export const components = [
  {
    id: "esp32-main",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "Main ESP32",
    shortName: "ESP32",
    role: "Primary Flight Controller",
    system: "Processing / Control",
    mount: "perfboard",
    tone: "blue",
    desc: "The primary onboard controller. It reads every sensor on the perfboard, logs flight data to the card, and drives the four canard servos.",
    connectsTo: [
      "MPU6500 (I2C)",
      "BMP585 (I2C)",
      "GPS Module (UART)",
      "MicroSD Card Reader (SPI)",
      "Heltec ESP32 (UART)",
    ],
    usage:
      "Mounted on the component-facing side of the perfboard, on the front of the sled. It polls the IMU, altimeter, and GPS on tight timing, timestamps every sample, writes the flight log through the MicroSD reader, computes the canard corrections, and hands finished telemetry frames to the Heltec for downlink.",
    whySelected:
      "A dual-core microcontroller with hardware UART, I2C, and SPI can service every sensor on the board and still run the control loop, so the avionics collapse onto a single perfboard instead of a stack of separate computers.",
    specs: [
      { label: "MCU", value: "Xtensa dual-core LX6 @ 240 MHz", source: "datasheet" },
      { label: "Interfaces", value: "UART, I2C, SPI, PWM", source: "datasheet" },
      { label: "Role", value: "Sensor polling, logging, control output", source: "project" },
      { label: "Power", value: "5 V on VIN, from the electronics step-down", source: "project" },
      { label: "Mounting", value: "Component side of the perfboard", source: "project" },
    ],
  },
  {
    id: "heltec-esp32",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "Heltec ESP32 Telemetry Transmitter",
    shortName: "HELTEC",
    role: "Telemetry Transmitter",
    system: "Communications",
    mount: "perfboard",
    tone: "orange",
    desc: "An ESP32 module with an onboard long-range radio, dedicated to downlinking flight data to the ground station.",
    connectsTo: ["Main ESP32 (UART)", "Ground station (RF downlink)"],
    usage:
      "Mounted on the perfboard directly forward of the Main ESP32. It receives framed flight data over the serial link and transmits it to the ground station, which keeps the radio's transmit timing off the controller running the flight loop.",
    whySelected:
      "Carrying the radio on the same module as its own microcontroller removes the separate radio breakout the earlier stack used, saves a run of board space, and means a busy downlink can never stall the control loop.",
    specs: [
      { label: "Module", value: "Heltec ESP32 with integrated LoRa radio", source: "datasheet" },
      { label: "Link to controller", value: "UART — Main ESP32 GPIO 19 → Heltec GPIO 44", source: "project" },
      { label: "Role", value: "Telemetry downlink only", source: "project" },
      { label: "Mounting", value: "Component side of the perfboard", source: "project" },
    ],
  },
  {
    id: "gps-module",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "GPS Module",
    shortName: "GPS",
    role: "Position & Velocity",
    system: "Sensing",
    mount: "perfboard",
    tone: "green",
    desc: "GPS receiver providing latitude, longitude, ground speed, and heading for navigation and post-flight reconstruction.",
    connectsTo: ["Main ESP32 (UART)"],
    usage:
      "Mounted at the aft end of the perfboard, where its ceramic patch antenna has the clearest view out of the airframe. It supplies absolute position and velocity to the Main ESP32, which folds them into the telemetry stream and the onboard log.",
    whySelected:
      "A breadboard-friendly receiver with strong community support and an onboard antenna, so it needed no extra RF hardware to sit on the perfboard.",
    specs: [
      { label: "Channels", value: "66 (22 tracking)", source: "datasheet" },
      { label: "Update rate", value: "up to 10 Hz", source: "datasheet" },
      { label: "Interface", value: "UART2 at 9600 baud (TX→GPIO 16, RX→GPIO 17)", source: "project" },
      { label: "Power", value: "3.3 V from the ESP32 — not 5 V", source: "project" },
      { label: "Backup cell", value: "CR1220, keeps almanac between power cycles", source: "project" },
    ],
  },
  {
    id: "bmp585",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "BMP585 Barometric Altimeter",
    shortName: "BARO",
    role: "Barometric Altimeter",
    system: "Sensing",
    mount: "perfboard",
    tone: "green",
    desc: "High-precision barometric pressure sensor that measures pressure and derives altitude through the whole flight profile.",
    connectsTo: ["Main ESP32 (I2C)"],
    usage:
      "Mounted on the perfboard alongside the Main ESP32, sharing the same I2C bus as the IMU. It tracks altitude continuously, confirms apogee, and gives an altitude reading that is independent of GPS lock.",
    whySelected:
      "High-resolution pressure sensing in a small package, giving fine-grained altitude data during ascent without taking much board area.",
    specs: [
      { label: "Type", value: "Barometric pressure sensor (Bosch)", source: "datasheet" },
      { label: "Interface", value: "I2C — SDA GPIO 23, SCL GPIO 32", source: "project" },
      { label: "Power", value: "3.3 V from the ESP32", source: "project" },
      { label: "Use", value: "Altitude tracking and apogee detection", source: "project" },
      { label: "Mounting", value: "Component side of the perfboard", source: "project" },
    ],
  },
  {
    id: "mpu6500",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "MPU6500 IMU",
    shortName: "IMU",
    role: "Inertial Measurement Unit",
    system: "Sensing",
    mount: "perfboard",
    tone: "green",
    desc: "6-axis accelerometer and gyroscope measuring rotational motion and acceleration for attitude determination.",
    connectsTo: ["Main ESP32 (I2C)"],
    usage:
      "Mounted at the forward end of the perfboard, raised on its own header above the MicroSD reader. It supplies angular rate and acceleration to the Main ESP32 and is the primary input to the canard control loop during powered flight.",
    whySelected:
      "A well-documented 6-axis IMU with proven ESP32 libraries and enough sample rate for a 100 Hz attitude loop, in a footprint small enough to ride at the narrow forward end of the bay.",
    specs: [
      { label: "Sensors", value: "3-axis gyro + 3-axis accelerometer", source: "datasheet" },
      { label: "Interface", value: "I2C at 0x68 — shares the bus with the BMP585", source: "project" },
      { label: "Sample rate (project)", value: "100 Hz", source: "project" },
      { label: "Mounting", value: "Raised over the MicroSD reader on the perfboard", source: "project" },
    ],
  },
  {
    id: "microsd",
    photos: ["/components/perfboard-front.jpg", "/components/sled-front.jpg"],
    name: "Adafruit MicroSD Card Reader",
    shortName: "MICROSD",
    role: "Onboard Data Storage",
    system: "Data Storage",
    mount: "perfboard",
    tone: "blue",
    desc: "MicroSD breakout that stores flight and sensor data locally on the vehicle.",
    connectsTo: ["Main ESP32 (SPI)"],
    usage:
      "Mounted at the forward end of the perfboard, under the IMU. The Main ESP32 writes each sample to the card as it is taken, so a full-rate flight log survives on the vehicle even if the radio downlink drops frames.",
    whySelected:
      "Logging on the vehicle means the record does not depend on link quality. The downlink is for watching the flight live; the card is what gets analysed afterward.",
    specs: [
      { label: "Interface", value: "SPI — CS 33, CLK 14, MOSI 13, MISO 27", source: "project" },
      { label: "Power", value: "5 V from the buck rail", source: "project" },
      { label: "Role", value: "Full-rate onboard flight log", source: "project" },
      { label: "Mounting", value: "Component side of the perfboard", source: "project" },
    ],
  },
  {
    id: "perfboard",
    photos: ["/components/perfboard-front.jpg", "/components/perfboard-solder.jpg"],
    name: "Perfboard",
    shortName: "PERFBOARD",
    role: "Avionics Carrier Board",
    system: "Structure",
    mount: "perfboard",
    tone: "metal",
    desc: "The through-hole prototyping board that carries all six avionics modules on the front of the sled.",
    connectsTo: [
      "Main ESP32",
      "Heltec ESP32",
      "GPS Module",
      "BMP585",
      "MPU6500",
      "MicroSD Card Reader",
    ],
    usage:
      "Mounted on the front face of the sled. Every module sits on the component-facing side; the connections between them are soldered point-to-point on the back of the board, which is the face that turns in toward the sled deck. Replacing the earlier multi-board stack with one carrier is what let the whole avionics assembly fit the nose cone taper.",
    whySelected:
      "A single soldered carrier removes the connectors and jumper leads a stacked build needs, which is where vibration failures start on a rocket. Everything is one rigid assembly that goes in and comes out in one piece.",
    specs: [
      { label: "Type", value: "Through-hole perfboard, 2.54 mm pitch", source: "project" },
      { label: "Component side", value: "Six avionics modules", source: "project" },
      { label: "Solder side", value: "Point-to-point wiring, faces the sled deck", source: "project" },
      { label: "Mounting", value: "Front face of the avionics sled", source: "project" },
    ],
  },
  {
    id: "battery-electronics",
    photos: ["/components/sled-back.jpg"],
    name: "7.4V 2S Electronics LiPo Battery",
    shortName: "ELEC BATT",
    role: "Electronics Power Source",
    system: "Power",
    mount: "sled-back",
    tone: "metal",
    desc: "2S LiPo pack that powers the Main ESP32 and the Heltec ESP32.",
    connectsTo: ["Electronics Step-Down Converter"],
    usage:
      "Mounted behind the sled, on the opposite face from the perfboard. It feeds the electronics step-down converter, which reaches the two controllers through the switch housing.",
    whySelected:
      "Giving the controllers their own pack keeps servo current off the electronics rail. Four canards stalling together is exactly the load that would otherwise sag the supply and reset the flight controller mid-flight.",
    specs: [
      { label: "Chemistry", value: "2S LiPo", source: "project" },
      { label: "Nominal voltage", value: "7.4 V", source: "project" },
      { label: "Supplies", value: "Main ESP32 and Heltec ESP32", source: "project" },
      { label: "Mounting", value: "Back of the sled", source: "project" },
    ],
  },
  {
    id: "battery-servo",
    photos: ["/components/sled-back.jpg"],
    name: "8.4V 2S Servo LiPo Battery",
    shortName: "SERVO BATT",
    role: "Servo Power Source",
    system: "Power",
    mount: "sled-back",
    tone: "metal",
    desc: "Second 2S LiPo pack, dedicated entirely to the four canard servos.",
    connectsTo: ["Servo Step-Down Converter"],
    usage:
      "Mounted behind the sled alongside the electronics pack. It feeds the servo step-down converter, which supplies the four canard servos through the switch housing.",
    whySelected:
      "The servos are the only high-current, highly variable load on the vehicle. Isolating them on their own pack means their draw shows up as servo voltage sag rather than as noise on the sensors and the controller.",
    specs: [
      { label: "Chemistry", value: "2S LiPo", source: "project" },
      { label: "Pack voltage", value: "8.4 V", source: "project" },
      { label: "Supplies", value: "Four BMS-127WV+ canard servos", source: "project" },
      { label: "Mounting", value: "Back of the sled", source: "project" },
    ],
  },
  {
    id: "stepdown-electronics",
    photos: ["/components/sled-back.jpg"],
    name: "Electronics Step-Down Converter",
    shortName: "ELEC BUCK",
    role: "Electronics Regulator",
    system: "Power",
    mount: "sled-back",
    tone: "metal",
    desc: "Step-down converter regulating the electronics pack to the supply rail the two controllers run on.",
    connectsTo: ["7.4V 2S Electronics LiPo Battery", "Switch Housing"],
    usage:
      "Mounted on the back of the sled between the electronics pack and the switch housing. It is the only regulator in the controller power path, so the Main ESP32 and the Heltec see one steady rail regardless of pack state of charge.",
    whySelected:
      "A switching converter holds its output as the pack drains, which a direct connection cannot. One regulator per power system also means a fault on the servo side has no path into the electronics side.",
    specs: [
      { label: "Topology", value: "Switching buck converter", source: "datasheet" },
      { label: "Input", value: "7.4 V electronics pack", source: "project" },
      { label: "Output", value: "5 V rail", source: "project" },
      { label: "Feeds", value: "Switch housing, then the two controllers", source: "project" },
      { label: "Mounting", value: "Back of the sled", source: "project" },
    ],
  },
  {
    id: "stepdown-servo",
    photos: ["/components/sled-back.jpg"],
    name: "Servo Step-Down Converter",
    shortName: "SERVO BUCK",
    role: "Servo Regulator",
    system: "Power",
    mount: "sled-back",
    tone: "metal",
    desc: "Second step-down converter, regulating the servo pack to the rail the four canard servos run on.",
    connectsTo: ["8.4V 2S Servo LiPo Battery", "Switch Housing"],
    usage:
      "Mounted on the back of the sled beside the electronics converter. It carries the full servo load on its own, so the current spikes when several canards move together stay inside the servo power system.",
    whySelected:
      "Sizing a regulator for four servos is a different problem from sizing one for two microcontrollers. Splitting them lets each converter be chosen for its own load instead of compromising between them.",
    specs: [
      { label: "Topology", value: "Switching buck converter", source: "datasheet" },
      { label: "Input", value: "8.4 V servo pack", source: "project" },
      { label: "Output", value: "5 V servo rail", source: "project" },
      { label: "Feeds", value: "Switch housing, then the four canard servos", source: "project" },
      { label: "Mounting", value: "Back of the sled", source: "project" },
    ],
  },
  {
    id: "switch-housing",
    photos: ["/components/sled-back.jpg"],
    name: "Switch Housing",
    shortName: "SWITCHES",
    role: "Power Switching & Distribution",
    system: "Power",
    mount: "sled-back",
    tone: "metal",
    desc: "The housing at the base of the sled carrying the arming switches for both power systems.",
    connectsTo: ["Electronics Step-Down Converter", "Servo Step-Down Converter"],
    usage:
      "Mounted at the aft end of the back of the sled. Both step-down converters land here, so the electronics and the servos can each be armed independently from outside the airframe with the vehicle already on the pad.",
    whySelected:
      "Switching at the base means the bay never has to be opened to arm or safe the vehicle, and the two systems stay independently switchable right up to launch.",
    specs: [
      { label: "Systems switched", value: "Electronics and servo power, independently", source: "project" },
      { label: "Fed from", value: "Both step-down converters", source: "project" },
      { label: "Access", value: "From outside the airframe", source: "project" },
      { label: "Mounting", value: "Aft end of the back of the sled", source: "project" },
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
    name: "Four Servos",
    role: "Canard Servo (×4)",
    system: "Actuation",
    desc: "High-torque digital servos actuating the canards for active flight control.",
    connectsTo: ["Main ESP32 (PWM)", "Servo Step-Down Converter (power)", "Canard shaft"],
    usage:
      "Each of the four BlueBird BMS-127WV+ servos drives one canard. Commands come straight from the Main ESP32 as PWM; power comes from the separate servo pack through its own step-down converter and the switch housing, so servo current never crosses onto the electronics rail.",
    whySelected:
      "As a high-voltage digital servo it holds a tight deadband, centers repeatably, and resolves the small, frequent deflection commands the 100 Hz loop issues. That's what keeps the canard angle the controller asks for close to the angle the airframe actually gets.",
    specs: [
      { label: "Model", value: "BlueBird BMS-127WV+", source: "datasheet" },
      { label: "Type", value: "Digital, high-voltage, coreless", source: "datasheet" },
      { label: "Command", value: "50 Hz PWM direct from the Main ESP32", source: "project" },
      { label: "Power", value: "Servo pack via the servo step-down converter", source: "project" },
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
  { id: "nose-cone", name: "Nose Cone", desc: "3D-printed forward section that doubles as the avionics bay. The full sled rides inside it: the perfboard and its six modules on the front face, the batteries, step-down converters, and switch housing on the back." },
  { id: "upper-body", name: "Upper Body Tube", desc: "Forward airframe coupler between the nose and the canard control section." },
  { id: "servo-fin-can", name: "Servo Fin Can", desc: "Structural section carrying the four servo mounts, shaft bearings, and canards." },
  { id: "lower-body", name: "Lower Body Tube", desc: "Main airframe section between the control can and the aft end." },
  { id: "static-fin-can", name: "Static Fin Can", desc: "Fixed fins, lower bearing mount, and motor mount. This is the passive stability at the aft end." },
];

// ===================================================================
// Wiring — the as-built pinout.
//
// This is the bench-verified wiring of the perfboard, transcribed from the
// team's own connection notes and the board drawing below. It is the one place
// on the site that names specific pins, and nothing here is inferred: every row
// is a connection the team recorded. Where the notes cover less than the
// vehicle carries (the canard signal pins), that is stated rather than filled
// in.
// ===================================================================

export const wiringDiagram = {
  src: "/components/perfboard-wiring.png",
  alt: "Perfboard wiring drawing: every net on the board laid out on the 2.54 mm hole grid, showing the ESP32 left and right rails, the Heltec rails, and the GPS, altimeter, IMU, and SD reader headers.",
  cap: "PERFBOARD WIRING / EVERY NET ON THE 2.54 MM GRID",
};

export const connections = [
  {
    id: "gps",
    part: "GPS Module",
    sub: "Adafruit Ultimate GPS V3",
    tone: "green",
    tables: [
      {
        cols: ["GPS Pin", "ESP32 Pin", "Notes"],
        rows: [
          ["VIN", "3.3V", "Do NOT use 5V"],
          ["GND", "GND", "Common ground"],
          ["TX", "GPIO 16", "GPS transmits → ESP32 reads"],
          ["RX", "GPIO 17", "ESP32 sends commands to GPS"],
        ],
      },
    ],
    note: "Baud rate 9600 (default). UART2 on the ESP32.",
  },
  {
    id: "bmp585",
    part: "BMP585 Barometric Altimeter",
    sub: "Shared I2C bus",
    tone: "green",
    tables: [
      {
        cols: ["BMP585 Pin", "ESP32 Pin", "Notes"],
        rows: [
          ["VIN", "3.3V", "—"],
          ["GND", "GND", "Common ground"],
          ["SDA", "GPIO 23", "Shared I2C bus with the IMU"],
          ["SCL", "GPIO 32", "Shared I2C bus with the IMU"],
        ],
      },
    ],
  },
  {
    id: "mpu6500",
    part: "MPU6500 IMU",
    sub: "MPU9250 / MPU6500 breakout",
    tone: "green",
    tables: [
      {
        cols: ["IMU Pin", "ESP32 Pin", "Notes"],
        rows: [
          ["VCC", "3.3V", "—"],
          ["GND", "GND", "Common ground"],
          ["SDA", "GPIO 23", "Shared I2C bus with the BMP585"],
          ["SCL", "GPIO 32", "Shared I2C bus with the BMP585"],
          ["EDA", "—", "Aux I2C master bus — leave unconnected"],
          ["ECL", "—", "Aux I2C master bus — leave unconnected"],
          ["AD0", "GND", "Sets I2C address to 0x68 (tie to 3.3V → 0x69)"],
          ["NCS", "3.3V", "Forces I2C mode — do NOT leave floating"],
          ["FSYNC", "GND", "Tie low — do NOT leave floating"],
        ],
      },
    ],
  },
  {
    id: "microsd",
    part: "Adafruit MicroSD Card Reader",
    sub: "ADA254, SPI",
    tone: "blue",
    tables: [
      {
        cols: ["ADA254 Pin", "ESP32 Pin", "Notes"],
        rows: [
          ["5V", "5V", "Regulator input from the buck / 5V rail"],
          ["GND", "GND", "Common ground"],
          ["CS", "GPIO 33", "Chip select"],
          ["CLK", "GPIO 14", "SPI clock / ESP32 SCK"],
          ["DI", "GPIO 13", "Data into card / ESP32 MOSI"],
          ["DO", "GPIO 27", "Data out of card / ESP32 MISO"],
          ["CD", "—", "Optional card-detect pin; leave unconnected"],
        ],
      },
    ],
  },
  {
    id: "heltec-link",
    part: "Main ESP32 → Heltec ESP32",
    sub: "Direct telemetry link",
    tone: "orange",
    tables: [
      {
        cols: ["Main ESP32", "Heltec", "Direction"],
        rows: [
          ["GPIO 19 (TX)", "GPIO 44 (U0RXD)", "Main ESP32 telemetry → Heltec"],
          ["GND", "GND", "Common ground — required"],
        ],
      },
    ],
  },
  {
    id: "servos",
    part: "Canard Servos",
    sub: "Power and PWM signal",
    tone: "orange",
    tables: [
      {
        cols: ["Servo Wire", "Connects To", "Notes"],
        rows: [
          ["Red (VCC)", "BEC / buck 5V", "Canards share the 5V rail"],
          ["Brown (GND)", "Common GND", "Shared with the ESP32 and the BEC"],
          ["Orange (SIG)", "ESP32 GPIO (below)", "PWM signal at 50 Hz"],
        ],
      },
      {
        cols: ["Servo", "Signal Pin", "Notes"],
        rows: [
          ["Canard 1", "GPIO 26", "Roll fin"],
          ["Canard 2", "GPIO 25", "Roll fin (same signed deflection as Canard 1)"],
        ],
      },
    ],
    note:
      "Signal pins are recorded for two canards so far. The vehicle carries four, and the servo rail is already sized for all four.",
  },
  {
    id: "servo-bec",
    part: "Servo Step-Down Converter",
    sub: "5V BEC, servo power",
    tone: "metal",
    tables: [
      {
        cols: ["BEC Terminal", "Connects To", "Notes"],
        rows: [
          ["+5V output", "All 4 servo red (VCC) wires", "The servo rail"],
          ["GND output", "Common ground rail", "Shared with the ESP32 and servos"],
          ["Input +", "Battery / main power bus", "—"],
          ["Input −", "Battery negative", "—"],
        ],
      },
    ],
  },
  {
    id: "power-summary",
    part: "Power Summary",
    sub: "What runs at what voltage",
    tone: "metal",
    tables: [
      {
        cols: ["Component", "Voltage", "Source"],
        rows: [
          ["Main ESP32", "5V", "2S LiPo → buck step-down → 5V / VIN"],
          ["GPS Module", "3.3V", "ESP32 3.3V pin"],
          ["BMP585", "3.3V", "ESP32 3.3V pin"],
          ["MPU9250 / MPU6500", "3.3V", "ESP32 3.3V pin"],
          ["ADA254 microSD", "5V", "5V rail (buck)"],
        ],
      },
    ],
  },
];

export const LINKS = {
  github: "https://github.com/Thrust-Stack",
};
