import { Suspense, lazy, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Preload } from "@react-three/drei";
import * as THREE from "three";
import RocketModel from "./RocketModel";
import RotationController from "./RotationController";
import { Env } from "./StudioEnv";
import { CAMERA_KEYS, PHASES, phaseT, smoothstep } from "./config";
import { useInteraction } from "./interaction";

// Desktop tier only — the chain is skipped entirely on weaker devices rather
// than degraded, so mid hardware keeps its framerate instead of half an effect.
const Post = lazy(() => import("./Post"));

const PHASE_ORDER = ["hero", "overview", "canards", "explode", "sledOut", "inspect", "outro"];

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _curLook = new THREE.Vector3(0, 0.55, 0);

function CameraRig({ reduced, isTouch }) {
  const { progressRef, selectedId, dragging } = useInteraction();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isTouch) return;
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [isTouch]);

  useFrame(({ camera }, dt) => {
    const p = progressRef.current;

    // find active phase
    let phase = "hero";
    for (const name of PHASE_ORDER) {
      if (p >= PHASES[name].start) phase = name;
    }
    const idx = PHASE_ORDER.indexOf(phase);
    const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
    // dwell at this phase's key; blend toward the next key only in the
    // final third of the phase
    const raw = phaseT(p, phase);
    const t = smoothstep(Math.min(1, Math.max(0, (raw - 0.68) / 0.32)));

    const a = CAMERA_KEYS[phase];
    const b = CAMERA_KEYS[next];
    _pos.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    );
    _look.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    );

    // gentle parallax (desktop, not while inspecting or mid-drag)
    if (!isTouch && !selectedId && !reduced && !dragging.current) {
      _pos.x += mouse.current.x * 0.18;
      _pos.y -= mouse.current.y * 0.12;
    }

    const lambda = reduced ? 30 : 4.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, _pos.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, _pos.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, _pos.z, lambda, dt);
    _curLook.x = THREE.MathUtils.damp(_curLook.x, _look.x, lambda, dt);
    _curLook.y = THREE.MathUtils.damp(_curLook.y, _look.y, lambda, dt);
    _curLook.z = THREE.MathUtils.damp(_curLook.z, _look.z, lambda, dt);
    camera.lookAt(_curLook);
  });

  return null;
}

export default function HomeScene({ perfTier, reduced, isTouch }) {
  const dpr = perfTier === 2 ? [1, 2] : perfTier === 1 ? [1, 1.5] : 1;

  return (
    <Canvas
      dpr={dpr}
      // SMAA in the post chain handles edges on the desktop tier; MSAA is only
      // worth paying for where the composer isn't running.
      shadows={perfTier > 0 ? "soft" : false}
      gl={{
        alpha: true,
        antialias: perfTier === 1,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.92,
      }}
      camera={{ fov: 42, near: 0.1, far: 60, position: [3.1, 1.1, 7.6] }}
      style={{ position: "absolute", inset: 0 }}
      // keep default frameloop: damping + turntable need continuous frames
    >
      <Env />
      {/* Kept very low: ambient light has no direction, so it flattens the
          exact shading that makes the vehicle read as solid. */}
      <ambientLight intensity={0.1} />

      {/* Key light. This is the only shadow caster: one crisp shadow direction
          reads as a studio setup, several read as a mess. */}
      <directionalLight
        position={[6, 8, 5]}
        intensity={1.45}
        color="#ffffff"
        castShadow={perfTier > 0}
        // 1024 is plenty at this camera distance; the frustum is tightened to
        // the rocket's actual footprint so the texels aren't spent on empty
        // space, which keeps the shadow crisp despite the smaller map.
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-3.6, 3.6, 6, -5, 0.5, 26]} />
      </directionalLight>

      {/* top light keeps the nose cone from reading black near-vertical */}
      <directionalLight position={[0.5, 12, 3]} intensity={0.45} color="#ffffff" />
      {/* cool rim, separating the hull from the background */}
      <directionalLight position={[-7, 2, -6]} intensity={0.7} color="#7aa7ff" />
      <pointLight position={[0, -5, 3]} intensity={0.35} color="#ff8a52" />
      {/* Fill on the sled presentation zone, in front of the rocket. The bay is
          matte black print, so it needs its own light to read at all. */}
      <pointLight position={[1.2, 0.9, 4.2]} intensity={5.5} distance={7} decay={1.6} color="#ffffff" />
      <pointLight position={[-0.7, -0.4, 3.6]} intensity={2.2} distance={5} decay={1.6} color="#bcd2ff" />

      <CameraRig reduced={reduced} isTouch={isTouch} />
      <RotationController isTouch={isTouch} reduced={reduced} />
      <Suspense fallback={null}>
        <RocketModel isTouch={isTouch} reduced={reduced} />
        {/* Grounds the vehicle: without it the rocket floats in a void.
            512 is ample for a soft blurred contact shadow and a quarter of the
            fill of the old 1024 map. */}
        {perfTier > 0 && (
          <ContactShadows
            position={[0, -4.1, 0]}
            scale={16}
            resolution={512}
            blur={2.6}
            opacity={0.5}
            far={6}
            frames={reduced ? 1 : Infinity}
          />
        )}
        {/* Compile every material and upload every texture during the loading
            Suspense, so the first time a board scrolls into view or is pulled
            out there's no shader-compile hitch. */}
        <Preload all />
      </Suspense>
      {perfTier === 2 && (
        <Suspense fallback={null}>
          <Post />
        </Suspense>
      )}
    </Canvas>
  );
}
