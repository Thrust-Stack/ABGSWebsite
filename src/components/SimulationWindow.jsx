import { memo, useMemo, useState } from "react";
import * as THREE from "three";
import benchReplay from "../simulation/data/bench-replay.json";
import { buildModeledFlight, normalizeBenchReplay } from "../simulation/flightData";
import {
  buildAttitudeTimeline,
  createInterpolatedSample,
  interpolateTimeline,
} from "../simulation/attitude";
import { usePlayback } from "../simulation/usePlayback";
import RocketSimulationViewer from "../three/RocketSimulationViewer";
import { color } from "../design/tokens";

const MODELED = buildModeledFlight();
const BENCH = normalizeBenchReplay(benchReplay);
const SOURCES = [MODELED, BENCH].map((source) => ({
  ...source,
  timeline: buildAttitudeTimeline(source.samples),
}));
const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));
const PHASE_LABELS = {
  pre: "PRE-LAUNCH",
  ignition: "IGNITION",
  ascent: "POWERED ASCENT",
  coast: "COAST",
  descent: "DESCENT",
  bench: "BENCH MOTION",
};

const rollRateDeg = (sample) => THREE.MathUtils.radToDeg(sample.gyroRadS[2]);
const altitude = (sample) => sample.altitudeM;

function format(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

const Metric = memo(function Metric({ label, value, unit, tone = color.text }) {
  return (
    <div className="sim-metric">
      <span>{label}</span>
      <strong style={{ color: tone }}>
        {value}<small>{unit}</small>
      </strong>
    </div>
  );
});

function TelemetryPlot({ samples, accessor, label, unit, stroke, playhead }) {
  const width = 240;
  const height = 62;
  const { points, zeroY } = useMemo(() => {
    const values = samples.map(accessor);
    let min = Math.min(...values, 0);
    let max = Math.max(...values, 0);
    if (max - min < 1e-6) max = min + 1;
    const padding = (max - min) * 0.08;
    min -= padding;
    max += padding;
    const pointString = values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * width;
        const y = height - ((value - min) / (max - min)) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
    return {
      points: pointString,
      zeroY: height - ((0 - min) / (max - min)) * height,
    };
  }, [samples, accessor]);
  return (
    <div className="sim-plot">
      <div className="sim-plot-label"><span>{label}</span><span>{unit}</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} over time`}>
        <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(255,255,255,0.07)" />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <line x1={playhead * width} y1="0" x2={playhead * width} y2={height} stroke="#f3f5f7" strokeOpacity="0.42" />
      </svg>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="sim-webgl-fallback">
      <strong>3D VIEW UNAVAILABLE</strong>
      <span>This browser cannot initialize WebGL. Telemetry playback remains available.</span>
    </div>
  );
}

export default function SimulationWindow({ webgl, reduced = false }) {
  const [sourceId, setSourceId] = useState("modeled");
  const [cameraMode, setCameraMode] = useState("studio");
  const [showAxes, setShowAxes] = useState(false);
  const source = SOURCE_BY_ID.get(sourceId) || MODELED;
  const timeline = source.timeline || buildAttitudeTimeline(source.samples);
  const duration = timeline.at(-1)?.t || 0;
  const playback = usePlayback(duration, reduced);
  const readout = useMemo(() => {
    const sample = createInterpolatedSample();
    interpolateTimeline(timeline, playback.displayTime, sample);
    const euler = new THREE.Euler().setFromQuaternion(sample.orientation, "YXZ");
    return {
      ...sample,
      pitchDeg: THREE.MathUtils.radToDeg(euler.x),
      rollDeg: THREE.MathUtils.radToDeg(euler.y),
      yawDeg: THREE.MathUtils.radToDeg(euler.z),
    };
  }, [timeline, playback.displayTime]);
  const progress = duration > 0 ? playback.displayTime / duration : 0;

  return (
    <div className="sim-window">
      <header className="sim-header">
        <div>
          <span className="sim-live-dot" />
          <strong>{source.badge}</strong>
          <span>{PHASE_LABELS[readout.phase] || readout.phase}</span>
        </div>
        <span>T+{format(playback.displayTime, 1)}s / {format(duration, 1)}s</span>
      </header>

      <div className="sim-layout">
        <aside className="sim-rail sim-rail-left" aria-label="Attitude telemetry">
          <div className="sim-section-label">ATTITUDE ESTIMATE</div>
          <div className="sim-metric-grid">
            <Metric label="Roll" value={format(readout.rollDeg)} unit="°" tone={color.orangeBright} />
            <Metric label="Pitch" value={format(readout.pitchDeg)} unit="°" tone={color.blueBright} />
            <Metric label="Yaw" value={format(readout.yawDeg)} unit="°" tone={color.green} />
          </div>
          <TelemetryPlot
            samples={timeline}
            accessor={rollRateDeg}
            label="ROLL RATE"
            unit="°/s"
            stroke={color.orange}
            playhead={progress}
          />
          <TelemetryPlot
            samples={timeline}
            accessor={altitude}
            label="ALTITUDE"
            unit="m"
            stroke={color.green}
            playhead={progress}
          />
        </aside>

        <main className="sim-viewport" aria-label="Full-body rocket attitude simulation">
          {webgl ? (
            <RocketSimulationViewer
              timeline={timeline}
              playback={playback}
              cameraMode={cameraMode}
              showAxes={showAxes}
              reduced={reduced}
            />
          ) : (
            <WebGLFallback />
          )}
          <div className="sim-viewport-label">IMU Z → BODY ROLL</div>
        </main>

        <aside className="sim-rail sim-rail-right" aria-label="Simulation controls">
          <div className="sim-section-label">DATA SOURCE</div>
          <div className="sim-source-tabs">
            {SOURCES.map((item) => (
              <button
                type="button"
                key={item.id}
                className={sourceId === item.id ? "active" : ""}
                onClick={() => {
                  playback.seek(0);
                  setSourceId(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="sim-source-note">{source.description}</p>
          <div className="sim-section-label">LIVE VALUES</div>
          <div className="sim-live-values">
            <Metric label="Roll rate" value={format(THREE.MathUtils.radToDeg(readout.gyroRadS[2]), 2)} unit="°/s" />
            <Metric label="Vertical speed" value={format(readout.verticalVelocityMps)} unit="m/s" />
            <Metric label="Canard command" value={format(THREE.MathUtils.radToDeg(readout.rollCommandRad), 2)} unit="°" tone={color.orangeBright} />
            <Metric label="Accel body Y" value={format(readout.accelMps2[1], 2)} unit="m/s²" />
          </div>
          <div className="sim-section-label">VIEW</div>
          <button type="button" className="sim-toggle" onClick={() => setCameraMode((mode) => mode === "studio" ? "orbit" : "studio")}>
            CAMERA <strong>{cameraMode.toUpperCase()}</strong>
          </button>
          <button type="button" className="sim-toggle" onClick={() => setShowAxes((value) => !value)} aria-pressed={showAxes}>
            BODY AXES <strong>{showAxes ? "ON" : "OFF"}</strong>
          </button>
        </aside>
      </div>

      <footer className="sim-playback">
        <button type="button" onClick={() => playback.setPlaying((value) => !value)}>
          {playback.playing ? "PAUSE" : "PLAY"}
        </button>
        <button type="button" onClick={() => playback.seek(0)}>RESET</button>
        <label>
          <span className="sr-only">Simulation time</span>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.01"
            value={playback.displayTime}
            onChange={(event) => playback.seek(event.target.value)}
          />
        </label>
        <label className="sim-speed">
          <span>SPEED</span>
          <select value={playback.speed} onChange={(event) => playback.setSpeed(event.target.value)}>
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
          </select>
        </label>
      </footer>
    </div>
  );
}
