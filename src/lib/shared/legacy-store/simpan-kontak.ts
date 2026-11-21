import { getCloudSync } from "./sinkron-cloud";
import { readKontakList } from "./baca-kontak";

export function simpanKontakState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["kontak"]);
  try {
    localStorage.setItem("oas_kontak", JSON.stringify(readKontakList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
