import { getWin } from "./getWin";

export function setOasWindowFn(
  name: string,
  fn: (...args: never[]) => unknown
): void {
  const win = getWin();
  if (!win) return;
  win[name] = fn;
}
