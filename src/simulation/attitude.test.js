import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { buildAttitudeTimeline, findSampleWindow, mapImuRateToModel } from "./attitude.js";
import { computeRollCommandRad } from "./flightData.js";

test("maps the avionics roll axis onto the CAD longitudinal axis", () => {
  const mapped = mapImuRateToModel([0, 0, 1]);
  assert.ok(mapped.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-12);
});

test("integrates a 90 degree per second roll into a quarter turn", () => {
  const rate = Math.PI / 2;
  const samples = Array.from({ length: 21 }, (_, index) => ({
    t: index / 20,
    gyroRadS: [0, 0, rate],
  }));
  const timeline = buildAttitudeTimeline(samples);
  const actual = new THREE.Quaternion(...timeline.at(-1).orientation);
  const expected = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  assert.ok(actual.angleTo(expected) < 1e-6);
});

test("finds deterministic interpolation windows", () => {
  const samples = [{ t: 0 }, { t: 0.5 }, { t: 1 }];
  assert.deepEqual(findSampleWindow(samples, 0.75), [1, 2, 0.5]);
  assert.deepEqual(findSampleWindow(samples, 2), [2, 2, 0]);
});

test("roll controller output stays inside the flight clamp", () => {
  const command = computeRollCommandRad(-100, 0);
  assert.ok(Math.abs(command) <= THREE.MathUtils.degToRad(7.5));
});
