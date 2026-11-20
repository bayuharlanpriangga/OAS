import { MODUL_HALAMAN } from "./constants";

export function modulUntukHalaman(id: string): string | null {
  return Object.prototype.hasOwnProperty.call(MODUL_HALAMAN, id)
    ? MODUL_HALAMAN[id]
    : null;
}
