// Procedural PCB surfacing.
//
// The avionics boards are built from geometry rather than imported meshes, so
// their surfaces have to carry the detail instead. Each board gets a generated
// albedo / roughness / metalness set drawn on canvas: solder mask, a copper
// pour with a trace field routed over it, gold pads and vias, and white
// silkscreen. The three maps matter more than the drawing itself — a PCB reads
// as real because the pads are mirror-metal against a semi-gloss mask and matte
// silkscreen, which is a material contrast, not a color one.
//
// Everything is deterministic (seeded PRNG) so a given board looks identical
// across reloads, and cached by key so the four Adafruit boards that share a
// mask color don't each rasterize their own.
import * as THREE from "three";

const PX_PER_MM = 12;
const cache = new Map();

// LCG — deterministic across reloads and machines.
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Solder mask palettes, sampled from the real boards.
export const MASK = {
  green: { mask: "#0d5a2b", pour: "#0f6b33", trace: "#127a3a", silk: "#e8efe9", edge: "#c8b98a" },
  black: { mask: "#15171b", pour: "#1b1e23", trace: "#23272e", silk: "#e6e9ee", edge: "#8f8a72" },
  violet: { mask: "#4b1f78", pour: "#57258a", trace: "#632c9b", silk: "#efe8f6", edge: "#c8b98a" },
  // The royal blue of the common PCA9685 / regulator boards. Kept bright on
  // purpose: a dark navy mask sits low enough that the hover tint drags it
  // visibly toward purple.
  blue: { mask: "#1b52bd", pour: "#1f5cd0", trace: "#2668e0", silk: "#e6edf7", edge: "#c8b98a" },
};

const GOLD = "#c9a227"; // ENIG pad finish

// Draws the same feature into all three maps with per-map values.
class Surface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.ctx = ["a", "r", "m"].map(() => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c.getContext("2d");
    });
  }
  // v = [albedoColor, roughness 0..1, metalness 0..1]
  set(v) {
    this.ctx[0].fillStyle = v[0];
    this.ctx[0].strokeStyle = v[0];
    const r = Math.round(v[1] * 255);
    this.ctx[1].fillStyle = `rgb(${r},${r},${r})`;
    this.ctx[1].strokeStyle = `rgb(${r},${r},${r})`;
    const m = Math.round(v[2] * 255);
    this.ctx[2].fillStyle = `rgb(${m},${m},${m})`;
    this.ctx[2].strokeStyle = `rgb(${m},${m},${m})`;
  }
  each(fn) {
    this.ctx.forEach(fn);
  }
  fill(x, y, w, h) {
    this.each((c) => c.fillRect(x, y, w, h));
  }
  fillAll() {
    this.fill(0, 0, this.w, this.h);
  }
  lineWidth(px) {
    this.each((c) => {
      c.lineWidth = px;
      c.lineCap = "round";
      c.lineJoin = "round";
    });
  }
  poly(pts) {
    this.each((c) => {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.stroke();
    });
  }
  disc(x, y, r) {
    this.each((c) => {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    });
  }
  // Silkscreen legend. Canvas is y-down; with the default flipY the canvas top
  // row lands at +Y on the board, so these read the right way up from above.
  text(str, x, y, size, rot = 0) {
    this.each((c) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.font = `700 ${size}px ui-monospace, "SF Mono", Menlo, monospace`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(str, 0, 0);
      c.restore();
    });
  }
  textures() {
    const [a, r, m] = this.ctx.map((c) => new THREE.CanvasTexture(c.canvas));
    a.colorSpace = THREE.SRGBColorSpace;
    for (const t of [a, r, m]) t.anisotropy = 8;
    return { map: a, roughnessMap: r, metalnessMap: m };
  }
}

// Manhattan-ish routing between two points, like a real autorouter: travel on
// one axis, turn 45°, finish on the other.
function routeTo(sx, sy, ex, ey) {
  const dx = ex - sx;
  const dy = ey - sy;
  const diag = Math.min(Math.abs(dx), Math.abs(dy));
  const mx = sx + Math.sign(dx) * (Math.abs(dx) - diag);
  const my = sy;
  return [
    [sx, sy],
    [mx, my],
    [mx + Math.sign(dx) * diag, my + Math.sign(dy) * diag],
    [ex, ey],
  ];
}

/**
 * Generate the map set for a board.
 * @param key    cache key — boards with identical surfacing share maps
 * @param wmm/hmm board size in mm (drives texel density and detail scale)
 * @param tone   key into MASK
 * @param seed   PRNG seed for the trace field
 * @param silk   optional (s, W, H) => void hook to draw board-specific silkscreen
 */
