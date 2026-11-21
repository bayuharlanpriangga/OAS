import type { DashPeriodKey, DateRangeResult } from "./types";

export function getDashPeriodRange(
  period: DashPeriodKey,
  customFrom = "",
  customTo = ""
): DateRangeResult {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yr: number, mo: number) =>
    new Date(yr, mo + 1, 0).getDate();

  if (period === "this-month") {
    const mo = pad(m + 1);
    return {
      from: `${y}-${mo}-01`,
      to: `${y}-${mo}-${pad(lastDay(y, m))}`,
      label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    };
  }
  if (period === "last-month") {
    const d = new Date(y, m - 1, 1);
    const ly = d.getFullYear();
    const lm = d.getMonth();
    const mo = pad(lm + 1);
    return {
      from: `${ly}-${mo}-01`,
      to: `${ly}-${mo}-${pad(lastDay(ly, lm))}`,
      label: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    };
  }
  if (period === "this-quarter") {
    const q = Math.floor(m / 3);
    const sm = q * 3;
    const em = sm + 2;
    return {
      from: `${y}-${pad(sm + 1)}-01`,
      to: `${y}-${pad(em + 1)}-${pad(lastDay(y, em))}`,
      label: `Q${q + 1} ${y}`,
    };
  }
  if (period === "this-year") {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun ${y}` };
  }
  if (period === "custom") {
    return {
      from: customFrom || "2000-01-01",
      to: customTo || "2099-12-31",
      label:
        customFrom && customTo
          ? `${customFrom} s/d ${customTo}`
          : "Rentang Kustom",
    };
  }
  return { from: "", to: "", label: "Semua Periode" };
}
