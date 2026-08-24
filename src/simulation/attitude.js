import * as THREE from "three";

const MAX_INTEGRATION_STEP = 0.2;
const _axis = new THREE.Vector3();
const _delta = new THREE.Quaternion();

// CAD is Y-up along the rocket body. The current harness treats IMU Z as roll,
// so the mapping is IMU [x, y, z] -> model [x, z, -y]. Keep every axis swap in
// this one function instead of leaking coordinate assumptions into the viewer.
export function mapImuRateToModel(gyroRadS, target = new THREE.Vector3()) {
  return target.set(gyroRadS[0], gyroRadS[2], -gyroRadS[1]);
}

export function buildAttitudeTimeline(samples) {
  if (!samples.length) return [];
  const orientation = new THREE.Quaternion();
  return samples.map((sample, index) => {
    if (index > 0) {
      const dt = Math.min(MAX_INTEGRATION_STEP, Math.max(0, sample.t - samples[index - 1].t));
      mapImuRateToModel(sample.gyroRadS, _axis);
      const speed = _axis.length();
      if (speed > 1e-8 && dt > 0) {
        _axis.multiplyScalar(1 / speed);
        _delta.setFromAxisAngle(_axis, speed * dt);
        orientation.multiply(_delta).normalize();
      }
    }
    return {
      ...sample,
      orientation: [orientation.x, orientation.y, orientation.z, orientation.w],
    };
  });
}

export function findSampleWindow(samples, time) {
  if (samples.length < 2 || time <= samples[0].t) return [0, 0, 0];
  const last = samples.length - 1;
  if (time >= samples[last].t) return [last, last, 0];
  let low = 0;
  let high = last;
  while (low + 1 < high) {
    const middle = (low + high) >> 1;
    if (samples[middle].t <= time) low = middle;
    else high = middle;
  }
  const span = samples[high].t - samples[low].t || 1;
  return [low, high, (time - samples[low].t) / span];
}

export function interpolateTimeline(samples, time, target) {
  const [fromIndex, toIndex, alpha] = findSampleWindow(samples, time);
  const from = samples[fromIndex];
  const to = samples[toIndex];
  target.orientation
    .set(from.orientation[0], from.orientation[1], from.orientation[2], from.orientation[3])
    .slerp(_delta.set(to.orientation[0], to.orientation[1], to.orientation[2], to.orientation[3]), alpha)
    .normalize();
  target.altitudeM = THREE.MathUtils.lerp(from.altitudeM, to.altitudeM, alpha);
  target.verticalVelocityMps = THREE.MathUtils.lerp(
    from.verticalVelocityMps,
    to.verticalVelocityMps,
    alpha
  );
  target.rollCommandRad = THREE.MathUtils.lerp(from.rollCommandRad, to.rollCommandRad, alpha);
  for (let index = 0; index < 3; index += 1) {
    target.accelMps2[index] = THREE.MathUtils.lerp(from.accelMps2[index], to.accelMps2[index], alpha);
    target.gyroRadS[index] = THREE.MathUtils.lerp(from.gyroRadS[index], to.gyroRadS[index], alpha);
  }
  target.phase = alpha < 0.5 ? from.phase : to.phase;
  return target;
}

export function createInterpolatedSample() {
  return {
    orientation: new THREE.Quaternion(),
    accelMps2: [0, 0, 0],
    gyroRadS: [0, 0, 0],
    altitudeM: 0,
    verticalVelocityMps: 0,
    rollCommandRad: 0,
    phase: "pre",
  };
}