export function pcbMaps({ key, wmm, hmm, tone = "green", seed = 1, silk }) {
  const hit = cache.get(key);
  if (hit) return hit;

  const P = MASK[tone] || MASK.green;
  const W = Math.max(2, Math.round(wmm * PX_PER_MM));
  const H = Math.max(2, Math.round(hmm * PX_PER_MM));
  const s = new Surface(W, H);
  const rand = rng(seed);

  // 1. solder mask over the whole board
  s.set([P.mask, 0.42, 0.0]);
  s.fillAll();

  // 2. copper ground pour, slightly proud of the mask
  s.set([P.pour, 0.38, 0.0]);
  const inset = 1.4 * PX_PER_MM;
  s.fill(inset, inset, W - inset * 2, H - inset * 2);

  // 3. trace field — bus-like parallel runs plus scattered signal routes
  s.set([P.trace, 0.34, 0.0]);
  s.lineWidth(Math.max(1, 0.22 * PX_PER_MM));
  const busN = Math.round(H / (2.6 * PX_PER_MM));
  for (let i = 0; i < busN; i++) {
    const y = inset + 1.6 * PX_PER_MM + i * 2.6 * PX_PER_MM;
    if (y > H - inset) break;
    const x0 = inset + rand() * W * 0.2;
    const x1 = W - inset - rand() * W * 0.2;
    s.poly([
      [x0, y],
      [x0 + 1.2 * PX_PER_MM, y],
      [x1 - 1.2 * PX_PER_MM, y + (rand() < 0.5 ? -1 : 1) * 0.9 * PX_PER_MM],
      [x1, y + (rand() < 0.5 ? -1 : 1) * 0.9 * PX_PER_MM],
    ]);
  }
  const sigN = Math.round((wmm * hmm) / 26);
  for (let i = 0; i < sigN; i++) {
    s.poly(
      routeTo(
        inset + rand() * (W - inset * 2),
        inset + rand() * (H - inset * 2),
        inset + rand() * (W - inset * 2),
        inset + rand() * (H - inset * 2)
      )
    );
  }

  // 4. vias — gold, and the main reason a PCB glints when it turns
  const viaN = Math.round((wmm * hmm) / 14);
  for (let i = 0; i < viaN; i++) {
    const x = inset + rand() * (W - inset * 2);
    const y = inset + rand() * (H - inset * 2);
    s.set([GOLD, 0.22, 0.95]);
    s.disc(x, y, 0.34 * PX_PER_MM);
    s.set([P.mask, 0.42, 0.0]);
    s.disc(x, y, 0.14 * PX_PER_MM);
  }

  // 5. silkscreen — matte white, board-specific outlines/marks
  s.set([P.silk, 0.86, 0.0]);
  s.lineWidth(Math.max(1, 0.16 * PX_PER_MM));
  if (silk) silk(s, W, H, PX_PER_MM);

  const maps = s.textures();
  maps.edge = P.edge;
  maps.silkColor = P.silk;
  cache.set(key, maps);
  return maps;
}

// Convenience: a silkscreen hook that outlines a component footprint.
export const silkBox = (s, x, y, w, h) => {
  s.each((c) => c.strokeRect(x, y, w, h));
};

const geoCache = new Map();

/**
 * A PCB blank: rounded-corner extrusion, thickness `t`, with UVs remapped so
 * the generated maps land square on the faces (ExtrudeGeometry's own UVs are
 * unusable for this). Group 0 = faces, group 1 = the FR4 edge.
 */
export function boardGeometry(wmm, hmm, tmm = 1.6, rmm = 1.6) {
  const key = `${wmm}:${hmm}:${tmm}:${rmm}`;
  const hitGeo = geoCache.get(key);
  if (hitGeo) return hitGeo;

  const w = wmm;
  const h = hmm;
  const r = Math.min(rmm, w / 2 - 0.01, h / 2 - 0.01);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: tmm,
    bevelEnabled: false,
    curveSegments: 4,
  });
  geo.translate(0, 0, -tmm / 2);

  // Remap UVs from XY so the maps sit square on the board faces.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  }
  uv.needsUpdate = true;
  geo.computeVertexNormals();
  geoCache.set(key, geo);
  return geo;
}

// FR4 edge — the raw fiberglass a board shows where it was routed out.
export function edgeMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.78 });
}

export function disposePcbCaches() {
  for (const m of cache.values()) {
    m.map.dispose();
    m.roughnessMap.dispose();
    m.metalnessMap.dispose();
  }
  cache.clear();
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
}
