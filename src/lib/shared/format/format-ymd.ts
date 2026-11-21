import { pad2 } from "./pad-dua";

export function ymd(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}
