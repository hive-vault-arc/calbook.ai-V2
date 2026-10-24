"use client";

import { useEffect } from "react";

export function getScrollFillProgress(top: number, viewportHeight: number): number {
  return Math.max(0, Math.min(1, (viewportHeight * 0.85 - top) / (viewportHeight * 0.55)));
}

export function LandingScrollMotion(): null {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-calbook-reveal]");
    const headings = document.querySelectorAll<HTMLElement>("[data-calbook-scroll-fill]");
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let lastFrame: number | null = null;
    const currentProgress = new Map<HTMLElement, number>();

    const updateFill = (timestamp: number, immediate: boolean = false): void => {
      frame = null;
      let unsettled = false;
      const elapsed = Math.min(64, timestamp - (lastFrame ?? timestamp - 16));
      const smoothing = 1 - Math.exp(-elapsed / 90);
      lastFrame = timestamp;
      headings.forEach((heading) => {
        let targetProgress = 1;
        if (!motionPreference.matches) {
          targetProgress = getScrollFillProgress(heading.getBoundingClientRect().top, window.innerHeight);
        }
        const previous = currentProgress.get(heading) ?? targetProgress;
        let progress = targetProgress;
        if (!motionPreference.matches && !immediate && Math.abs(targetProgress - previous) > 0.0001) {
          progress = previous + (targetProgress - previous) * smoothing;
        }
        if (progress !== targetProgress) unsettled = true;
        currentProgress.set(heading, progress);
        heading.style.setProperty("--scroll-progress", String(progress));
      });
      if (unsettled) {
        frame = window.requestAnimationFrame(updateFill);
      } else {
        lastFrame = null;
      }
    };
    const scheduleFill = (): void => {
      if (frame === null) frame = window.requestAnimationFrame(updateFill);
    };

    if (headings.length > 0) {
      updateFill(window.performance.now(), true);
      window.addEventListener("scroll", scheduleFill, { passive: true });
      window.addEventListener("resize", scheduleFill);
      motionPreference.addEventListener("change", scheduleFill);
    }

    const cleanupFill = (): void => {
      window.removeEventListener("scroll", scheduleFill);
      window.removeEventListener("resize", scheduleFill);
      motionPreference.removeEventListener("change", scheduleFill);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };

    if (motionPreference.matches) {
      elements.forEach((element) => {
        element.dataset.visible = "true";
      });
      return cleanupFill;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) return;

          entry.target.dataset.visible = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      cleanupFill();
    };
  }, []);

  return null;
}
