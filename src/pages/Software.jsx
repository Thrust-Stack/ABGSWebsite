import { color, font, radius, MAXW } from "../design/tokens";
import { Kicker, SectionTitle, Lead, Panel, Tag, useIsMobile } from "../design/primitives";
import { Reveal, RevealGroup, RevealItem } from "../design/motion";
import { Button } from "../design/primitives";
import { dataFlow } from "../data/project";

// Protocol -> tone, so the data-path table colour-codes by bus the same way the
// telemetry architecture diagram does.
const PROTO_TONE = {
  I2C: "green",
  UART: "green",
  SPI: "blue",
  PWM: "orange",
  "915MHz": "orange",
  USB: "metal",
  PWR: "metal",
  "5V PWR": "metal",
};

// The three compute tiers and what each one is actually responsible for. This is
// the software side of the same hardware the Hardware page and the 3D sled show.
const TIERS = [
  {
    id: "esp32",
    tier: "TIER 1 · REAL-TIME I/O",
    tone: color.blue,
    name: "ESP32 Firmware",
    role: "Sensor acquisition & servo output",
    body: "Bare-metal C++ on the ESP32's two cores. One loop polls the MPU6050 and BMP585 on the shared I2C bus and reads NMEA sentences from the GPS over UART, timestamping every sample so nothing downstream has to guess when it was taken. Samples are framed and streamed up to the Pi over a second UART at a steady 100 Hz. On the return path it receives the four canard angles the Pi computed and writes them to the PCA9685 over I2C, which latches the hardware-timed PWM the servos actually follow.",
    tags: ["I2C poll", "UART bridge", "100 Hz", "PCA9685 PWM"],
  },
  {
    id: "raspberry-pi-5",
    tier: "TIER 2 · FLIGHT COMPUTER",
    tone: color.green,
    name: "Pi 5 Flight Software",
    role: "Fusion · control · telemetry",
    body: "The brain. It fuses the incoming IMU, barometer, and GPS into a single attitude-and-altitude state estimate, runs the PID control loop that turns the error between that estimate and the planned attitude into four canard commands, and packs a telemetry frame every cycle. Commands go back down to the ESP32 over UART; telemetry goes out to the RFM95W over SPI for the 915 MHz downlink. Everything runs at the same 100 Hz the sensors stream at, and every frame is logged to disk for post-flight review.",
    tags: ["Sensor fusion", "PID @ 100 Hz", "Frame packing", "SPI downlink"],
  },
  {
    id: "ground-station",
    tier: "TIER 3 · GROUND STATION",
    tone: color.orange,
    name: "Ground Station",
    role: "Receive · decode · display",
    body: "A laptop-side receiver reads the RFM95W ground module over USB, decodes each binary telemetry frame back into altitude, velocity, orientation, and GPS position, and plots it live so the flight can be watched as it happens. Every frame is also written to a log so the commanded canard angles can be compared against the logged attitude afterward. The Telemetry page is a browser stand-in for exactly this display.",
    tags: ["LoRa RX", "Frame decode", "Live plot", "Flight log"],
  },
];

// The heart of the control system, spelled out as a loop the reader can follow.
const LOOP = [
  { n: "01", label: "Estimate", text: "Gyro rates are integrated for a fast attitude estimate, then corrected against the accelerometer's gravity vector and the barometer's altitude so the estimate can't drift over a flight." },
  { n: "02", label: "Compare", text: "The fused attitude is subtracted from the planned attitude to get the pitch, yaw, and roll error — how far off the vehicle is from where it should be pointed right now." },
  { n: "03", label: "Correct", text: "A PID controller turns each error into a correction: proportional to the error now, integral of what's accumulated, and derivative of how fast it's changing, tuned so the vehicle settles without oscillating." },
  { n: "04", label: "Actuate", text: "The corrections are mixed into four individual canard angles and sent down through the ESP32 to the PCA9685, which drives the servos. The next sensor sample closes the loop, 100 times a second." },
];

