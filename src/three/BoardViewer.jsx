// A single avionics board, rendered on its own for the Hardware page cards.
// Reuses the exact procedural board components from parts/boards.jsx (the same
// ones the home-page sled uses) so a board looks identical pulled out here as it
// does inside the rocket — no rocket-assembly.glb is touched.
import { MM, RaspberryPi5, Esp32, Mpu6050, Bmp585, UltimateGps, Rfm95w, Pca9685, Ubec, LipoPack } from "./parts/boards";
import { MiniCanvas, AutoFit } from "./MiniViewer";

// Card id (from data/project.js `components`) -> board component, matching the
// BOARDS registry the sled uses in Sled.jsx.
const BOARD_EL = {
  "raspberry-pi-5": <RaspberryPi5 />,
  esp32: <Esp32 />,
  mpu6050: <Mpu6050 />,
  bmp585: <Bmp585 />,
  "gps-v3": <UltimateGps />,
  rfm95w: <Rfm95w />,
  pca9685: <Pca9685 />,
  battery: <LipoPack />,
  "bec-ubec": <Ubec />,
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
      {/* boards are authored in mm; MM puts them in the same units the sled uses,
          then AutoFit normalizes every board to one readable on-card size */}
      <AutoFit size={2.3}>
        <group scale={MM}>{el}</group>
      </AutoFit>
    </MiniCanvas>
  );
}
