import { useState, useEffect } from "react";
import { dataFlow, mono, display, accent, accentBlue, SectionLabel, SectionTitle } from "../shared";

// ─── Telemetry simulation ───

function useTelemetry() {
  const [t, setT] = useState(0);
  const [phase, setPhase] = useState("pre");

  useEffect(() => {
    const interval = setInterval(() => {
      setT(prev => {
        const next = prev + 0.05;
        if (next < 3) setPhase("pre");
        else if (next < 5) setPhase("ignition");
        else if (next < 18) setPhase("ascent");
        else if (next < 22) setPhase("coast");
        else if (next < 30) setPhase("descent");
        else { setPhase("pre"); return 0; }
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const noise = () => (Math.random() - 0.5) * 0.4;
  let alt = 0, speed = 0, accelZ = 9.81, gyroX = 0, gyroY = 0, lat = 37.392080;
  const flightT = Math.max(0, t - 5);

  if (phase === "pre") {
    alt = 0; speed = 0; accelZ = 9.81 + noise() * 0.1; gyroX = noise() * 0.2; gyroY = noise() * 0.2;
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
  } else if (phase === "descent") {
    const p = (t - 22) / 8;
    accelZ = -5 + noise(); alt = Math.max(0, 850 - p * 850); speed = -(20 + noise() * 3);
    gyroX = noise() * 0.5; gyroY = noise() * 0.5;
  }

  return { phase, t, alt, speed, accelZ, gyroX, gyroY, lat };
}

function TelemetryValue({ label, value, unit, highlight }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <span style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 600, color: highlight ? accent : "#fff", lineHeight: 1 }}>
        {value}<span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginLeft: "4px" }}>{unit}</span>
      </span>
    </div>
  );
}

function MiniGraph({ data, color, height = 50 }) {
  const width = 200;
  const max = Math.max(...data.map(Math.abs), 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height / 2 - (v / max) * (height / 2 - 4)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
    </svg>
  );
}

// ─── Architecture diagram ───

function ArchNode({ x, y, w, h, label, sub, color }) {
  const cx = x + w / 2, cy = y + h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5}
        fill="rgba(0,0,0,0.35)" stroke={color} strokeWidth="1" strokeOpacity="0.45" />
      <text x={cx} y={cy - 6} textAnchor="middle"
        fill={color} fontSize="12" fontFamily={mono} fontWeight="600" fillOpacity="0.9">{label}</text>
      <text x={cx} y={cy + 8} textAnchor="middle"
        fill={color} fontSize="8" fontFamily={mono} letterSpacing="1.5" fillOpacity="0.35">{sub}</text>
    </g>
  );
}

function ProtoTag({ x, y, text, color }) {
  const w = text.length * 7.4 + 12;
  return (
    <g>
      <rect x={x - w / 2} y={y - 8} width={w} height={15} rx={3}
        fill="rgba(8,10,14,0.92)" stroke={color} strokeWidth="0.8" strokeOpacity="0.55" />
      <text x={x} y={y + 3} textAnchor="middle"
        fill={color} fontSize="8" fontFamily={mono} letterSpacing="0.5" fillOpacity="0.9">{text}</text>
    </g>
  );
}

function Arrow({ x, y, dir = "right", color }) {
  const pts = {
    right: `${x - 6},${y - 4} ${x},${y} ${x - 6},${y + 4}`,
    left:  `${x + 6},${y - 4} ${x},${y} ${x + 6},${y + 4}`,
    down:  `${x - 4},${y - 6} ${x},${y} ${x + 4},${y - 6}`,
    up:    `${x - 4},${y + 6} ${x},${y} ${x + 4},${y + 6}`,
  };
  return <polygon points={pts[dir]} fill={color} fillOpacity="0.65" />;
}

function GroupLabel({ x, y, color, children, anchor = "start" }) {
  return (
    <text x={x} y={y} textAnchor={anchor}
      fill={color} fontSize="9.5" fontFamily={mono} fontWeight="600" letterSpacing="2.5" fillOpacity="0.55">
      {children}
    </text>
  );
}

