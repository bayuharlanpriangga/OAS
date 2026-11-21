import { AKUN_TRASH_RETENTION_DAYS } from "./constants";

export function akunTrashSisaHari(deletedAt: string, nowMs = Date.now()): number {
  const elapsedMs = nowMs - new Date(deletedAt).getTime();
  const sisaMs = AKUN_TRASH_RETENTION_DAYS * 86400000 - elapsedMs;
  return Math.max(0, Math.ceil(sisaMs / 86400000));
}
