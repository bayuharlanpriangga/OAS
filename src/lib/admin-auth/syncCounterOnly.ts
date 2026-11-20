import type { CounterRecord } from "@/types";
import { readCurrentCompany } from "../legacy-store/readCurrentCompany";
import { writeCounterList } from "../legacy-store/writeCounterList";

export function syncCounterOnly(next: CounterRecord[]): void {
  writeCounterList(next);
  if (typeof window === "undefined") return;
  const win = window as unknown as {
    cloudSyncRecords?: (kinds: string[]) => Promise<boolean>;
  };
  if (readCurrentCompany() && typeof win.cloudSyncRecords === "function") {
    void win.cloudSyncRecords(["counter"]);
  } else {
    try {
      localStorage.setItem("oas_counter", JSON.stringify(next));
    } catch {}
  }
}