function ArchDiagram() {
  const powerColor = "#cc88ff";

  const N = {
    bmp585:  { x: 20,  y: 55,  w: 120, h: 40 },
    mpu6050: { x: 20,  y: 115, w: 120, h: 40 },
    gps:     { x: 20,  y: 175, w: 120, h: 40 },
    esp32:   { x: 290, y: 90,  w: 140, h: 60 },
    pi:      { x: 580, y: 80,  w: 170, h: 80 },
    rfm95w:  { x: 820, y: 100, w: 140, h: 40 },
    ground:  { x: 820, y: 180, w: 140, h: 40 },
    laptop:  { x: 820, y: 260, w: 140, h: 40 },
    pca9685: { x: 290, y: 280, w: 140, h: 40 },
    servos:  { x: 500, y: 280, w: 170, h: 40 },
    battery: { x: 20,  y: 420, w: 120, h: 40 },
    bec:     { x: 290, y: 420, w: 140, h: 40 },
  };

  const cx = n => n.x + n.w / 2;
  const cy = n => n.y + n.h / 2;
  const rx = n => n.x + n.w;
  const by = n => n.y + n.h;

  const BL = 200; // sensor bus x

  return (
    <svg viewBox="0 0 980 500" style={{ width: "100%", display: "block" }}>

      {/* ── Sensor Inputs → bus → ESP32 ── */}
      <line x1={rx(N.bmp585)}  y1={cy(N.bmp585)}  x2={BL} y2={cy(N.bmp585)}  stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      <line x1={rx(N.mpu6050)} y1={cy(N.mpu6050)} x2={BL} y2={cy(N.mpu6050)} stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      <line x1={rx(N.gps)}     y1={cy(N.gps)}     x2={BL} y2={cy(N.gps)}     stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      <line x1={BL} y1={cy(N.bmp585)} x2={BL} y2={cy(N.gps)} stroke="rgba(0,255,170,0.1)" strokeWidth="2" />
      <circle cx={BL} cy={cy(N.bmp585)}  r="3" fill="rgba(0,255,170,0.45)" />
      <circle cx={BL} cy={cy(N.mpu6050)} r="3" fill="rgba(0,255,170,0.45)" />
      <circle cx={BL} cy={cy(N.gps)}     r="3" fill="rgba(0,255,170,0.45)" />
      <line x1={BL} y1={cy(N.esp32)} x2={N.esp32.x} y2={cy(N.esp32)} stroke="rgba(0,255,170,0.35)" strokeWidth="1.5" />
      <Arrow x={N.esp32.x} y={cy(N.esp32)} dir="right" color={accent} />

      {/* ── ESP32 ↔ Raspberry Pi 5 (bidirectional) ── */}
      <line x1={rx(N.esp32)} y1={cy(N.esp32)} x2={N.pi.x} y2={cy(N.pi)} stroke="rgba(0,170,255,0.35)" strokeWidth="1.5" />
      <Arrow x={rx(N.esp32) + 8} y={cy(N.esp32)} dir="right" color={accentBlue} />
      <Arrow x={N.pi.x - 8} y={cy(N.pi)} dir="left" color={accentBlue} />

      {/* ── Raspberry Pi 5 → RFM95W → Ground Stn → Laptop ── */}
      <line x1={rx(N.pi)} y1={cy(N.pi)} x2={N.rfm95w.x} y2={cy(N.rfm95w)} stroke="rgba(0,170,255,0.35)" strokeWidth="1.5" />
      <Arrow x={N.rfm95w.x} y={cy(N.rfm95w)} dir="right" color={accentBlue} />
      <line x1={cx(N.rfm95w)} y1={by(N.rfm95w)} x2={cx(N.ground)} y2={N.ground.y} stroke="rgba(255,100,68,0.35)" strokeWidth="1.5" strokeDasharray="5 3" />
      <Arrow x={cx(N.ground)} y={N.ground.y} dir="down" color="#ff6644" />
      <line x1={cx(N.ground)} y1={by(N.ground)} x2={cx(N.laptop)} y2={N.laptop.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <Arrow x={cx(N.laptop)} y={N.laptop.y} dir="down" color="rgba(255,255,255,0.4)" />

      {/* ── ESP32 → PCA9685 → Servos ── */}
      <line x1={cx(N.esp32)} y1={by(N.esp32)} x2={cx(N.esp32)} y2={N.pca9685.y} stroke="rgba(255,170,0,0.3)" strokeWidth="1.5" />
      <Arrow x={cx(N.esp32)} y={N.pca9685.y} dir="down" color="#ffaa00" />
      <line x1={rx(N.pca9685)} y1={cy(N.pca9685)} x2={N.servos.x} y2={cy(N.servos)} stroke="rgba(255,170,0,0.3)" strokeWidth="1.5" />
      <Arrow x={N.servos.x} y={cy(N.servos)} dir="right" color="#ffaa00" />

      {/* ── Power: Battery → BEC → Raspberry Pi 5 (separate path) ── */}
      <line x1={rx(N.battery)} y1={cy(N.battery)} x2={N.bec.x} y2={cy(N.bec)} stroke={powerColor} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <Arrow x={N.bec.x} y={cy(N.bec)} dir="right" color={powerColor} />
      <line x1={rx(N.bec)} y1={cy(N.bec)} x2={cx(N.pi)} y2={cy(N.bec)} stroke={powerColor} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <line x1={cx(N.pi)} y1={cy(N.bec)} x2={cx(N.pi)} y2={by(N.pi)} stroke={powerColor} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="2 4" />
      <Arrow x={cx(N.pi)} y={by(N.pi)} dir="up" color={powerColor} />

      {/* ── Protocol labels ── */}
      <ProtoTag x={160} y={cy(N.bmp585) - 9}  text="I2C"   color={accent} />
      <ProtoTag x={160} y={cy(N.mpu6050) - 9} text="I2C"   color={accent} />
      <ProtoTag x={160} y={cy(N.gps) - 9}     text="UART"  color={accent} />
      <ProtoTag x={(rx(N.esp32) + N.pi.x) / 2} y={cy(N.esp32) - 9} text="UART" color={accentBlue} />
      <ProtoTag x={(rx(N.pi) + N.rfm95w.x) / 2} y={cy(N.pi) - 9} text="SPI" color={accentBlue} />
      <ProtoTag x={cx(N.rfm95w) + 32} y={(by(N.rfm95w) + N.ground.y) / 2} text="915MHz" color="#ff6644" />
      <ProtoTag x={cx(N.ground) + 28} y={(by(N.ground) + N.laptop.y) / 2} text="USB" color="rgba(255,255,255,0.4)" />
      <ProtoTag x={cx(N.esp32) + 26} y={(by(N.esp32) + N.pca9685.y) / 2} text="I2C" color="#ffaa00" />
      <ProtoTag x={(rx(N.pca9685) + N.servos.x) / 2} y={cy(N.pca9685) - 9} text="PWM ×4" color="#ffaa00" />
      <ProtoTag x={(rx(N.battery) + N.bec.x) / 2} y={cy(N.battery) - 9} text="7.4V" color={powerColor} />
      <ProtoTag x={cx(N.pi) + 30} y={(cy(N.bec) + by(N.pi)) / 2} text="5V" color={powerColor} />

      {/* ── Section labels ── */}
      <GroupLabel x={20}  y={32} color={accent}>SENSOR INPUTS</GroupLabel>
      <GroupLabel x={290} y={32} color={accentBlue}>PROCESSING / CONTROL</GroupLabel>
      <GroupLabel x={890} y={70} color={accentBlue} anchor="middle">TELEMETRY / GROUND STN</GroupLabel>
      <GroupLabel x={360} y={267} color="#ffaa00" anchor="middle">ACTUATOR OUTPUTS</GroupLabel>
      <GroupLabel x={205} y={407} color={powerColor} anchor="middle">POWER SYSTEM</GroupLabel>

      {/* ── Nodes (drawn on top of lines) ── */}
      <ArchNode {...N.bmp585}  label="BMP585"     sub="ALTIMETER"      color={accent} />
      <ArchNode {...N.mpu6050} label="MPU6050"    sub="IMU"            color={accent} />
      <ArchNode {...N.gps}     label="GPS V3"     sub="POSITION"       color={accent} />
      <ArchNode {...N.esp32}   label="ESP32"      sub="SENSOR/SERVO COMM" color={accentBlue} />
      <ArchNode {...N.pi}      label="Raspberry Pi 5" sub="FLIGHT COMPUTER" color={accentBlue} />
      <ArchNode {...N.rfm95w}  label="RFM95W"     sub="915MHz RADIO"   color="#ff6644" />
      <ArchNode {...N.ground}  label="Ground Stn" sub="RECEIVER"       color="rgba(255,255,255,0.4)" />
      <ArchNode {...N.laptop}  label="Laptop"     sub="DASHBOARD"      color="rgba(255,255,255,0.4)" />
      <ArchNode {...N.pca9685} label="PCA9685"    sub="SERVO RELAY"    color="#ffaa00" />
      <ArchNode {...N.servos}  label="Servos ×4"  sub="BMS-127WV+"     color="#ffaa00" />
      <ArchNode {...N.battery} label="Battery"    sub="7.4V SRC"       color={powerColor} />
      <ArchNode {...N.bec}     label="BEC UBEC"   sub="5V STEP-DOWN"   color={powerColor} />
    </svg>
  );
}

// ─── Page ───

export default function Telemetry() {
  const telem = useTelemetry();
  const [altHistory, setAltHistory] = useState(Array(60).fill(0));
  const [accelHistory, setAccelHistory] = useState(Array(60).fill(9.81));

  useEffect(() => {
    setAltHistory(prev => [...prev.slice(1), telem.alt]);
    setAccelHistory(prev => [...prev.slice(1), telem.accelZ]);
  }, [telem.t]);

  const phaseLabels = { pre: "PRE-LAUNCH", ignition: "IGNITION", ascent: "POWERED ASCENT", coast: "COAST", descent: "DESCENT" };
  const phaseColors = { pre: "rgba(255,255,255,0.3)", ignition: "#ffaa00", ascent: accent, coast: accentBlue, descent: "#ff6644" };

  return (
    <>
      {/* Telemetry demo */}
      <section style={{ padding: "120px 24px 60px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <SectionLabel>LIVE DEMO</SectionLabel>
          <SectionTitle>Telemetry Simulation</SectionTitle>
          <p style={{ fontFamily: mono, fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.8, marginBottom: "32px", maxWidth: "600px" }}>
            Simulated flight data showing what the ground station receives during a launch. This is what real-time telemetry will look like on flight day.
          </p>

          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,255,170,0.15)", borderRadius: "12px", padding: "28px", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: phaseColors[telem.phase], animation: "blink 1s infinite" }} />
                <span style={{ fontFamily: mono, fontSize: "12px", letterSpacing: "3px", color: phaseColors[telem.phase], fontWeight: 600 }}>
                  {phaseLabels[telem.phase]}
                </span>
              </div>
              <span style={{ fontFamily: mono, fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>T+{Math.max(0, telem.t - 5).toFixed(1)}s</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "24px", marginBottom: "24px" }}>
              <TelemetryValue label="Altitude" value={telem.alt.toFixed(1)} unit="m" highlight />
              <TelemetryValue label="Speed" value={telem.speed.toFixed(1)} unit="m/s" />
              <TelemetryValue label="Accel Z" value={telem.accelZ.toFixed(2)} unit="m/s²" />
              <TelemetryValue label="Gyro X" value={telem.gyroX.toFixed(2)} unit="°/s" />
              <TelemetryValue label="Gyro Y" value={telem.gyroY.toFixed(2)} unit="°/s" />
              <TelemetryValue label="Latitude" value={telem.lat.toFixed(6)} unit="°N" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "14px" }}>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>ALTITUDE</div>
                <MiniGraph data={altHistory} color={accent} />
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "14px" }}>
                <div style={{ fontFamily: mono, fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.25)", marginBottom: "8px" }}>ACCELERATION Z</div>
                <MiniGraph data={accelHistory} color={accentBlue} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data architecture */}
      <section style={{ padding: "40px 24px 100px" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <SectionLabel>SYSTEM OVERVIEW</SectionLabel>
          <SectionTitle>Data Architecture</SectionTitle>
          <p style={{
            fontFamily: mono, fontSize: "13px", color: "rgba(255,255,255,0.3)",
            lineHeight: 1.9, margin: "0 auto 48px", maxWidth: "620px", textAlign: "center",
          }}>
            The BMP585, MPU6050, and GPS feed sensor data into the ESP32, which exchanges telemetry
            bidirectionally with the Raspberry Pi 5 and drives the PCA9685 to actuate the canard servos.
            The Pi downlinks flight data via 915MHz LoRa to the ground station and laptop, while a
            separate 7.4V→5V power rail feeds the flight computer.
          </p>

          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "32px 24px" }}>
            <ArchDiagram />
          </div>

          {/* Protocol legend */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px", justifyContent: "center" }}>
            {[
              { label: "I2C / UART", color: accent },
              { label: "UART / SPI", color: accentBlue },
              { label: "I2C / PWM", color: "#ffaa00" },
              { label: "915MHz RF", color: "#ff6644", dashed: true },
              { label: "Power Rail", color: "#cc88ff", dashed: true },
            ].map(({ label, color, dashed }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" strokeDasharray={dashed ? "4 2" : undefined} />
                </svg>
                <span style={{ fontFamily: mono, fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