function TierCard({ t }) {
  return (
    <Panel interactive style={{ padding: "26px 24px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: t.tone, textTransform: "uppercase" }}>
        {t.tier}
      </div>
      <div style={{ fontFamily: font.display, fontSize: 19, fontWeight: 600, color: color.text, marginTop: 10 }}>{t.name}</div>
      <div style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.16em", color: color.textFaint, marginTop: 5, textTransform: "uppercase" }}>
        {t.role}
      </div>
      <p style={{ fontFamily: font.body, fontSize: 13.5, color: color.textDim, lineHeight: 1.75, margin: "16px 0 18px", flex: 1 }}>
        {t.body}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {t.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
    </Panel>
  );
}

export default function Software() {
  const isMobile = useIsMobile();

  return (
    <section style={{ padding: isMobile ? "110px 20px 60px" : "150px 24px 100px" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto" }}>
        <Reveal>
          <Kicker tone="blue">FLIGHT SOFTWARE</Kicker>
          <SectionTitle>How the Code Flies It</SectionTitle>
          <Lead>
            The hardware is nine boards; the software is what makes them a control system. It runs
            on three tiers — real-time firmware on the ESP32, the flight loop on the Raspberry Pi 5,
            and a ground station on a laptop — each talking to the next over the exact buses the
            wiring lays down.
          </Lead>
          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Button to="/hardware" size="sm" variant="ghost">See the hardware →</Button>
            <Button to="/telemetry" size="sm" variant="ghost">Live telemetry →</Button>
          </div>
        </Reveal>

        {/* Three compute tiers */}
        <div style={{ marginTop: 52 }}>
          <Reveal>
            <div
              style={{
                fontFamily: font.mono,
                fontSize: 11,
                letterSpacing: "0.24em",
                color: color.textFaint,
                textTransform: "uppercase",
                paddingBottom: 10,
                borderBottom: `1px solid ${color.line}`,
                marginBottom: 18,
              }}
            >
              Compute Tiers
            </div>
          </Reveal>
          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {TIERS.map((t) => (
              <RevealItem key={t.id}>
                <TierCard t={t} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* The control loop */}
        <div style={{ marginTop: 64 }}>
          <Reveal>
            <Kicker tone="green">THE CONTROL LOOP</Kicker>
            <SectionTitle style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>Estimate, Compare, Correct</SectionTitle>
            <Lead>
              The whole point of the stack is one loop running a hundred times a second on the Pi.
              It reads where the rocket is pointed, works out how far that is from where it should be,
              and trims the canards to close the gap.
            </Lead>
          </Reveal>
          <RevealGroup
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
          >
            {LOOP.map((s) => (
              <RevealItem key={s.n}>
                <Panel style={{ padding: "24px 22px", height: "100%" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ fontFamily: font.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: color.green }}>{s.n}</span>
                    <span style={{ fontFamily: font.display, fontSize: 17, fontWeight: 600, color: color.text }}>{s.label}</span>
                  </div>
                  <p style={{ fontFamily: font.body, fontSize: 13, color: color.textDim, lineHeight: 1.7, margin: "12px 0 0" }}>
                    {s.text}
                  </p>
                </Panel>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>

        {/* Data path — driven by the real dataFlow array */}
        <div style={{ marginTop: 64 }}>
          <Reveal>
            <Kicker tone="orange">DATA PATH</Kicker>
            <SectionTitle style={{ fontSize: "clamp(24px, 3.5vw, 34px)" }}>Every Hop, Every Bus</SectionTitle>
            <Lead>
              Software only matters if the bytes actually move. This is the same signal path the
              wiring builds, from a raw sensor read on the ESP32 all the way to a pixel on the ground
              station — each hop with the bus it rides.
            </Lead>
          </Reveal>

          <Reveal delay={0.1}>
            <div
              style={{
                border: `1px solid ${color.line}`,
                borderRadius: radius.lg,
                overflow: "hidden",
                marginTop: 28,
              }}
            >
              {dataFlow.map((hop, i) => {
                const tone = PROTO_TONE[hop.protocol] || "metal";
                return (
                  <div
                    key={`${hop.from}-${hop.to}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr auto" : "1fr 24px 1fr auto",
                      alignItems: "center",
                      gap: isMobile ? 10 : 14,
                      padding: isMobile ? "14px 16px" : "15px 22px",
                      borderTop: i === 0 ? "none" : `1px solid ${color.line}`,
                      background: i % 2 ? "rgba(255,255,255,0.012)" : "transparent",
                    }}
                  >
                    <span style={{ fontFamily: font.mono, fontSize: isMobile ? 12 : 13, color: color.text, letterSpacing: "0.02em" }}>
                      {hop.from}
                    </span>
                    {!isMobile && (
                      <span aria-hidden style={{ fontFamily: font.mono, fontSize: 13, color: color.textGhost, textAlign: "center" }}>
                        →
                      </span>
                    )}
                    <span style={{ fontFamily: font.mono, fontSize: isMobile ? 12 : 13, color: isMobile ? color.textDim : color.text, letterSpacing: "0.02em" }}>
                      {isMobile && <span style={{ color: color.textGhost, marginRight: 6 }}>→</span>}
                      {hop.to}
                    </span>
                    <Tag tone={tone}>{hop.protocol}</Tag>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 20, justifyContent: "center" }}>
            {[
              { label: "SENSOR BUS", tone: color.green },
              { label: "PROCESSING", tone: color.blue },
              { label: "ACTUATION / RF", tone: color.orange },
              { label: "POWER", tone: color.metal },
            ].map(({ label, tone }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: tone, opacity: 0.85 }} />
                <span style={{ fontFamily: font.mono, fontSize: 10, color: color.textFaint, letterSpacing: "0.14em" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
