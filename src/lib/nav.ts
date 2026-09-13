import type { Route } from "next";

const STORAGE_KEY = "intripid.nav.v1";
const MAX_STACK = 24;

function isPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/");
}

export function readNavStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isPath) : [];
  } catch {
    return [];
  }
}

export function syncNavStack(pathname: string): string[] {
  if (!isPath(pathname)) return readNavStack();
  const stack = readNavStack();
  const last = stack[stack.length - 1];
  const previous = stack[stack.length - 2];
  let next = stack;
  if (last === pathname) next = stack;
  else if (previous === pathname) next = stack.slice(0, -1);
  else next = [...stack, pathname];
  if (next.length > MAX_STACK) next = next.slice(-MAX_STACK);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

/** The in-app screen behind the current one, if we have one. */
export function previousPath(current: string): string | null {
  const stack = readNavStack();
  const last = stack[stack.length - 1];
  const previous = stack[stack.length - 2];
  if (last === current) return previous ?? null;
  if (previous === current) return stack[stack.length - 3] ?? null;
  if (last && last !== current) return last;
  return null;
}

export function backScreen(href: string): string {
  if (href === "/") return "Home";
  if (href.startsWith("/dashboard")) return "Dashboard";
  if (href.startsWith("/discover")) return "Discovery";
  if (href.startsWith("/trip/")) return "Trip";
  return "Back";
}

export function backLabel(href: string): string {
  const screen = backScreen(href);
  return screen === "Back" ? "Back" : `Back to ${screen.toLowerCase()}`;
}

const TRIP_PATH = /^\/trip\/[\w-]+$/;

export function isTripPath(href: string): boolean {
  return TRIP_PATH.test(href);
}

/** Profile settings opened from a trip should be able to return to it. */
export function accountSettingsHref(returnTo?: string | null): Route {
  const params = new URLSearchParams({ settings: "account" });
  if (returnTo && isTripPath(returnTo)) params.set("from", returnTo);
  return `/dashboard?${params.toString()}` as Route;
}

const RETURN_KEY = "intripid.accountSettings.returnTo";

export function readAccountSettingsReturn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const href = sessionStorage.getItem(RETURN_KEY);
    return href && isTripPath(href) ? href : null;
  } catch {
    return null;
  }
}

export function writeAccountSettingsReturn(href: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (href && isTripPath(href)) sessionStorage.setItem(RETURN_KEY, href);
    else sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
