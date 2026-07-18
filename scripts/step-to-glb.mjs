// STEP -> GLB converter (WASM OpenCascade via occt-import-js).
// Usage: node scripts/step-to-glb.mjs <input.step> <output.glb>
// Preserves per-solid names (as glTF node names) and face colors, so the
// resulting GLB can be exploded and made individually interactive in R3F.
import occtimportjs from 'occt-import-js';
import { readFileSync, writeFileSync } from 'fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node scripts/step-to-glb.mjs <input.step> <output.glb>');
  process.exit(1);
}

const occt = await occtimportjs();
const buf = readFileSync(inPath);
// Deflection controls tessellation quality. The originals (0.1 / 0.5 rad ≈ 28°)
// left curved surfaces — the nose cone especially — coarsely faceted, which
// reads as lumps/clumps on the finished skin. Tightening the angular deflection
// to ~0.12 rad (~7°) and halving the chordal tolerance gives far smoother
// surfaces of revolution at a modest triangle-count increase. Re-run
// `npm run convert:cad` after dropping the assembly STEP into CADFiles/.
const result = occt.ReadStepFile(new Uint8Array(buf), { linearDeflection: 0.05, angularDeflection: 0.12 });
if (!result.success) {
  console.error('occt failed to read', inPath);
  process.exit(1);
}

// Map meshIndex -> name using the node hierarchy.
const nameByMesh = {};
const walk = (node, inherited) => {
  const name = node.name || inherited || 'part';
  for (const mi of node.meshes || []) nameByMesh[mi] = name;
  for (const c of node.children || []) walk(c, node.name || inherited);
};
walk(result.root, '');

// --- Build glTF buffers ---
const align4 = (n) => (n + 3) & ~3;
const chunks = [];
let byteOffset = 0;
const bufferViews = [];
const accessors = [];
const materials = [];
const meshes = [];
const nodes = [];
const matKey = new Map();

const pushView = (typedArray, target) => {
  const bytes = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  const padded = align4(bytes.length);
  const view = { buffer: 0, byteOffset, byteLength: bytes.length };
  if (target) view.target = target;
  bufferViews.push(view);
  const out = Buffer.alloc(padded);
  bytes.copy(out);
  chunks.push(out);
  byteOffset += padded;
  return bufferViews.length - 1;
};

const getMaterial = (color) => {
  const r = color ? color[0] : 0.6, g = color ? color[1] : 0.63, b = color ? color[2] : 0.67;
  const key = `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
  if (matKey.has(key)) return matKey.get(key);
  const idx = materials.length;
  materials.push({
    pbrMetallicRoughness: { baseColorFactor: [r, g, b, 1], metallicFactor: 0.85, roughnessFactor: 0.4 },
    name: key,
  });
  matKey.set(key, idx);
  return idx;
};

result.meshes.forEach((m, i) => {
  const pos = m.attributes.position.array instanceof Float32Array ? m.attributes.position.array : new Float32Array(m.attributes.position.array);
  const nrm = m.attributes.normal ? (m.attributes.normal.array instanceof Float32Array ? m.attributes.normal.array : new Float32Array(m.attributes.normal.array)) : null;
  const idxArr = m.index.array instanceof Uint32Array ? m.index.array : new Uint32Array(m.index.array);

  // position accessor needs min/max
  let minx = Infinity, miny = Infinity, minz = Infinity, maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
  for (let k = 0; k < pos.length; k += 3) {
    if (pos[k] < minx) minx = pos[k]; if (pos[k] > maxx) maxx = pos[k];
    if (pos[k + 1] < miny) miny = pos[k + 1]; if (pos[k + 1] > maxy) maxy = pos[k + 1];
    if (pos[k + 2] < minz) minz = pos[k + 2]; if (pos[k + 2] > maxz) maxz = pos[k + 2];
  }

  const posView = pushView(pos, 34962);
  accessors.push({ bufferView: posView, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: [minx, miny, minz], max: [maxx, maxy, maxz] });
  const posAcc = accessors.length - 1;

  let nrmAcc = null;
  if (nrm) {
    const nrmView = pushView(nrm, 34962);
    accessors.push({ bufferView: nrmView, componentType: 5126, count: nrm.length / 3, type: 'VEC3' });
    nrmAcc = accessors.length - 1;
  }

  const idxView = pushView(idxArr, 34963);
  accessors.push({ bufferView: idxView, componentType: 5125, count: idxArr.length, type: 'SCALAR' });
  const idxAcc = accessors.length - 1;

  const attributes = { POSITION: posAcc };
  if (nrmAcc !== null) attributes.NORMAL = nrmAcc;

  meshes.push({ primitives: [{ attributes, indices: idxAcc, material: getMaterial(m.color), mode: 4 }], name: nameByMesh[i] || m.name || `part_${i}` });
  nodes.push({ mesh: meshes.length - 1, name: nameByMesh[i] || m.name || `part_${i}` });
});

const binary = Buffer.concat(chunks);
const gltf = {
  asset: { version: '2.0', generator: 'step-to-glb (occt-import-js)' },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials,
  accessors,
  bufferViews,
  buffers: [{ byteLength: binary.length }],
};

// --- Pack GLB ---
const enc = new TextEncoder();
let jsonBuf = Buffer.from(enc.encode(JSON.stringify(gltf)));
const jsonPad = align4(jsonBuf.length) - jsonBuf.length;
if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
const binPad = align4(binary.length) - binary.length;
const binBuf = binPad ? Buffer.concat([binary, Buffer.alloc(binPad, 0)]) : binary;

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // 'glTF'
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(jsonBuf.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binBuf.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

writeFileSync(outPath, Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]));
console.log(`OK  ${inPath}`);
console.log(`  -> ${outPath}  (${meshes.length} parts, ${(binary.length / 1024).toFixed(0)} KB geometry)`);
console.log('  parts:', meshes.map((m) => m.name).join(', '));
