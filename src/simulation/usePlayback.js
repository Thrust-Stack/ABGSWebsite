import { useCallback, useEffect, useRef, useState } from "react";

const UI_REFRESH_MS = 100;

export function usePlayback(duration, reducedMotion = false) {
  const [playing, setPlayingState] = useState(!reducedMotion);
  const [speed, setSpeedState] = useState(1);
  const [displayTime, setDisplayTime] = useState(0);
  const timeRef = useRef(0);
  const playingRef = useRef(!reducedMotion);
  const speedRef = useRef(1);

  const setPlaying = useCallback((value) => {
    playingRef.current = typeof value === "function" ? value(playingRef.current) : value;
    setPlayingState(playingRef.current);
  }, []);

  const setSpeed = useCallback((value) => {
    const next = Number(value) || 1;
    speedRef.current = next;
    setSpeedState(next);
  }, []);

  const seek = useCallback(
    (value) => {
      const next = Math.min(duration, Math.max(0, Number(value) || 0));
      timeRef.current = next;
      setDisplayTime(next);
    },
    [duration]
  );

  const advance = useCallback(
    (delta) => {
      if (!playingRef.current || duration <= 0) return;
      const next = timeRef.current + delta * speedRef.current;
      timeRef.current = next >= duration ? next % duration : next;
    },
    [duration]
  );

  useEffect(() => {
    if (!playing) return undefined;
    const interval = window.setInterval(() => setDisplayTime(timeRef.current), UI_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [playing]);

  return {
    timeRef,
    playingRef,
    speedRef,
    displayTime,
    playing,
    speed,
    setPlaying,
    setSpeed,
    seek,
    advance,
  };
}
