import { useState, useEffect } from "react";
import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, useIsMobile } from "../design/primitives";
import { Reveal } from "../design/motion";

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

function ArchDiagram() {
  const N = {
    bmp585: { x: 20, y: 55, w: 120, h: 40 },
    mpu6050: { x: 20, y: 115, w: 120, h: 40 },
    gps: { x: 20, y: 175, w: 120, h: 40 },
    esp32: { x: 290, y: 90, w: 140, h: 60 },
    pi: { x: 580, y: 80, w: 170, h: 80 },
    rfm95w: { x: 820, y: 100, w: 140, h: 40 },
    ground: { x: 820, y: 180, w: 140, h: 40 },
    laptop: { x: 820, y: 260, w: 140, h: 40 },
    pca9685: { x: 290, y: 280, w: 140, h: 40 },
    servos: { x: 500, y: 280, w: 170, h: 40 },
    battery: { x: 20, y: 420, w: 120, h: 40 },
    bec: { x: 290, y: 420, w: 140, h: 40 },
  };

  const cx = (n) => n.x + n.w / 2;
  const cy = (n) => n.y + n.h / 2;
  const rx = (n) => n.x + n.w;
  const by = (n) => n.y + n.h;
  const BL = 200;

  return (
    <svg viewBox="0 0 980 500" style={{ width: "100%", minWidth: "800px", display: "block" }}>
      {/* Sensors → bus → ESP32 */}
      <line x1={rx(N.bmp585)} y1={cy(N.bmp585)} x2={BL} y2={cy(N.bmp585)} stroke={SENSE} strokeOpacity="0.25" strokeWidth="1" />
      <line x1={rx(N.mpu6050)} y1={cy(N.mpu6050)} x2={BL} y2={cy(N.mpu6050)} stroke={SENSE} strokeOpacity="0.25" strokeWidth="1" />
      <line x1={rx(N.gps)} y1={cy(N.gps)} x2={BL} y2={cy(N.gps)} stroke={SENSE} strokeOpacity="0.25" strokeWidth="1" />
      <line x1={BL} y1={cy(N.bmp585)} x2={BL} y2={cy(N.gps)} stroke={SENSE} strokeOpacity="0.15" strokeWidth="2" />
      <circle cx={BL} cy={cy(N.bmp585)} r="3" fill={SENSE} fillOpacity="0.5" />
      <circle cx={BL} cy={cy(N.mpu6050)} r="3" fill={SENSE} fillOpacity="0.5" />
      <circle cx={BL} cy={cy(N.gps)} r="3" fill={SENSE} fillOpacity="0.5" />
      <line x1={BL} y1={cy(N.esp32)} x2={N.esp32.x} y2={cy(N.esp32)} stroke={SENSE} strokeOpacity="0.4" strokeWidth="1.5" />
      <Arrow x={N.esp32.x} y={cy(N.esp32)} dir="right" tone={SENSE} />

      {/* ESP32 ↔ Pi */}
      <line x1={rx(N.esp32)} y1={cy(N.esp32)} x2={N.pi.x} y2={cy(N.pi)} stroke={PROC} strokeOpacity="0.4" strokeWidth="1.5" />
      <Arrow x={rx(N.esp32) + 8} y={cy(N.esp32)} dir="right" tone={PROC} />
      <Arrow x={N.pi.x - 8} y={cy(N.pi)} dir="left" tone={PROC} />

      {/* Pi → RFM95W → Ground → Laptop */}
      <line x1={rx(N.pi)} y1={cy(N.pi)} x2={N.rfm95w.x} y2={cy(N.rfm95w)} stroke={PROC} strokeOpacity="0.4" strokeWidth="1.5" />
      <Arrow x={N.rfm95w.x} y={cy(N.rfm95w)} dir="right" tone={PROC} />
      <line x1={cx(N.rfm95w)} y1={by(N.rfm95w)} x2={cx(N.ground)} y2={N.ground.y} stroke={RF} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="5 3" />
      <Arrow x={cx(N.ground)} y={N.ground.y} dir="down" tone={RF} />
      <line x1={cx(N.ground)} y1={by(N.ground)} x2={cx(N.laptop)} y2={N.laptop.y} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <Arrow x={cx(N.laptop)} y={N.laptop.y} dir="down" tone="rgba(255,255,255,0.4)" />

      {/* ESP32 → PCA9685 → Servos */}
      <line x1={cx(N.esp32)} y1={by(N.esp32)} x2={cx(N.esp32)} y2={N.pca9685.y} stroke={ACT} strokeOpacity="0.35" strokeWidth="1.5" />
      <Arrow x={cx(N.esp32)} y={N.pca9685.y} dir="down" tone={ACT} />
      <line x1={rx(N.pca9685)} y1={cy(N.pca9685)} x2={N.servos.x} y2={cy(N.servos)} stroke={ACT} strokeOpacity="0.35" strokeWidth="1.5" />
      <Arrow x={N.servos.x} y={cy(N.servos)} dir="right" tone={ACT} />

      {/* Power */}
      <line x1={rx(N.battery)} y1={cy(N.battery)} x2={N.bec.x} y2={cy(N.bec)} stroke={PWR} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <Arrow x={N.bec.x} y={cy(N.bec)} dir="right" tone={PWR} />
      <line x1={rx(N.bec)} y1={cy(N.bec)} x2={cx(N.pi)} y2={cy(N.bec)} stroke={PWR} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <line x1={cx(N.pi)} y1={cy(N.bec)} x2={cx(N.pi)} y2={by(N.pi)} stroke={PWR} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <Arrow x={cx(N.pi)} y={by(N.pi)} dir="up" tone={PWR} />

      {/* Protocol labels */}
      <ProtoTag x={160} y={cy(N.bmp585) - 9} text="I2C" tone={SENSE} />
      <ProtoTag x={160} y={cy(N.mpu6050) - 9} text="I2C" tone={SENSE} />
      <ProtoTag x={160} y={cy(N.gps) - 9} text="UART" tone={SENSE} />
      <ProtoTag x={(rx(N.esp32) + N.pi.x) / 2} y={cy(N.esp32) - 9} text="UART" tone={PROC} />
      <ProtoTag x={(rx(N.pi) + N.rfm95w.x) / 2} y={cy(N.pi) - 9} text="SPI" tone={PROC} />
      <ProtoTag x={cx(N.rfm95w) + 32} y={(by(N.rfm95w) + N.ground.y) / 2} text="915MHz" tone={RF} />
      <ProtoTag x={cx(N.ground) + 28} y={(by(N.ground) + N.laptop.y) / 2} text="USB" tone="rgba(255,255,255,0.4)" />
      <ProtoTag x={cx(N.esp32) + 26} y={(by(N.esp32) + N.pca9685.y) / 2} text="I2C" tone={ACT} />
      <ProtoTag x={(rx(N.pca9685) + N.servos.x) / 2} y={cy(N.pca9685) - 9} text="PWM ×4" tone={ACT} />
      <ProtoTag x={(rx(N.battery) + N.bec.x) / 2} y={cy(N.battery) - 9} text="7.4V" tone={PWR} />
      <ProtoTag x={cx(N.pi) + 30} y={(cy(N.bec) + by(N.pi)) / 2} text="5V" tone={PWR} />

      {/* Section labels */}
      <GroupLabel x={20} y={32} tone={SENSE}>SENSOR INPUTS</GroupLabel>
      <GroupLabel x={290} y={32} tone={PROC}>PROCESSING / CONTROL</GroupLabel>
      <GroupLabel x={890} y={70} tone={PROC} anchor="middle">TELEMETRY / GROUND STN</GroupLabel>
      <GroupLabel x={360} y={267} tone={ACT} anchor="middle">ACTUATOR OUTPUTS</GroupLabel>
      <GroupLabel x={205} y={407} tone={PWR} anchor="middle">POWER SYSTEM</GroupLabel>

      {/* Nodes */}
      <ArchNode {...N.bmp585} label="BMP585" sub="ALTIMETER" tone={SENSE} />
      <ArchNode {...N.mpu6050} label="MPU6050" sub="IMU" tone={SENSE} />
      <ArchNode {...N.gps} label="GPS V3" sub="POSITION" tone={SENSE} />
      <ArchNode {...N.esp32} label="ESP32" sub="SENSOR/SERVO COMM" tone={PROC} />
      <ArchNode {...N.pi} label="Raspberry Pi 5" sub="FLIGHT COMPUTER" tone={PROC} />
      <ArchNode {...N.rfm95w} label="RFM95W" sub="915MHz RADIO" tone={RF} />
      <ArchNode {...N.ground} label="Ground Stn" sub="RECEIVER" tone="rgba(255,255,255,0.45)" />
      <ArchNode {...N.laptop} label="Laptop" sub="DASHBOARD" tone="rgba(255,255,255,0.45)" />
      <ArchNode {...N.pca9685} label="PCA9685" sub="SERVO DRIVER" tone={ACT} />
      <ArchNode {...N.servos} label="Servos ×4" sub="BMS-127WV+" tone={ACT} />
      <ArchNode {...N.battery} label="Battery" sub="7.4V SRC" tone={PWR} />
      <ArchNode {...N.bec} label="BEC UBEC" sub="5V STEP-DOWN" tone={PWR} />
    </svg>
  );
}

// ─── Page ───

export default function Telemetry() {
  const telem = useTelemetry();
  const { altHistory, accelHistory } = telem;
  const isMobile = useIsMobile();

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
              The BMP585, MPU6050, and GPS feed sensor data to the ESP32, which exchanges
              telemetry with the Raspberry Pi 5 and drives the PCA9685 to actuate the
              canard servos. The Pi downlinks flight data over 915 MHz LoRa to the ground
              station, while a separate 7.4 V → 5 V rail powers the flight computer.
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
              { label: "SENSOR BUS", tone: SENSE },
              { label: "PROCESSING", tone: PROC },
              { label: "ACTUATION", tone: ACT },
              { label: "915MHz RF", tone: RF, dashed: true },
              { label: "POWER RAIL", tone: PWR, dashed: true },
            ].map(({ label, tone, dashed }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={tone} strokeWidth="1.5" strokeOpacity="0.7" strokeDasharray={dashed ? "4 2" : undefined} />
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
