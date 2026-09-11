import { useCallback, useEffect, useState } from "react";
import {
  PREFS_EVENT,
  getHiddenNav,
  isFloatingAssistantOn,
  setFloatingAssistant,
  toggleNavItem,
} from "@/lib/prefs";

/** Keeps sidebar visibility + floating-assistant prefs in sync across tabs. */
export function usePrefs() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [floating, setFloating] = useState(false);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setHidden(getHiddenNav());
    setFloating(isFloatingAssistantOn());
  }, []);

  useEffect(() => {
    sync();
    setReady(true);
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  return {
    ready,
    hiddenNav: hidden,
    floatingAssistant: floating,
    setNavVisible: (path: string, visible: boolean) => toggleNavItem(path, visible),
    setFloatingAssistant: (on: boolean) => setFloatingAssistant(on),
  };
}
