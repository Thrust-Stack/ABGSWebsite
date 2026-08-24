// Quaternion state shared by the HTML controls and the Three scene. Keeping
// this tiny implementation independent of Three.js lets the Home copy render
// before the renderer bundle is downloaded. Three's Quaternion APIs accept
// any object with x/y/z/w fields, so these targets remain directly compatible.
export const SLED_PRESENT_YAW = -0.36;

export function createQuaternionTarget(x = 0, y = 0, z = 0, w = 1) {
  return {
    x,
    y,
    z,
    w,
    copy(q) {
      this.x = q.x;
      this.y = q.y;
      this.z = q.z;
      this.w = q.w;
      return this;
    },
    premultiply(q) {
      const ax = q.x;
      const ay = q.y;
      const az = q.z;
      const aw = q.w;
      const bx = this.x;
      const by = this.y;
      const bz = this.z;
      const bw = this.w;
      this.x = ax * bw + aw * bx + ay * bz - az * by;
      this.y = ay * bw + aw * by + az * bx - ax * bz;
      this.z = az * bw + aw * bz + ax * by - ay * bx;
      this.w = aw * bw - ax * bx - ay * by - az * bz;
      return this;
    },
  };
}

export const REST_SLED = createQuaternionTarget(
  0,
  Math.sin(SLED_PRESENT_YAW / 2),
  0,
  Math.cos(SLED_PRESENT_YAW / 2)
);
