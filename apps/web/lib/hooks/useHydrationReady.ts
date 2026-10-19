"use client";

import { useEffect, useState } from "react";

export function useHydrationReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
