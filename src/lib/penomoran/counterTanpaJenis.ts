import type { CounterRecord } from "@/types";

export function counterTanpaJenis(
  counterList: readonly CounterRecord[],
  jenis: string
): CounterRecord[] {
  const list = Array.isArray(counterList) ? counterList : [];
  const J = String(jenis || "").toUpperCase();
  if (!J) return list as CounterRecord[];
  const hasil = list.filter(
    (r) =>
      !(
        r &&
        typeof r.id === "string" &&
        r.id.toUpperCase().startsWith(J + "-")
      )
  );
  return hasil.length === list.length ? (list as CounterRecord[]) : hasil;
}
