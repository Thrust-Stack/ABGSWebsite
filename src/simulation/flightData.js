const SAMPLE_RATE_HZ = 20;
const SAMPLE_INTERVAL = 1 / SAMPLE_RATE_HZ;
const FLIGHT_DURATION = 30;
const GRAVITY = 9.80665;
const MAX_FIN_DEFLECTION_DEG = 7.5;
const KP = 0.0025;
const CANARD_ACCELERATION_COEFFICIENT = 0.0243;
const MIN_VERTICAL_VELOCITY_M_S = 0.1;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

// Deterministic hash noise. Replays must render the same pose at the same time,
// which Math.random() could never guarantee.
function noise(index, channel) {
  let value = (index + 1) * 0x9e3779b1 + (channel + 11) * 0x85ebca6b;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}

export function phaseAt(t) {
  if (t < 3) return "pre";
  if (t < 5) return "ignition";
  if (t < 18) return "ascent";
  if (t < 22) return "coast";
  return "descent";
}

export function computeRollCommandRad(gyroZRadS, verticalVelocityMps) {
  const rollRateDegS = (gyroZRadS * 180) / Math.PI;
  const speed = Math.abs(verticalVelocityMps);
  const gain =
    speed > MIN_VERTICAL_VELOCITY_M_S
      ? KP / (CANARD_ACCELERATION_COEFFICIENT * speed * speed)
      : KP;
  const commandDeg = clamp(gain * -rollRateDegS, -MAX_FIN_DEFLECTION_DEG, MAX_FIN_DEFLECTION_DEG);
  return (commandDeg * Math.PI) / 180;
}

function modeledSample(t, index) {
  const phase = phaseAt(t);
  const flightT = Math.max(0, t - 5);
  let altitudeM = 0;
  let verticalVelocityMps = 0;
  let accelY = GRAVITY;
  let gyroX = noise(index, 0) * 0.002;
  let gyroY = noise(index, 1) * 0.002;
  let gyroZ = noise(index, 2) * 0.003;

  if (phase === "ignition") {
    const p = smoothstep((t - 3) / 2);
    altitudeM = p * 3;
    verticalVelocityMps = p * 18;
    accelY = GRAVITY + p * 34;
    gyroX += p * 0.055;
    gyroY += Math.sin(t * 2.1) * 0.038;
    gyroZ += p * 0.34;
  } else if (phase === "ascent") {
    altitudeM = 3 + flightT * 76 - flightT * flightT * 1.45;
    verticalVelocityMps = Math.max(8, 76 - flightT * 2.9);
    accelY = 28 + Math.sin(flightT * 0.55) * 4;
    gyroX += Math.sin(flightT * 0.62) * 0.045;
    gyroY += Math.sin(flightT * 0.43 + 0.8) * 0.032;
    gyroZ += 0.42 * Math.exp(-flightT * 0.17) * Math.cos(flightT * 0.82);
  } else if (phase === "coast") {
    const p = (t - 18) / 4;
    altitudeM = 780 + 70 * Math.sin(p * Math.PI * 0.5);
    verticalVelocityMps = Math.max(0, 48 * (1 - p));
    accelY = 1.2 - p * 2.2;
    gyroX += Math.sin(t * 0.7) * 0.018;
    gyroY += Math.cos(t * 0.6) * 0.016;
    gyroZ += Math.sin(t * 0.9) * 0.035;
  } else if (phase === "descent") {
    const p = (t - 22) / 8;
    altitudeM = Math.max(0, 850 * (1 - p));
    verticalVelocityMps = -22;
    accelY = -4.5;
    gyroX += Math.sin(t * 0.45) * 0.01;
    gyroY += Math.cos(t * 0.4) * 0.012;
    gyroZ += Math.sin(t * 0.5) * 0.018;
  }

  return {
    t,
    phase,
    accelMps2: [noise(index, 3) * 0.15, accelY + noise(index, 4) * 0.2, noise(index, 5) * 0.15],
    gyroRadS: [gyroX, gyroY, gyroZ],
    altitudeM,
    verticalVelocityMps,
    rollCommandRad: computeRollCommandRad(gyroZ, verticalVelocityMps),
    gps: null,
    quality: { valid: true },
  };
}

export function buildModeledFlight() {
  const samples = [];
  const count = Math.round(FLIGHT_DURATION * SAMPLE_RATE_HZ);
  for (let index = 0; index <= count; index += 1) {
    const t = index * SAMPLE_INTERVAL;
    samples.push(modeledSample(t, index));
  }
  return {
    id: "modeled",
    label: "Modeled flight",
    badge: "MODELED FLIGHT",
    description: "Deterministic flight profile using the current roll-control law.",
    samples,
  };
}

export function normalizeBenchReplay(payload) {
  let previousAltitude = 0;
  const samples = payload.samples.map((sample) => {
    const altitudeM = sample.altitudeM ?? previousAltitude;
    const verticalVelocityMps =
      sample.t > 0 ? (altitudeM - previousAltitude) / SAMPLE_INTERVAL : 0;
    previousAltitude = altitudeM;
    return {
      ...sample,
      phase: "bench",
      altitudeM,
      verticalVelocityMps,
      rollCommandRad: computeRollCommandRad(sample.gyroRadS[2], 0),
    };
  });
  return {
    id: "bench",
    label: "Bench replay",
    badge: "BENCH REPLAY",
    description: "Curated 20 Hz IMU window from the recorded avionics bench log.",
    samples,
    meta: payload.meta,
  };
}
