import { AT_AUTO_KEY } from "./constants";

export function getAtAutoEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(AT_AUTO_KEY) !== "off";
}
