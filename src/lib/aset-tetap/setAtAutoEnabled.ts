import { AT_AUTO_KEY } from "./constants";

export function setAtAutoEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_AUTO_KEY, on ? "on" : "off");
}
