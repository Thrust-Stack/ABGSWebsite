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
    down:  `${x - 4},${y - 6} ${x},${y} ${x + 4},${y - 6}`,
  };
  return <polygon points={pts[dir]} fill={color} fillOpacity="0.65" />;
}

function ArchDiagram() {
  const N = {
    bmp585:  { x: 20,  y: 40,  w: 110, h: 40 },
    mpu6050: { x: 20,  y: 155, w: 110, h: 40 },
    gps:     { x: 20,  y: 270, w: 110, h: 40 },
    pi:      { x: 330, y: 145, w: 150, h: 65 },
    esp32:   { x: 600, y: 40,  w: 114, h: 40 },
    servos:  { x: 800, y: 40,  w: 130, h: 40 },
    rfm95w:  { x: 600, y: 270, w: 114, h: 40 },
    ground:  { x: 800, y: 270, w: 130, h: 40 },
    laptop:  { x: 800, y: 368, w: 130, h: 40 },
  };

  const cx = n => n.x + n.w / 2;
  const cy = n => n.y + n.h / 2;
  const rx = n => n.x + n.w;
  const by = n => n.y + n.h;

  const BL = 200; // left bus x
  const BR = 560; // right bus x

  return (
    <svg viewBox="0 0 960 430" style={{ width: "100%", display: "block" }}>

      {/* ── Sensor → left bus ── */}
      <line x1={rx(N.bmp585)}  y1={cy(N.bmp585)}  x2={BL} y2={cy(N.bmp585)}  stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      <line x1={rx(N.mpu6050)} y1={cy(N.mpu6050)} x2={BL} y2={cy(N.mpu6050)} stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      <line x1={rx(N.gps)}     y1={cy(N.gps)}     x2={BL} y2={cy(N.gps)}     stroke="rgba(0,255,170,0.18)" strokeWidth="1" />
      {/* Left vertical bus spine */}
      <line x1={BL} y1={cy(N.bmp585)} x2={BL} y2={cy(N.gps)} stroke="rgba(0,255,170,0.1)" strokeWidth="2" />
      {/* Junction dots on left bus */}
      <circle cx={BL} cy={cy(N.bmp585)}  r="3" fill="rgba(0,255,170,0.45)" />
      <circle cx={BL} cy={cy(N.mpu6050)} r="3" fill="rgba(0,255,170,0.45)" />
      <circle cx={BL} cy={cy(N.gps)}     r="3" fill="rgba(0,255,170,0.45)" />
      {/* Left bus → Pi */}
      <circle cx={BL} cy={cy(N.pi)} r="3" fill="rgba(0,255,170,0.6)" />
      <line x1={BL} y1={cy(N.pi)} x2={N.pi.x} y2={cy(N.pi)} stroke="rgba(0,255,170,0.35)" strokeWidth="1.5" />
      <Arrow x={N.pi.x} y={cy(N.pi)} dir="right" color={accent} />

      {/* ── Pi → right bus ── */}
      <line x1={rx(N.pi)} y1={cy(N.pi)} x2={BR} y2={cy(N.pi)} stroke="rgba(0,170,255,0.35)" strokeWidth="1.5" />
      {/* Right vertical bus spine */}
      <line x1={BR} y1={cy(N.esp32)} x2={BR} y2={cy(N.rfm95w)} stroke="rgba(0,170,255,0.1)" strokeWidth="2" />
      {/* Junction dots on right bus */}
      <circle cx={BR} cy={cy(N.pi)}    r="3" fill="rgba(0,170,255,0.6)" />
      <circle cx={BR} cy={cy(N.esp32)} r="3" fill="rgba(0,170,255,0.45)" />
      <circle cx={BR} cy={cy(N.rfm95w)} r="3" fill="rgba(0,170,255,0.45)" />
      {/* Right bus → ESP32 */}
      <line x1={BR} y1={cy(N.esp32)} x2={N.esp32.x} y2={cy(N.esp32)} stroke="rgba(0,170,255,0.2)" strokeWidth="1" />
      <Arrow x={N.esp32.x} y={cy(N.esp32)} dir="right" color={accentBlue} />
      {/* Right bus → RFM95W */}
      <line x1={BR} y1={cy(N.rfm95w)} x2={N.rfm95w.x} y2={cy(N.rfm95w)} stroke="rgba(0,170,255,0.2)" strokeWidth="1" />
      <Arrow x={N.rfm95w.x} y={cy(N.rfm95w)} dir="right" color={accentBlue} />

      {/* ── Output chains ── */}
      <line x1={rx(N.esp32)} y1={cy(N.esp32)} x2={N.servos.x} y2={cy(N.servos)} stroke="rgba(255,170,0,0.3)" strokeWidth="1.5" />
      <Arrow x={N.servos.x} y={cy(N.servos)} dir="right" color="#ffaa00" />
      {/* Wireless link — dashed */}
      <line x1={rx(N.rfm95w)} y1={cy(N.rfm95w)} x2={N.ground.x} y2={cy(N.ground)} stroke="rgba(255,100,68,0.35)" strokeWidth="1.5" strokeDasharray="5 3" />
      <Arrow x={N.ground.x} y={cy(N.ground)} dir="right" color="#ff6644" />
      {/* Ground station → Laptop */}
      <line x1={cx(N.ground)} y1={by(N.ground)} x2={cx(N.laptop)} y2={N.laptop.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <Arrow x={cx(N.laptop)} y={N.laptop.y} dir="down" color="rgba(255,255,255,0.4)" />

      {/* ── Protocol labels ── */}
      <ProtoTag x={160} y={cy(N.bmp585) - 9}  text="I2C"   color={accent} />
      <ProtoTag x={160} y={cy(N.mpu6050) - 9} text="I2C"   color={accent} />
      <ProtoTag x={160} y={cy(N.gps) - 9}     text="UART"  color={accent} />
      <ProtoTag x={(BR + N.esp32.x) / 2}   y={cy(N.esp32)  - 9} text="UART"  color={accentBlue} />
      <ProtoTag x={(BR + N.rfm95w.x) / 2}  y={cy(N.rfm95w) - 9} text="SPI"   color="rgba(0,170,255,0.8)" />
      <ProtoTag x={(rx(N.esp32) + N.servos.x) / 2} y={cy(N.esp32)  - 9} text="PWM"   color="#ffaa00" />
      <ProtoTag x={(rx(N.rfm95w) + N.ground.x) / 2} y={cy(N.rfm95w) - 9} text="915MHz" color="#ff6644" />
      <ProtoTag x={cx(N.ground) + 30} y={(by(N.ground) + N.laptop.y) / 2} text="USB" color="rgba(255,255,255,0.4)" />

      {/* ── Nodes (drawn on top of lines) ── */}
      <ArchNode {...N.bmp585}  label="BMP585"      sub="ALTIMETER"       color={accent} />
      <ArchNode {...N.mpu6050} label="MPU6050"     sub="IMU"             color={accent} />
      <ArchNode {...N.gps}     label="GPS V3"      sub="POSITION"        color={accent} />
      <ArchNode {...N.pi}      label="Pi Zero 2W"  sub="FLIGHT COMPUTER" color={accentBlue} />
      <ArchNode {...N.esp32}   label="ESP32"        sub="SERVO CTRL"      color="#ffaa00" />
      <ArchNode {...N.servos}  label="TVC Servos"  sub="ACTUATION"       color="rgba(255,255,255,0.4)" />
      <ArchNode {...N.rfm95w}  label="RFM95W"      sub="915MHz RADIO"    color="#ff6644" />
      <ArchNode {...N.ground}  label="Ground Stn"  sub="RECEIVER"        color="rgba(255,255,255,0.4)" />
      <ArchNode {...N.laptop}  label="Laptop"      sub="DASHBOARD"       color="rgba(255,255,255,0.4)" />
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
            lineHeight: 1.9, margin: "0 auto 48px", maxWidth: "560px", textAlign: "center",
          }}>
            Three sensor buses feed the Pi Zero 2W flight computer. Servo commands route to the ESP32.
            Telemetry downlinks via 915MHz LoRa to the ground station.
          </p>

          <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "32px 24px" }}>
            <ArchDiagram />
          </div>

          {/* Protocol legend */}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "20px", justifyContent: "center" }}>
            {[
              { label: "I2C / UART", color: accent },
              { label: "UART / SPI", color: accentBlue },
              { label: "PWM", color: "#ffaa00" },
              { label: "915MHz RF", color: "#ff6644", dashed: true },
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
