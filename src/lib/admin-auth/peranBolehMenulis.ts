import { PERAN_BOLEH_TULIS } from "./constants";

export function peranBolehMenulis(role?: string | null): boolean {
  return !!role && (PERAN_BOLEH_TULIS as readonly string[]).includes(role);
}
