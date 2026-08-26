"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

import type { PlatformId } from "@/lib/types";

const STORAGE_KEY = "framepatch.platform";
const CHANGE_EVENT = "framepatch:platform-change";

function isPlatform(value: unknown): value is PlatformId {
  return value === "ps5" || value === "xsx" || value === "switch";
}

/**
 * The selection lives in localStorage rather than React state so it survives reloads.
 * Reading it through useSyncExternalStore keeps SSR ("ps5") and the client in step
 * without a mount effect.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): PlatformId {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isPlatform(stored) ? stored : "ps5";
}

function getServerSnapshot(): PlatformId {
  return "ps5";
}

type Ctx = {
  platform: PlatformId;
  setPlatform: (p: PlatformId) => void;
};

const PlatformContext = createContext<Ctx | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platform = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setPlatform = useCallback((next: PlatformId) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <PlatformContext.Provider value={{ platform, setPlatform }}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
