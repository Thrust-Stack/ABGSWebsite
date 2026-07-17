// Print per-node bounding boxes of a GLB to understand assembly layout.
// Usage: node scripts/inspect-glb.mjs public/models/rocket-assembly.glb
import { NodeIO, getBounds } from '@gltf-transform/core';
const bounds = getBounds;

const io = new NodeIO();
const doc = await io.read(process.argv[2]);
const scene = doc.getRoot().getDefaultScene();

const fmt = (n) => n.toFixed(1).padStart(8);
console.log('NODE'.padEnd(34), 'CENTER (x,y,z)'.padEnd(30), 'SIZE (x,y,z)');
for (const node of scene.listChildren()) {
  const b = bounds(node);
  const c = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2);
  const s = [0, 1, 2].map((i) => b.max[i] - b.min[i]);
  console.log(
    node.getName().padEnd(34),
    `${fmt(c[0])},${fmt(c[1])},${fmt(c[2])}`.padEnd(30),
    `${fmt(s[0])},${fmt(s[1])},${fmt(s[2])}`
  );
}
const all = bounds(scene);
console.log('\nTOTAL min', all.min.map((v) => v.toFixed(1)), 'max', all.max.map((v) => v.toFixed(1)));
