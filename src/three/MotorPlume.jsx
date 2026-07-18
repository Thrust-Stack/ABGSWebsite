// Motor ignition for the outro. The stack re-closes, the motor lights at the
// static fin can's nozzle, and the vehicle accelerates out of the top of frame
// before the video section takes over.
//
// Two additive shells rather than a particle system: a white-hot core cone and
// a wider, longer, softer outer plume around it. Both are open-ended cones with
// the apex pointing aft, brightened at grazing angles so a hollow shell reads as
// a volume instead of a tube. Colours come from C3 (orange for the plume body,
// a hot near-white throat) and are pushed above 1.0 so the desktop Bloom pass
// (threshold 1.05) catches the plume and nothing else on the vehicle.
//
// No light is attached to the nozzle on purpose. Adding a fifth point light
// changes NUM_POINT_LIGHTS and recompiles every material in the scene — a hitch
// landing exactly on the ignition frame, which is the one moment that has to be
// smooth. The bloom off the emissive shells does the same job for free.
//
// Perf: the group is invisible and every per-frame uniform write is skipped
// until the scroll reaches the outro phase, so this is inert for the rest of
// the page.
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { C3, phaseT, igniteAt, outroArmed } from "./config";
import { useInteraction } from "./interaction";

const VERT = /* glsl */ `
  uniform float uLen;
  varying float vT;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // 0 at the throat (cone base), 1 at the tip
    vT = clamp(position.y / uLen + 0.5, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform float uShock;
  varying float vT;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // brightest at the throat, gone by the tip
    float fall = pow(1.0 - vT, 1.5);
    // combustion flicker
    float flick = 0.86 + 0.14 * sin(uTime * 41.0 + vT * 9.0) * sin(uTime * 27.3);
    // standing shock diamonds, near field only
    float shock = 1.0 + uShock * sin(vT * 30.0 - uTime * 12.0) * (1.0 - smoothstep(0.0, 0.45, vT));
    // grazing angles look through more of the shell, so brighten them
    float graze = mix(0.5, 1.0, pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.4));
    vec3 col = mix(uHot, uCool, pow(vT, 0.7));
    float a = fall * flick * shock * graze * uIntensity;
    gl_FragColor = vec4(col, a);
    // With the post chain running, the composer owns tone mapping and this is a
    // no-op, so the >1.0 colours reach Bloom intact. Without it (mid/low tiers)
    // ACES applies here as it does for every other material, so the plume is
    // mapped rather than clipping to a white blob.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Additive, no depth write: the two shells overlap each other and the fin can.
const makeMat = (len, hot, cool, shock) =>
  new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uLen: { value: len },
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uHot: { value: new THREE.Color(hot) },
      uCool: { value: new THREE.Color(cool) },
      uShock: { value: shock },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

export default function MotorPlume({ nozzleY, nozzleR, reduced }) {
  const { progressRef } = useInteraction();
  const group = useRef();
  const coreRef = useRef();
  const outerRef = useRef();

  // Core is short and near-white at the throat; the outer plume is roughly
  // twice as long and twice as wide, and carries the orange.
  const CORE_LEN = nozzleR * 7.6;
  const OUTER_LEN = nozzleR * 16.0;

  const mats = useMemo(() => {
    // Values above 1.0 are deliberate — this is what Bloom keys off.
    const core = makeMat(CORE_LEN, "#fff6ea", C3.orange, 0.22);
    core.uniforms.uHot.value.multiplyScalar(3.4);
    core.uniforms.uCool.value.multiplyScalar(1.9);

    const outer = makeMat(OUTER_LEN, C3.orange, "#4a1c6e", 0.1);
    outer.uniforms.uHot.value.multiplyScalar(1.5);
    outer.uniforms.uCool.value.multiplyScalar(0.6);

    return { core, outer };
  }, [CORE_LEN, OUTER_LEN]);

  useEffect(() => () => {
    mats.core.dispose();
    mats.outer.dispose();
  }, [mats]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const p = progressRef.current;

    // Inert until the outro is in reach — one comparison per frame otherwise.
    if (!outroArmed(p)) {
      if (g.visible) g.visible = false;
      return;
    }

    const k = igniteAt(phaseT(p, "outro"));
    g.visible = k > 0.001;
    if (!g.visible) return;

    const t = reduced ? 0 : state.clock.elapsedTime;
    mats.core.uniforms.uTime.value = t;
    mats.outer.uniforms.uTime.value = t;
    mats.core.uniforms.uIntensity.value = k;
    mats.outer.uniforms.uIntensity.value = k * 0.62;

    // The plume lengthens as it throttles up rather than fading in at full
    // size: a motor that comes up to pressure reads as ignition, one that
    // cross-fades reads as an overlay.
    const grow = 0.35 + 0.65 * k;
    // Per-shell length jitter, small enough to read as combustion roughness.
    const jitter = reduced ? 1 : 1 + 0.05 * Math.sin(t * 33.0);
    if (coreRef.current) coreRef.current.scale.set(grow, grow * jitter, grow);
    if (outerRef.current) {
      const og = grow * 1.04;
      outerRef.current.scale.set(og, og * (2 - jitter), og);
    }
  });

  // Cones are authored apex-up; rotating PI about X points the apex aft, and
  // offsetting by half the length puts the base exactly on the nozzle exit.
  // The scale lives on the wrapper, not the mesh: scaling the mesh would grow
  // it about its own centre and lift the throat off the nozzle, whereas the
  // wrapper's origin *is* the nozzle, so the plume only ever grows aft.
  const shell = (ref, mat, len, rad) => (
    <group ref={ref}>
      <mesh
        material={mat}
        position={[0, -len / 2, 0]}
        rotation={[Math.PI, 0, 0]}
        frustumCulled={false}
      >
        <coneGeometry args={[rad, len, 24, 1, true]} />
      </mesh>
    </group>
  );

  return (
    <group ref={group} position={[0, nozzleY, 0]} visible={false}>
      {shell(outerRef, mats.outer, OUTER_LEN, nozzleR * 1.45)}
      {shell(coreRef, mats.core, CORE_LEN, nozzleR * 0.8)}
    </group>
  );
}
