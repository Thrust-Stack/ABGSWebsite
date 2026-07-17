// Convert every STEP file under CADFiles/ into a web-ready GLB in public/models/.
// Run: npm run convert:cad
// A single assembly STEP (many named solids) becomes one GLB with named nodes,
// which is exactly what the 3D scene needs for the exploded view + interactivity.
import { readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { execFileSync } from 'child_process';

const CAD_DIR = 'CADFiles';
const OUT_DIR = 'public/models';

const slug = (name) =>
  basename(name, extname(name))
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function findStep(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findStep(full, acc);
    else if (/\.(step|stp)$/i.test(entry)) acc.push(full);
  }
  return acc;
}

const files = findStep(CAD_DIR);
if (files.length === 0) {
  console.log(`No STEP files found under ${CAD_DIR}/. Export your assembly as STEP AP242 and re-run.`);
  process.exit(0);
}

console.log(`Found ${files.length} STEP file(s):\n`);
for (const f of files) {
  const out = join(OUT_DIR, `${slug(f)}.glb`);
  try {
    execFileSync('node', ['scripts/step-to-glb.mjs', f, out], { stdio: 'inherit' });
  } catch {
    console.error(`FAILED: ${f}`);
  }
  console.log('');
}
console.log('Done. GLBs written to', OUT_DIR);
