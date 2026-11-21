import { AT_LAST_RUN_KEY } from "./constants";

export function setAtLastRun(iso: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_LAST_RUN_KEY, iso);
}
