import { getCloudSync } from "./sinkron-cloud";
import { readBillList } from "./baca-bill";
import { readCounterList } from "./baca-counter";

export function simpanBillState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["bill", "counter"]);
  try {
    localStorage.setItem("oas_bill", JSON.stringify(readBillList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
