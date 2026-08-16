import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Analytics } from "@vercel/analytics/react";
import { color, font, ease, z } from "./design/tokens";
import { PageTransition } from "./design/motion";
import { useIsMobile } from "./design/primitives";
import { PROJECT_LABEL, TAGLINE, TEAM_NAME } from "./data/project";
import Atmosphere from "./components/Atmosphere";
import Footer from "./components/Footer";

const ROUTE_LOADERS = {
  "/": () => import("./pages/Home"),
  "/mission": () => import("./pages/Mission"),
  "/telemetry": () => import("./pages/Telemetry"),
  "/hardware": () => import("./pages/Hardware"),
  "/software": () => import("./pages/Software"),
  "/timeline": () => import("./pages/Timeline"),
  "/team": () => import("./pages/Team"),
};

const Home = lazy(ROUTE_LOADERS["/"]);
const Mission = lazy(ROUTE_LOADERS["/mission"]);
const Telemetry = lazy(ROUTE_LOADERS["/telemetry"]);
const Hardware = lazy(ROUTE_LOADERS["/hardware"]);
const Software = lazy(ROUTE_LOADERS["/software"]);
const Timeline = lazy(ROUTE_LOADERS["/timeline"]);
const Team = lazy(ROUTE_LOADERS["/team"]);

const navLinks = ["Mission", "Telemetry", "Hardware", "Software", "Timeline", "Team"];

function Wordmark({ onNavigate }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      aria-label="Thrust Stack home"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path d="M9 1 L14 15 L9 12 L4 15 Z" fill="none" stroke={color.orange} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.24em",
          color: color.text,
        }}
      >
        {TEAM_NAME}
      </span>
    </Link>
  );
}

function Nav() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > 24);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const linkStyle = (active) => ({
    fontFamily: font.mono,
    fontSize: 11,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    textDecoration: "none",
    color: active ? color.text : color.textFaint,
    padding: "6px 2px",
    borderBottom: `1px solid ${active ? color.orange : "transparent"}`,
    transition: `color 200ms ${ease.out}, border-color 200ms ${ease.out}`,
  });

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: z.nav,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "14px 20px" : "16px 36px",
          background: scrolled || menuOpen ? color.bgGlass : "transparent",
          borderBottom: `1px solid ${scrolled ? color.line : "transparent"}`,
          backdropFilter: scrolled || menuOpen ? "blur(14px)" : "none",
          WebkitBackdropFilter: scrolled || menuOpen ? "blur(14px)" : "none",
          transition: `background 300ms ${ease.out}, border-color 300ms ${ease.out}`,
        }}
      >
        <Wordmark onNavigate={() => setMenuOpen(false)} />
        {isMobile ? (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            style={{
              background: "none",
              border: `1px solid ${menuOpen ? color.line2 : "transparent"}`,
              borderRadius: 4,
              cursor: "pointer",
              color: color.text,
              padding: "8px 10px",
              lineHeight: 0,
            }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
              {menuOpen ? (
                <>
                  <line x1="2" y1="2" x2="16" y2="12" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="16" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="1.6" />
                </>
              ) : (
                <>
                  <line x1="0" y1="2" x2="18" y2="2" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.6" />
                  <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.6" />
                </>
              )}
            </svg>
          </button>
        ) : (
          <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
            {navLinks.map((label) => {
              const path = `/${label.toLowerCase()}`;
              return (
                <NavLink
                  key={label}
                  to={path}
                  style={({ isActive }) => linkStyle(isActive)}
                  onMouseEnter={ROUTE_LOADERS[path]}
                  onFocus={ROUTE_LOADERS[path]}
                >
                  {label}
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Mobile menu */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: z.nav - 1,
            background: "rgba(8,9,11,0.97)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 34,
          }}
        >
          {navLinks.map((label, i) => {
            const path = `/${label.toLowerCase()}`;
            const active = pathname === path;
            return (
              <Link
                key={label}
                to={path}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: font.display,
                  fontSize: 26,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  color: active ? color.text : color.textDim,
                  textDecoration: "none",
                  animation: `ts-fade-up 420ms ${ease.out} both`,
                  animationDelay: `${i * 50}ms`,
                }}
              >
                {active && <span style={{ color: color.orange, marginRight: 12 }}>▸</span>}
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (!isHome) window.scrollTo(0, 0);
  }, [location.pathname, isHome]);

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={isHome ? <HomeFallback /> : <PageFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/mission" element={<PageTransition><Mission /></PageTransition>} />
          <Route path="/telemetry" element={<PageTransition><Telemetry /></PageTransition>} />
          <Route path="/hardware" element={<PageTransition><Hardware /></PageTransition>} />
          <Route path="/software" element={<PageTransition><Software /></PageTransition>} />
          <Route path="/timeline" element={<PageTransition><Timeline /></PageTransition>} />
          <Route path="/team" element={<PageTransition><Team /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function HomeFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 min(7vw, 90px)",
      }}
    >
      <span style={{ fontFamily: font.mono, fontSize: 11, letterSpacing: "0.3em", color: color.textFaint }}>
        {PROJECT_LABEL}
      </span>
      <h1 style={{ maxWidth: 700, margin: "20px 0 0", fontFamily: font.display, fontSize: "clamp(38px, 6vw, 78px)", lineHeight: 1, letterSpacing: "-0.03em" }}>
        Active Fin<br /><span style={{ color: color.blueBright }}>Control System</span>
      </h1>
      <p style={{ maxWidth: 520, margin: "24px 0 0", color: color.textDim, fontSize: 16, lineHeight: 1.7 }}>
        {TAGLINE}
      </p>
      <span style={{ marginTop: 30, fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textGhost }}>
        LOADING 3D FLIGHT MODEL…
      </span>
    </div>
  );
}

function PageFallback() {
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", fontFamily: font.mono, fontSize: 10, letterSpacing: "0.24em", color: color.textGhost }}>
      LOADING PAGE…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ background: color.bg0, color: color.text, minHeight: "100vh", position: "relative" }}>
        <Atmosphere />
        <Nav />
        <div style={{ position: "relative", zIndex: 2 }}>
          <AppRoutes />
          <Footer />
        </div>
      </div>
      <Analytics />
    </BrowserRouter>
  );
}
