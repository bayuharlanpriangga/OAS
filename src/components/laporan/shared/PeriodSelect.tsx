"use client";

import { REPORT_PERIOD_OPTIONS, type ReportPeriodVal } from "@/lib/laporan";

export interface PeriodSelectProps {
  id?: string;
  value: ReportPeriodVal;
  onChange: (val: ReportPeriodVal) => void;
}

export function PeriodSelect({ id, value, onChange }: PeriodSelectProps) {
  return (
    <div className="filter-bar report-period-filter" style={{ marginBottom: "16px" }}>
      <select
        id={id}
        className="report-period-sel"
        value={value}
        onChange={(e) => onChange(e.target.value as ReportPeriodVal)}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "7px 12px",
          color: "var(--text)",
          fontSize: "13px",
          fontFamily: "var(--sans)",
        }}
      >
        {REPORT_PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
