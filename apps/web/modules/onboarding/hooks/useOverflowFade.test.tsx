import { act, cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOverflowFade } from "./useOverflowFade";

let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let resize: () => void;
const disconnect = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  frames = new Map();
  nextFrame = 0;
  disconnect.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function createContainer(height = 300) {
  const ref = { current: document.createElement("div") };
  Object.defineProperties(ref.current, {
    scrollHeight: { configurable: true, value: height },
    clientHeight: { value: 100 },
  });
  return ref;
}

function flushFrame() {
  act(() => {
    const pending = Array.from(frames.values());
    frames.clear();
    for (const callback of pending) callback(0);
  });
}

function settleLayout() {
  flushFrame();
  flushFrame();
}

describe("onboarding overflow fade", () => {
  it("shows only above the bottom of overflowing content", () => {
    const ref = createContainer();
    const { result } = renderHook(() => useOverflowFade(ref, undefined));
    settleLayout();
    expect(result.current).toBe(true);
    if (!ref.current) throw new Error("Missing test container");
    ref.current.scrollTop = 200;
    act(() => ref.current?.dispatchEvent(new Event("scroll")));
    settleLayout();
    expect(result.current).toBe(false);
  });

  it("does not show a fade when content fits", () => {
    const ref = createContainer(100);
    const { result } = renderHook(() => useOverflowFade(ref, undefined));
    settleLayout();
    expect(result.current).toBe(false);
  });

  it("coalesces resize, scroll, observer and delayed checks into one frame chain", () => {
    const ref = createContainer();
    renderHook(() => useOverflowFade(ref, undefined));
    act(() => {
      for (let i = 0; i < 10; i++) {
        window.dispatchEvent(new Event("resize"));
        ref.current?.dispatchEvent(new Event("scroll"));
        resize();
      }
      vi.advanceTimersByTime(100);
    });
    expect(frames.size).toBe(1);
    flushFrame();
    act(() => resize());
    expect(frames.size).toBe(1);
    flushFrame();
    expect(frames.size).toBe(0);
  });

  it.each([false, true])("cancels pending work on unmount (second frame: %s)", (secondFrame) => {
    const ref = createContainer();
    const { unmount } = renderHook(() => useOverflowFade(ref, undefined));
    if (secondFrame) flushFrame();
    const staleCallbacks = Array.from(frames.values());
    unmount();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledOnce();
    act(() => {
      for (const callback of staleCallbacks) callback(0);
      resize();
      window.dispatchEvent(new Event("resize"));
      ref.current?.dispatchEvent(new Event("scroll"));
      vi.advanceTimersByTime(200);
    });
    expect(frames.size).toBe(0);
  });

  it("remeasures asynchronously loaded content and cancels the previous effect", () => {
    const ref = createContainer(100);
    const { result, rerender } = renderHook(({ version }) => useOverflowFade(ref, version), {
      initialProps: { version: 0 },
    });
    settleLayout();
    expect(result.current).toBe(false);
    if (!ref.current) throw new Error("Missing test container");
    Object.defineProperty(ref.current, "scrollHeight", { value: 300 });
    rerender({ version: 1 });
    expect(disconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    settleLayout();
    expect(result.current).toBe(true);
  });

  it("keeps only the current effect's work under Strict Mode", () => {
    const ref = createContainer();
    const { result, unmount } = renderHook(() => useOverflowFade(ref, undefined), { wrapper: StrictMode });
    expect(disconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(1);
    settleLayout();
    expect(result.current).toBe(true);
    unmount();
    expect(frames.size).toBe(0);
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
