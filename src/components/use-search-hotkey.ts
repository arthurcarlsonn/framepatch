"use client";

import { useEffect } from "react";

/**
 * ⌘K / Ctrl-K to open search.
 *
 * Lives apart from SearchDialog on purpose. The header needs the hotkey on every page, but
 * the dialog pulls the whole catalogue into whatever bundle imports it — so keeping the hook
 * here is what lets the header bind the shortcut without shipping 769 games with it.
 */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpen();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpen]);
}
