// Post chain, split into its own chunk and only ever imported on the desktop
// tier — phones and low-power machines never download it.
//
// Ambient occlusion is what separates a render from a CAD viewport: it darkens
// the contact lines where a chip meets its board, where the sled meets the nose
// and where a cable lies against the deck. No arrangement of lights fakes that.
// Bloom is thresholded above white so it only catches the emissive board LEDs
// rather than blooming the whole hull.
//
// Perf: the composer runs WITHOUT a normal pass. N8AO can reconstruct normals
// from the depth buffer, which avoids re-rendering the whole 257-mesh scene a
// second time every frame purely for a normal buffer — that extra scene pass
// was one of the largest costs in the chain. Depth-reconstructed normals are
// marginally softer on hard edges, which is invisible at this AO radius.
import { EffectComposer, N8AO, Bloom, SMAA } from "@react-three/postprocessing";

export default function Post() {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.42} intensity={2.0} distanceFalloff={0.7} quality="low" halfRes />
      <Bloom luminanceThreshold={1.05} luminanceSmoothing={0.3} intensity={0.5} mipmapBlur />
      <SMAA />
    </EffectComposer>
  );
}
