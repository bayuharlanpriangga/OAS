import { AT_LAST_RUN_KEY } from "./constants";

export function getAtLastRun(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AT_LAST_RUN_KEY);
}
