// Small self-contained 3D viewer, shared by the telemetry fin-can render and the
// hardware board previews. Same studio-environment + light approach as the home
// scene (via StudioEnv), scaled down to a single part on a dark card — none of
// these load the rocket-assembly.glb; they render procedural parts only.
import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Env } from "./StudioEnv";

export function MiniCanvas({
  children,
  height = 300,
  cameraPosition = [2.6, 1.4, 3.4],
  fov = 40,
  controls = false,
  autoRotate = false,
  contactShadow = true,
  groundY = -1.15,
  dpr = [1, 2],
}) {
  return (
    <Canvas
      dpr={dpr}
      shadows
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
      }}
      camera={{ fov, near: 0.05, far: 60, position: cameraPosition }}
      style={{ width: "100%", height, display: "block" }}
    >
      <Env intensity={0.85} />
      {/* Low ambient — direction is what makes a part read as solid. */}
      <ambientLight intensity={0.12} />
      {/* Single crisp key + shadow caster, like the home scene's rig. */}
      <directionalLight
        position={[4, 6, 4]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.1, 20]} />
      </directionalLight>
      {/* cool rim + warm underkick + a white fill on the front face */}
      <directionalLight position={[-5, 2, -4]} intensity={0.6} color="#7aa7ff" />
      <pointLight position={[0, -3, 3]} intensity={0.5} color="#ff8a52" />
      <pointLight position={[1.6, 1.4, 3.2]} intensity={3} distance={9} decay={1.6} color="#ffffff" />

      <Suspense fallback={null}>
        {children}
        {contactShadow && (
          <ContactShadows position={[0, groundY, 0]} scale={7} resolution={512} blur={2.6} opacity={0.45} far={5} />
        )}
      </Suspense>

      {controls && (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.1}
          minPolarAngle={Math.PI * 0.16}
          maxPolarAngle={Math.PI * 0.84}
        />
      )}
    </Canvas>
  );
}

/**
 * Measures its children's bounding box once and normalizes them to a consistent
 * on-screen size, centered at the origin. This is what lets an MPU6050 and a
 * Raspberry Pi 5 — wildly different real sizes — both arrive readable, the same
 * intent as InteractivePart's per-board `inspect` factors, done automatically.
 */
export function AutoFit({ children, size = 2.2, spin = false, spinSpeed = 0.5 }) {
  const outer = useRef();
  const inner = useRef();
  const fitted = useRef(false);

  useLayoutEffect(() => {
    if (fitted.current || !inner.current || !outer.current) return;
    // Measure the untransformed part: reset any prior fit so the bounding box is
    // read in the part's own units, never through an already-applied scale.
    outer.current.scale.setScalar(1);
    inner.current.position.set(0, 0, 0);
    outer.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(inner.current);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    const sz = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(sz);
    const maxDim = Math.max(sz.x, sz.y, sz.z) || 1;
    inner.current.position.set(-center.x, -center.y, -center.z);
    outer.current.scale.setScalar(size / maxDim);
    outer.current.visible = true;
    fitted.current = true;
  });

  useFrame((_, dt) => {
    if (spin && outer.current) outer.current.rotation.y += dt * spinSpeed;
  });

  return (
    <group ref={outer} visible={false}>
      <group ref={inner}>{children}</group>
    </group>
  );
}
