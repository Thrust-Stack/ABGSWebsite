import { useEffect, useMemo, useState } from "react";

// WebGL capability probe — used to decide 3D vs static fallback.
export function useWebGLSupport() {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      return !!gl;
    } catch {
      return false;
    }
  }, []);
}

// Rough device performance tier for 3D complexity scaling.
//  2 = full quality, 1 = reduced, 0 = minimal
export function usePerfTier() {
  return useMemo(() => {
    if (typeof window === "undefined") return 1;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (mobile && (cores <= 4 || mem <= 4)) return 0;
    if (mobile || cores <= 4) return 1;
    return 2;
  }, []);
}

export function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e) => setReduce(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduce;
}

export function useIsTouch() {
  return useMemo(
    () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    []
  );
}
