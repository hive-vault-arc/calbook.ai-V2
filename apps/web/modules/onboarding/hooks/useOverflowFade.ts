import type { RefObject } from "react";
import { useEffect, useState } from "react";

export function useOverflowFade(
  containerRef: RefObject<HTMLElement | null>,
  contentVersion: unknown
): boolean {
  const [showFade, setShowFade] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let frame: number | null = null;
    let disposed = false;
    const measure = () => {
      frame = null;
      if (disposed) return;
      const hasOverflow = element.scrollHeight > element.clientHeight;
      const atBottom = Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) < 1;
      setShowFade(hasOverflow && !atBottom);
    };
    const schedule = () => {
      if (disposed || frame !== null) return;
      // Container-query layouts can settle a frame after provider content changes.
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        frame = requestAnimationFrame(measure);
      });
    };

    schedule();
    const timeout = window.setTimeout(schedule, 100);
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    element.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer.disconnect();
      element.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [containerRef, contentVersion]);

  return showFade;
}
