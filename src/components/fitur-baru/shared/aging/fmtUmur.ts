export function fmtUmur(u: number): string {
  return u > 0 ? `+${u} hr` : u === 0 ? "Hari ini" : `${u} hr`;
}
