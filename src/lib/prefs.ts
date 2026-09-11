// Browser-only user preferences: which sidebar features are visible and
// whether the floating career assistant bubble is enabled.
const NAV_KEY = "ats-engine-hidden-nav";
const FLOAT_KEY = "ats-engine-floating-assistant";
export const PREFS_EVENT = "ats-prefs-change";

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PREFS_EVENT));
  }
}

export function getHiddenNav(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NAV_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function setHiddenNav(paths: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAV_KEY, JSON.stringify(paths));
  emit();
}

export function toggleNavItem(path: string, visible: boolean) {
  const hidden = new Set(getHiddenNav());
  if (visible) hidden.delete(path);
  else hidden.add(path);
  setHiddenNav([...hidden]);
}

export function isFloatingAssistantOn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(FLOAT_KEY) === "1";
}

export function setFloatingAssistant(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(FLOAT_KEY, "1");
  else window.localStorage.removeItem(FLOAT_KEY);
  emit();
}
