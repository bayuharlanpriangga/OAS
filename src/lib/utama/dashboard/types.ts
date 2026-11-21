export type DashPeriodKey =
  | "all"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "custom";

export interface DateRangeResult {
  from: string;
  to: string;
  label: string;
}
