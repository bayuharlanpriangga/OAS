import type { ReportPeriodVal } from "./types";

export const REPORT_PERIOD_OPTIONS: ReadonlyArray<{
  value: ReportPeriodVal;
  label: string;
}> = [
  { value: "all", label: "Semua Periode" },
  { value: "this-month", label: "Bulan Ini" },
  { value: "last-month", label: "Bulan Lalu" },
  { value: "this-quarter", label: "Kuartal Ini" },
  { value: "this-year", label: "Tahun Ini" },
];
