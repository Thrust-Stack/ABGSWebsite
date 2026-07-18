// Shared procedural studio environment — no network fetches, works offline.
//
// This is the single most important thing in any of our scenes for making metal
// look like metal and printed ASA read as matte plastic rather than a CAD
// viewport: a dark room with a few bright softboxes, the way a product
// photographer would build it, baked into a PMREM env map. Extracted here so the
// home scene and the small isolated viewers (the telemetry fin can, the hardware
// board previews) all light their parts identically.
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export function studioEnv() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#06080c");
  const geo = new THREE.PlaneGeometry(1, 1);
  const add = (hex, power, pos, scale) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.setHex(hex).multiplyScalar(power);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.scale.set(scale[0], scale[1], 1);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  add(0xffffff, 6.0, [7, 8, 6], [7, 16]); // key softbox, tall so it streaks
  add(0xbcd2ff, 1.1, [-9, 2, -4], [14, 14]); // broad cool fill
  add(0x7aa7ff, 3.4, [-5, 1, -8], [1.4, 18]); // narrow rim strip
  add(0xff8a52, 0.7, [1, -8, 3], [10, 6]); // warm kick from below
  add(0xffffff, 0.8, [0, 13, 0], [16, 16]); // ceiling
  return { scene, geo };
}

/**
 * Installs the studio env map on the current scene. `intensity` is the dial that
 * decides whether metals read as aluminium (lower) or blow out to white (higher).
 */
export function Env({ intensity = 0.75 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const { scene: envScene, geo } = studioEnv();
    // Low sigma keeps the softbox edges crisp — that's what makes the streaks.
    const tex = pmrem.fromScene(envScene, 0.015).texture;
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
      geo.dispose();
      envScene.traverse((o) => o.material?.dispose());
    };
  }, [gl, scene, intensity]);
  return null;
}
