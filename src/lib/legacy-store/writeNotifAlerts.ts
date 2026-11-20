import { getLegacyStore } from "./getLegacyStore";
import type { NotifAlertRecord } from "./types";

export function writeNotifAlerts(next: NotifAlertRecord[]): void {
  getLegacyStore()?.setNotifAlerts?.(next);
}
