import { useEffect, useRef, useState } from "react";

function scheduleWhenIdle(callback) {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(callback, { timeout: 700 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 80);
  return () => window.clearTimeout(id);
}

export default function DeferredRender({
  children,
  fallback,
  minHeight = 300,
  rootMargin = "240px 0px",
}) {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || ready) return undefined;
    let cancelIdle;
    const reveal = () => {
      cancelIdle = scheduleWhenIdle(() => setReady(true));
    };

    if (!("IntersectionObserver" in window)) {
      reveal();
      return () => cancelIdle?.();
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        reveal();
      },
      { rootMargin }
    );
    observer.observe(host);
    return () => {
      observer.disconnect();
      cancelIdle?.();
    };
  }, [ready, rootMargin]);

  return (
    <div ref={hostRef} style={{ minHeight }}>
      {ready ? children : fallback}
    </div>
  );
}
