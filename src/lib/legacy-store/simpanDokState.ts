import { getCloudSync } from "./getCloudSync";
import { readCounterList } from "./readCounterList";
import { readDokList } from "./readDokList";

export function simpanDokState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["dok", "counter"]);
  try {
    localStorage.setItem("oas_dok", JSON.stringify(readDokList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
