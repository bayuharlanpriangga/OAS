import { getLegacyStore } from "./getLegacyStore";
import type { NotifAlertRecord } from "./types";

export function readNotifAlerts(): NotifAlertRecord[] {
  return getLegacyStore()?.getNotifAlerts?.() ?? [];
}
