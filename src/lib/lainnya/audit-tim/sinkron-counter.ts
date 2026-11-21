import type { CounterRecord } from "@/types";
import { readCurrentCompany } from "../../shared/legacy-store/baca-perusahaan";
import { writeCounterList } from "../../shared/legacy-store/tulis-counter";

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
