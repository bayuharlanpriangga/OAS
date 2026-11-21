import { getLegacyStore } from "./akses-store";
import type { NotifAlertRecord } from "./types";

export function readNotifAlerts(): NotifAlertRecord[] {
  return getLegacyStore()?.getNotifAlerts?.() ?? [];
}
