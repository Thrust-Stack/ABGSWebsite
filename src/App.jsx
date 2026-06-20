import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { TEAM_NAME, mono, accent, GridBackground, ScanLine, Footer } from "./shared";
import Overview from "./pages/Overview";
import Mission from "./pages/Mission";
import Telemetry from "./pages/Telemetry";
import Hardware from "./pages/Hardware";
import Timeline from "./pages/Timeline";
import Team from "./pages/Team";

const navLinks = ["Mission", "Telemetry", "Hardware", "Timeline", "Team"];

function Nav() {
  const { pathname } = useLocation();
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "20px 32px",
      background: "linear-gradient(to bottom, rgba(8,10,14,0.95), transparent)",
      backdropFilter: "blur(8px)",
    }}>
      <Link to="/" style={{ fontFamily: mono, fontSize: "13px", fontWeight: 700, letterSpacing: "3px", color: accent, textDecoration: "none" }}>
        ▲ {TEAM_NAME}
      </Link>
      <div style={{ display: "flex", gap: "28px" }}>
        {navLinks.map((label) => {
          const path = `/${label.toLowerCase()}`;
          const active = pathname === path;
          return (
            <Link key={label} to={path} style={{
              fontFamily: mono, fontSize: "11px", letterSpacing: "2px",
              color: active ? accent : "rgba(255,255,255,0.75)",
              textDecoration: "none", textTransform: "uppercase", transition: "color 0.3s",
            }}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ background: "#080a0e", color: "#fff", minHeight: "100vh", position: "relative", overflowX: "hidden" }}>
        <GridBackground />
        <ScanLine />
        <Nav />
        <div style={{ position: "relative", zIndex: 2 }}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/mission" element={<Mission />} />
            <Route path="/telemetry" element={<Telemetry />} />
            <Route path="/hardware" element={<Hardware />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/team" element={<Team />} />
          </Routes>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}
