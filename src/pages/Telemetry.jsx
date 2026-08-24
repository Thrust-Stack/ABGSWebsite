import { useState, useEffect, lazy, Suspense } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, useIsMobile } from "../design/primitives";
import { Reveal } from "../design/motion";
import { useWebGLSupport, usePrefersReducedMotion } from "../three/hooks";
import DeferredRender from "../components/DeferredRender";

// The live servo fin-can render pulls in three/R3F; lazy-load it so the
// Telemetry page bundle stays light and the 3D code splits into its own chunk.
const ServoFinCanViewer = lazy(() => import("../three/ServoFinCanViewer"));
const SimulationWindow = lazy(() => import("../components/SimulationWindow"));

function ThreeLoadingState({ height = 300, label = "LOADING 3D…" }) {
  return (
    <div style={{ minHeight: height, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color.line2}`, borderRadius: radius.lg, fontFamily: font.mono, fontSize: 10, letterSpacing: "0.24em", color: color.textGhost }}>
      {label}
    </div>
  );
}

// System colors for the architecture diagram
const SENSE = color.green;
const PROC = color.blue;
const ACT = color.orange;
const RF = "#ff8a52";
const PWR = color.metal;

// ─── Telemetry simulation (simulated flight profile, looping) ───
// All values (including graph history) are computed inside the interval so
// rendering stays pure.

function computeSample(t) {
  const noise = () => (Math.random() - 0.5) * 0.4;
  let phase;
  if (t < 3) phase = "pre";
  else if (t < 5) phase = "ignition";
  else if (t < 18) phase = "ascent";
  else if (t < 22) phase = "coast";
  else phase = "descent";

  let alt = 0, speed = 0, accelZ, gyroX, gyroY, lat = 37.39208;
  const flightT = Math.max(0, t - 5);

  if (phase === "pre") {
    accelZ = 9.81 + noise() * 0.1; gyroX = noise() * 0.2; gyroY = noise() * 0.2;
  } else if (phase === "ignition") {
    const p = (t - 3) / 2;
    accelZ = 9.81 + p * 35 + noise(); alt = p * 2; speed = p * 15;
    gyroX = noise() * 2; gyroY = noise() * 2;
  } else if (phase === "ascent") {
    accelZ = 30 + Math.sin(flightT * 0.5) * 5 + noise() * 2;
    alt = 50 + flightT * 80 - flightT * flightT * 1.5;
    speed = 120 + flightT * 8 - flightT * flightT * 0.4;
    gyroX = Math.sin(flightT * 0.8) * 3 + noise();
    gyroY = Math.cos(flightT * 0.6) * 2 + noise();
    lat += flightT * 0.00001;
  } else if (phase === "coast") {
    const p = (t - 18) / 4;
    accelZ = 2 - p * 3 + noise(); alt = 800 + (1 - p) * 50; speed = Math.max(0, 60 - p * 60);
    gyroX = noise() * 1.5; gyroY = noise() * 1.5;
  } else {
    const p = (t - 22) / 8;
    accelZ = -5 + noise(); alt = Math.max(0, 850 - p * 850); speed = -(20 + noise() * 3);
    gyroX = noise() * 0.5; gyroY = noise() * 0.5;
  }

  return { phase, t, alt, speed, accelZ, gyroX, gyroY, lat };
}

const INITIAL_TELEMETRY = {
  ...{ phase: "pre", t: 0, alt: 0, speed: 0, accelZ: 9.81, gyroX: 0, gyroY: 0, lat: 37.39208 },
  altHistory: Array(60).fill(0),
  accelHistory: Array(60).fill(9.81),
};

function useTelemetry() {
  const [state, setState] = useState(INITIAL_TELEMETRY);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const t = prev.t + 0.05 >= 30 ? 0 : prev.t + 0.05;
        const sample = computeSample(t);
        return {
          ...sample,
          altHistory: [...prev.altHistory.slice(1), sample.alt],
          accelHistory: [...prev.accelHistory.slice(1), sample.accelZ],
        };
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return state;
}

function TelemetryValue({ label, value, unit, highlight }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textFaint, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontFamily: font.mono, fontSize: 21, fontWeight: 600, color: highlight ? color.green : color.text, lineHeight: 1 }}>
        {value}
        <span style={{ fontSize: 11, color: color.textFaint, marginLeft: 4 }}>{unit}</span>
      </span>
    </div>
  );
}

function MiniGraph({ data, stroke, height = 50 }) {
  const width = 200;
  const max = Math.max(...data.map(Math.abs), 1);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height / 2 - (v / max) * (height / 2 - 4)}`)
    .join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.8" />
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Architecture diagram ───

function ArchNode({ x, y, w, h, label, sub, tone }) {
  const cx = x + w / 2, cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="rgba(8,9,11,0.55)" stroke={tone} strokeWidth="1" strokeOpacity="0.5" />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={tone} fontSize="12" fontFamily={font.mono} fontWeight="600" fillOpacity="0.95">
        {label}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={tone} fontSize="8" fontFamily={font.mono} letterSpacing="1.5" fillOpacity="0.4">
        {sub}
      </text>
    </g>
  );
}

function ProtoTag({ x, y, text, tone }) {
  const w = text.length * 7.4 + 12;
  return (
    <g>
      <rect x={x - w / 2} y={y - 8} width={w} height={15} rx={3} fill="rgba(8,9,11,0.92)" stroke={tone} strokeWidth="0.8" strokeOpacity="0.55" />
      <text x={x} y={y + 3} textAnchor="middle" fill={tone} fontSize="8" fontFamily={font.mono} letterSpacing="0.5" fillOpacity="0.95">
        {text}
      </text>
    </g>
  );
}

function Arrow({ x, y, dir = "right", tone }) {
  const pts = {
    right: `${x - 6},${y - 4} ${x},${y} ${x - 6},${y + 4}`,
    left: `${x + 6},${y - 4} ${x},${y} ${x + 6},${y + 4}`,
    down: `${x - 4},${y - 6} ${x},${y} ${x + 4},${y - 6}`,
    up: `${x - 4},${y + 6} ${x},${y} ${x + 4},${y + 6}`,
  };
  return <polygon points={pts[dir]} fill={tone} fillOpacity="0.7" />;
}

function GroupLabel({ x, y, tone, children, anchor = "start" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fill={tone} fontSize="9.5" fontFamily={font.mono} fontWeight="600" letterSpacing="2.5" fillOpacity="0.55">
      {children}
    </text>
  );
}

/**
 * Hardware architecture, power distribution, and data flow in one figure.
 *
 * It is laid out as the vehicle is physically laid out: everything above the
 * divider is on the perfboard on the front of the sled, everything below it is
 * the power system on the back. Data runs are solid and follow the subsystem
 * colour code; power runs are dashed in the power tone and stay entirely in
 * the lower band, so the two flows never have to be told apart by reading.
 */
function ArchDiagram() {
  const N = {
    // --- front of the sled: the perfboard ---
    mpu6500: { x: 20, y: 55, w: 125, h: 40 },
    bmp585: { x: 20, y: 113, w: 125, h: 40 },
    gps: { x: 20, y: 171, w: 125, h: 40 },
    esp32: { x: 300, y: 100, w: 150, h: 66 },
    microsd: { x: 250, y: 210, w: 140, h: 44 },
    heltec: { x: 545, y: 105, w: 150, h: 56 },
    ground: { x: 790, y: 105, w: 160, h: 44 },
    laptop: { x: 790, y: 180, w: 160, h: 44 },
    servos: { x: 545, y: 300, w: 170, h: 44 },
    // --- back of the sled: the two power systems ---
    battElec: { x: 20, y: 400, w: 155, h: 44 },
    buckElec: { x: 250, y: 400, w: 175, h: 44 },
    battServo: { x: 20, y: 480, w: 155, h: 44 },
    buckServo: { x: 250, y: 480, w: 175, h: 44 },
    switches: { x: 500, y: 420, w: 160, h: 84 },
    pwrElec: { x: 735, y: 400, w: 215, h: 44 },
    pwrServo: { x: 735, y: 480, w: 215, h: 44 },
  };

  const cx = (n) => n.x + n.w / 2;
  const cy = (n) => n.y + n.h / 2;
  const rx = (n) => n.x + n.w;
  const by = (n) => n.y + n.h;
  const BUS = 190; // the shared sensor bus spine
  const PWR_DASH = "2 5";
  const RF_DASH = "6 4";

  // Elbow: out along x, turn, in along y. Every power run uses one, which is
  // what keeps the lower band orthogonal and readable.
  const elbow = (x1, y1, x2, y2, turn) =>
    `${x1},${y1} ${turn},${y1} ${turn},${y2} ${x2},${y2}`;

  return (
    <svg
      viewBox="0 0 980 560"
      role="img"
      aria-label="Avionics architecture: the six perfboard modules on the front of the sled feeding the Main ESP32, which logs to the MicroSD reader, drives four canard servos, and passes telemetry to the Heltec ESP32 for downlink; below, two separate battery and step-down systems meeting at the switch housing on the back of the sled."
      style={{ width: "100%", minWidth: "820px", display: "block" }}
    >
      {/* ---- sensors -> shared bus -> Main ESP32 ---- */}
      {[N.mpu6500, N.bmp585, N.gps].map((n, i) => (
        <g key={i}>
          <line x1={rx(n)} y1={cy(n)} x2={BUS} y2={cy(n)} stroke={SENSE} strokeOpacity="0.3" strokeWidth="1.2" />
          <circle cx={BUS} cy={cy(n)} r="3" fill={SENSE} fillOpacity="0.55" />
        </g>
      ))}
      <line x1={BUS} y1={cy(N.mpu6500)} x2={BUS} y2={cy(N.gps)} stroke={SENSE} strokeOpacity="0.18" strokeWidth="2.5" />
      <line x1={BUS} y1={cy(N.esp32)} x2={N.esp32.x} y2={cy(N.esp32)} stroke={SENSE} strokeOpacity="0.45" strokeWidth="1.6" />
      <Arrow x={N.esp32.x} y={cy(N.esp32)} dir="right" tone={SENSE} />

      {/* ---- Main ESP32 -> MicroSD reader (logging) ---- */}
      <line x1={320} y1={by(N.esp32)} x2={320} y2={N.microsd.y} stroke={PROC} strokeOpacity="0.4" strokeWidth="1.6" />
      <Arrow x={320} y={N.microsd.y} dir="down" tone={PROC} />

      {/* ---- Main ESP32 -> canard servos ---- */}
      <polyline
        points={elbow(430, by(N.esp32), N.servos.x, cy(N.servos), 430)}
        fill="none"
        stroke={ACT}
        strokeOpacity="0.4"
        strokeWidth="1.6"
      />
      <Arrow x={N.servos.x} y={cy(N.servos)} dir="right" tone={ACT} />

      {/* ---- Main ESP32 -> Heltec -> ground station -> laptop ---- */}
      <line x1={rx(N.esp32)} y1={cy(N.esp32)} x2={N.heltec.x} y2={cy(N.heltec)} stroke={PROC} strokeOpacity="0.45" strokeWidth="1.6" />
      <Arrow x={N.heltec.x} y={cy(N.heltec)} dir="right" tone={PROC} />
      <line x1={rx(N.heltec)} y1={cy(N.heltec)} x2={N.ground.x} y2={cy(N.ground)} stroke={RF} strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray={RF_DASH} />
      <Arrow x={N.ground.x} y={cy(N.ground)} dir="right" tone={RF} />
      <line x1={cx(N.ground)} y1={by(N.ground)} x2={cx(N.laptop)} y2={N.laptop.y} stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
      <Arrow x={cx(N.laptop)} y={N.laptop.y} dir="down" tone="rgba(255,255,255,0.45)" />

      {/* ---- the divider: front of the sled above, back of the sled below ---- */}
      <line x1={20} y1={365} x2={950} y2={365} stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 6" />

      {/* ---- power: pack -> its own converter -> switch housing -> load ---- */}
      {[
        { b: N.battElec, k: N.buckElec, turn: 462, sy: 440 },
        { b: N.battServo, k: N.buckServo, turn: 462, sy: 484 },
      ].map(({ b, k, turn, sy }, i) => (
        <g key={i}>
          <line x1={rx(b)} y1={cy(b)} x2={k.x} y2={cy(k)} stroke={PWR} strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray={PWR_DASH} />
          <Arrow x={k.x} y={cy(k)} dir="right" tone={PWR} />
          <polyline points={elbow(rx(k), cy(k), N.switches.x, sy, turn)} fill="none" stroke={PWR} strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray={PWR_DASH} />
          <Arrow x={N.switches.x} y={sy} dir="right" tone={PWR} />
        </g>
      ))}
      {[
        { t: N.pwrElec, sy: 440 },
        { t: N.pwrServo, sy: 484 },
      ].map(({ t, sy }, i) => (
        <g key={i}>
          <polyline points={elbow(rx(N.switches), sy, t.x, cy(t), 700)} fill="none" stroke={PWR} strokeOpacity="0.45" strokeWidth="1.6" strokeDasharray={PWR_DASH} />
          <Arrow x={t.x} y={cy(t)} dir="right" tone={PWR} />
        </g>
      ))}

      {/* ---- protocol labels ---- */}
      <ProtoTag x={162} y={cy(N.mpu6500) - 9} text="I2C" tone={SENSE} />
      <ProtoTag x={162} y={cy(N.bmp585) - 9} text="I2C" tone={SENSE} />
      <ProtoTag x={162} y={cy(N.gps) - 9} text="UART" tone={SENSE} />
      <ProtoTag x={346} y={188} text="SPI" tone={PROC} />
      <ProtoTag x={(rx(N.esp32) + N.heltec.x) / 2} y={cy(N.esp32) - 9} text="UART" tone={PROC} />
      <ProtoTag x={(rx(N.heltec) + N.ground.x) / 2} y={cy(N.heltec) - 9} text="RF" tone={RF} />
      <ProtoTag x={cx(N.ground) + 26} y={(by(N.ground) + N.laptop.y) / 2} text="USB" tone="rgba(255,255,255,0.45)" />
      <ProtoTag x={490} y={cy(N.servos) - 9} text="PWM ×4" tone={ACT} />
      <ProtoTag x={(rx(N.battElec) + N.buckElec.x) / 2} y={cy(N.battElec) - 9} text="7.4V" tone={PWR} />
      <ProtoTag x={(rx(N.battServo) + N.buckServo.x) / 2} y={cy(N.battServo) - 9} text="8.4V" tone={PWR} />

      {/* ---- section labels ---- */}
      <GroupLabel x={20} y={32} tone={SENSE}>SENSING</GroupLabel>
      <GroupLabel x={250} y={82} tone={PROC}>CONTROL + STORAGE</GroupLabel>
      <GroupLabel x={870} y={88} tone={RF} anchor="middle">TELEMETRY / GROUND STN</GroupLabel>
      <GroupLabel x={630} y={288} tone={ACT} anchor="middle">ACTUATION</GroupLabel>
      <GroupLabel x={950} y={32} tone="rgba(255,255,255,0.4)" anchor="end">FRONT OF SLED / PERFBOARD</GroupLabel>
      <GroupLabel x={20} y={388} tone={PWR}>BACK OF SLED / POWER</GroupLabel>

      {/* ---- nodes ---- */}
      <ArchNode {...N.mpu6500} label="MPU6500" sub="IMU" tone={SENSE} />
      <ArchNode {...N.bmp585} label="BMP585" sub="ALTIMETER" tone={SENSE} />
      <ArchNode {...N.gps} label="GPS Module" sub="POSITION" tone={SENSE} />
      <ArchNode {...N.esp32} label="Main ESP32" sub="FLIGHT CONTROLLER" tone={PROC} />
      <ArchNode {...N.microsd} label="MicroSD Reader" sub="ONBOARD LOG" tone={PROC} />
      <ArchNode {...N.heltec} label="Heltec ESP32" sub="TELEMETRY TX" tone={RF} />
      <ArchNode {...N.ground} label="Ground Stn" sub="RECEIVER" tone="rgba(255,255,255,0.45)" />
      <ArchNode {...N.laptop} label="Laptop" sub="DASHBOARD" tone="rgba(255,255,255,0.45)" />
      <ArchNode {...N.servos} label="Servos ×4" sub="BMS-127WV+" tone={ACT} />
      <ArchNode {...N.battElec} label="7.4V 2S LiPo" sub="ELECTRONICS" tone={PWR} />
      <ArchNode {...N.buckElec} label="Step-Down" sub="ELECTRONICS" tone={PWR} />
      <ArchNode {...N.battServo} label="8.4V 2S LiPo" sub="SERVO" tone={PWR} />
      <ArchNode {...N.buckServo} label="Step-Down" sub="SERVO" tone={PWR} />
      <ArchNode {...N.switches} label="Switch Housing" sub="ARM / SAFE" tone={PWR} />
      <ArchNode {...N.pwrElec} label="Main + Heltec ESP32" sub="ELECTRONICS RAIL" tone={PROC} />
      <ArchNode {...N.pwrServo} label="Four Servos" sub="SERVO RAIL" tone={ACT} />
    </svg>
  );
}

// ─── Page ───

export default function Telemetry() {
  const telem = useTelemetry();
  const { altHistory, accelHistory } = telem;
  const isMobile = useIsMobile();
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();

  const phaseLabels = { pre: "PRE-LAUNCH", ignition: "IGNITION", ascent: "POWERED ASCENT", coast: "COAST", descent: "DESCENT" };
  const phaseColors = { pre: color.textFaint, ignition: color.orange, ascent: color.green, coast: color.blue, descent: color.orangeBright };

  return (
    <>
      <section style={{ padding: isMobile ? "110px 20px 40px" : "150px 24px 60px" }}>
        <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
          <Reveal>
            <Kicker tone="green">LIVE DEMO</Kicker>
            <SectionTitle>Telemetry Simulation</SectionTitle>
            <Lead>
              Simulated flight data standing in for what the ground station receives during a
              launch. This is roughly what the real-time telemetry should look like on flight
              day.
            </Lead>
          </Reveal>

          <Reveal delay={0.08}>
            <div style={{ marginTop: 40 }}>
              <DeferredRender
                minHeight={610}
                fallback={<ThreeLoadingState height={610} label="PREPARING FULL-BODY SIMULATION…" />}
              >
                <Suspense fallback={<ThreeLoadingState height={610} label="LOADING FLIGHT MODEL…" />}>
                  <SimulationWindow webgl={webgl} reduced={reduced} />
                </Suspense>
              </DeferredRender>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div style={{ marginTop: isMobile ? 56 : 78 }}>
              <Kicker tone="orange">ACTUATOR DETAIL</Kicker>
              <SectionTitle style={{ fontSize: "clamp(24px, 3vw, 34px)" }}>Canard subsystem loop</SectionTitle>
              <Lead>
                A separate close-up keeps the original servo mechanism visible while the
                full-body window above focuses on vehicle attitude and replay controls.
              </Lead>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                background: "rgba(8,9,11,0.6)",
                border: `1px solid ${color.line2}`,
                borderRadius: radius.lg,
                padding: isMobile ? 18 : 30,
                marginTop: 40,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${color.line}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: phaseColors[telem.phase], animation: "ts-blink 1s infinite" }} />
                  <span style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: "0.24em", color: phaseColors[telem.phase], fontWeight: 600 }}>
                    {phaseLabels[telem.phase]}
                  </span>
                </div>
                <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint }}>
                  T+{Math.max(0, telem.t - 5).toFixed(1)}s
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 24, marginBottom: 24 }}>
                <TelemetryValue label="Altitude" value={telem.alt.toFixed(1)} unit="m" highlight />
                <TelemetryValue label="Speed" value={telem.speed.toFixed(1)} unit="m/s" />
                <TelemetryValue label="Accel Z" value={telem.accelZ.toFixed(2)} unit="m/s²" />
                <TelemetryValue label="Gyro X" value={telem.gyroX.toFixed(2)} unit="°/s" />
                <TelemetryValue label="Gyro Y" value={telem.gyroY.toFixed(2)} unit="°/s" />
                <TelemetryValue label="Latitude" value={telem.lat.toFixed(6)} unit="°N" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: radius.base, padding: 14 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textFaint, marginBottom: 8 }}>ALTITUDE</div>
                  <MiniGraph data={altHistory} stroke={color.green} />
                </div>
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: radius.base, padding: 14 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textFaint, marginBottom: 8 }}>ACCELERATION Z</div>
                  <MiniGraph data={accelHistory} stroke={color.blue} />
                </div>
              </div>

              {/* Live canard response — the servo fin can, deflecting in real time
                  off the same simulated gyro rates shown in the readout above. */}
              {webgl && (
                <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: radius.base, padding: 14, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textFaint }}>
                      CANARD RESPONSE
                    </span>
                    <span style={{ fontFamily: font.mono, fontSize: 9, letterSpacing: "0.16em", color: color.orangeBright, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color.orange, animation: "ts-blink 1s infinite" }} />
                      DEFLECTION ∝ GYRO X / Y
                    </span>
                  </div>
                  <DeferredRender
                    minHeight={isMobile ? 240 : 320}
                    rootMargin="160px 0px"
                    fallback={<ThreeLoadingState height={isMobile ? 240 : 320} label="3D VIEW STANDBY" />}
                  >
                    <Suspense fallback={<ThreeLoadingState height={isMobile ? 240 : 320} />}>
                      <ServoFinCanViewer gyroX={telem.gyroX} gyroY={telem.gyroY} reduced={reduced} height={isMobile ? 240 : 320} />
                    </Suspense>
                  </DeferredRender>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: isMobile ? "24px 20px 60px" : "40px 24px 100px" }}>
        <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
          <Reveal>
            <Kicker>SYSTEM OVERVIEW</Kicker>
            <SectionTitle>Data Architecture</SectionTitle>
            <Lead>
              The MPU6500, BMP585, and GPS all sit on the perfboard and feed the Main ESP32,
              which logs every sample through the MicroSD reader, drives the four canard
              servos, and hands telemetry frames to the Heltec ESP32 for downlink to the
              ground station. Behind the sled, two batteries run two separate power systems:
              each has its own step-down converter, and both are switched at the housing.
            </Lead>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                background: "rgba(255,255,255,0.015)",
                border: `1px solid ${color.line}`,
                borderRadius: radius.lg,
                padding: isMobile ? "16px 12px" : "32px 24px",
                overflowX: "auto",
                marginTop: 40,
              }}
            >
              <ArchDiagram />
            </div>
          </Reveal>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20, justifyContent: "center" }}>
            {[
              { label: "SENSOR DATA", tone: SENSE },
              { label: "CONTROL / STORAGE", tone: PROC },
              { label: "ACTUATION", tone: ACT },
              { label: "RF DOWNLINK", tone: RF, dash: "6 4" },
              { label: "POWER", tone: PWR, dash: "2 5" },
            ].map(({ label, tone, dash }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={tone} strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray={dash} />
                </svg>
                <span style={{ fontFamily: font.mono, fontSize: 10, color: color.textFaint, letterSpacing: "0.14em" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
