import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useAssembly, MATS } from "./assembly";
import { Env } from "./StudioEnv";
import { usePerfTier } from "./hooks";
import { createInterpolatedSample, interpolateTimeline } from "../simulation/attitude";

const CAMERA_POSITION = [6.4, 2.4, 10.6];
const LOOK_AT = new THREE.Vector3(0, 0, 0);

function CameraRig({ mode, reduced }) {
  const { camera, size } = useThree();
  useFrame((state, delta) => {
    if (mode !== "studio") return;
    const narrow = size.width / Math.max(1, size.height) < 0.9;
    const phase = reduced ? 0 : state.clock.elapsedTime * 0.06;
    const targetX = Math.cos(phase) * (narrow ? 4.1 : 6.4);
    const targetY = narrow ? 1.4 : 2.4;
    const targetZ = Math.sin(phase) * (narrow ? 0.8 : 1.4) + (narrow ? 6.6 : 10.1);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.2, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.2, delta);
    camera.lookAt(LOOK_AT);
  });
  return null;
}

function controlledCanardIndexes(canardPivots) {
  if (canardPivots.length < 2) return new Set(canardPivots.map((_, index) => index));
  const first = 0;
  let opposite = 1;
  let smallestDot = Infinity;
  for (let index = 1; index < canardPivots.length; index += 1) {
    const dot = canardPivots[first].radial.dot(canardPivots[index].radial);
    if (dot < smallestDot) {
      smallestDot = dot;
      opposite = index;
    }
  }
  return new Set([first, opposite]);
}

function FlightRocket({ timeline, playback, showAxes }) {
  const { sections, canardPivots } = useAssembly();
  const bodyRef = useRef();
  const pivotRefs = useRef([]);
  const pose = useRef(createInterpolatedSample());
  const controlled = useMemo(() => controlledCanardIndexes(canardPivots), [canardPivots]);
  const materials = useMemo(() => {
    const result = {};
    for (const key of Object.keys(sections)) result[key] = sections[key].map(() => MATS[key]());
    return result;
  }, [sections]);
  const staticFinMaterials = useMemo(
    () =>
      sections.staticFinCan.map((part, index) => {
        if (/airfoil fin/i.test(part.name)) return MATS.canard();
        if (/fake motor/i.test(part.name)) return MATS.upperBody();
        return materials.staticFinCan[index];
      }),
    [materials.staticFinCan, sections.staticFinCan]
  );
  const canardMaterials = useMemo(
    () => canardPivots.map(() => MATS.canard()),
    [canardPivots]
  );

  useFrame((_, delta) => {
    playback.advance(delta);
    const current = interpolateTimeline(timeline, playback.timeRef.current, pose.current);
    if (bodyRef.current) bodyRef.current.quaternion.copy(current.orientation);
    pivotRefs.current.forEach((pivot, index) => {
      if (!pivot) return;
      const target = controlled.has(index) ? current.rollCommandRad : 0;
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, target, 12, delta);
    });
  });

  return (
    <group ref={bodyRef} scale={0.88}>
      {Object.entries(sections).map(([key, parts]) =>
        parts.map((part, index) => (
          <mesh
            key={`${key}-${part.name}-${index}`}
            geometry={part.geo}
            material={key === "staticFinCan" ? staticFinMaterials[index] : materials[key][index]}
            castShadow
            receiveShadow
          />
        ))
      )}
      {canardPivots.map((canard, index) => (
        <group key={index} position={canard.root} quaternion={canard.q}>
          <group ref={(element) => (pivotRefs.current[index] = element)}>
            <group quaternion={canard.qInv} position={canard.holderPos}>
              <mesh geometry={canard.geo} material={canardMaterials[index]} castShadow receiveShadow />
            </group>
          </group>
        </group>
      ))}
      {showAxes ? <axesHelper args={[1.2]} /> : null}
    </group>
  );
}

function SimulationScene({ timeline, playback, cameraMode, showAxes, reduced, perfTier }) {
  return (
    <>
      <color attach="background" args={["#090b10"]} />
      <fog attach="fog" args={["#090b10", 11, 24]} />
      <Env intensity={0.82} />
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[5, 7, 5]}
        intensity={2.1}
        castShadow={perfTier > 0}
        shadow-mapSize={[perfTier > 1 ? 1536 : 768, perfTier > 1 ? 1536 : 768]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-4, 1, -5]} intensity={0.75} color="#78a7ff" />
      <pointLight position={[2, -3, 4]} intensity={0.8} color="#ff7b43" />

      <FlightRocket timeline={timeline} playback={playback} showAxes={showAxes} />
      <Grid
        position={[0, -4.05, 0]}
        args={[18, 18]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2b3442"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#49627e"
        fadeDistance={18}
        fadeStrength={1.4}
        infiniteGrid
      />
      {perfTier > 0 ? (
        <ContactShadows
          position={[0, -4.02, 0]}
          scale={9}
          resolution={perfTier > 1 ? 1024 : 512}
          blur={2.8}
          opacity={0.38}
          far={8}
        />
      ) : null}
      <CameraRig mode={cameraMode} reduced={reduced} />
      <OrbitControls
        enabled={cameraMode === "orbit"}
        enablePan={false}
        minDistance={7}
        maxDistance={17}
        minPolarAngle={Math.PI * 0.12}
        maxPolarAngle={Math.PI * 0.88}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function RocketSimulationViewer({
  timeline,
  playback,
  cameraMode,
  showAxes,
  reduced,
}) {
  const perfTier = usePerfTier();
  const dpr = perfTier > 1 ? [1, 1.75] : perfTier === 1 ? [1, 1.35] : 1;
  return (
    <Canvas
      dpr={dpr}
      shadows={perfTier > 0}
      camera={{ position: CAMERA_POSITION, fov: 39, near: 0.1, far: 50 }}
      gl={{
        alpha: false,
        antialias: perfTier > 0,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.95,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <SimulationScene
        timeline={timeline}
        playback={playback}
        cameraMode={cameraMode}
        showAxes={showAxes}
        reduced={reduced}
        perfTier={perfTier}
      />
    </Canvas>
  );
}
