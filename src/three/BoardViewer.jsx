// A single avionics part, rendered on its own for the Hardware page cards.
// Reuses the exact procedural components from parts/boards.jsx (the same ones
// the home-page sled uses) so a part looks identical pulled out here as it does
// inside the rocket — no rocket-assembly.glb is touched.
import {
  MM, Perfboard, Esp32, HeltecEsp32, Mpu6500, Bmp585, UltimateGps,
  MicroSdReader, StepDown, SwitchHousing, LipoPack,
} from "./parts/boards";
import { MiniCanvas, AutoFit } from "./MiniViewer";

// Card id (from data/project.js `components`) -> part model, matching the
// registries the sled uses in Sled.jsx.
const BOARD_EL = {
  "esp32-main": <Esp32 />,
  "heltec-esp32": <HeltecEsp32 />,
  "gps-module": <UltimateGps />,
  bmp585: <Bmp585 />,
  mpu6500: <Mpu6500 />,
  microsd: <MicroSdReader />,
  perfboard: <Perfboard />,
  "battery-electronics": <LipoPack w={30} l={50} t={14} accent="#3b82f6" />,
  "battery-servo": <LipoPack w={35} l={62} t={18} accent="#ff6a2c" />,
  "stepdown-electronics": <StepDown id="buck-elec" tone="blue" />,
  "stepdown-servo": <StepDown id="buck-servo" tone="green" />,
  "switch-housing": <SwitchHousing />,
};

export function hasBoard(id) {
  return !!BOARD_EL[id];
}

export default function BoardViewer({ id, height = 260, reduced = false }) {
  const el = BOARD_EL[id];
  if (!el) return null;
  return (
    <MiniCanvas
      height={height}
      cameraPosition={[2.4, 1.3, 3.3]}
      controls
      autoRotate={!reduced}
      groundY={-1.25}
    >
      {/* parts are authored in mm; MM puts them in the same units the sled uses,
          then AutoFit normalizes every part to one readable on-card size */}
      <AutoFit size={2.3}>
        <group scale={MM}>{el}</group>
      </AutoFit>
    </MiniCanvas>
  );
}
