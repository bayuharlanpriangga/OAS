"use client";

import type { ReactNode } from "react";

export interface CalcResultRowProps {
  label: string;
  value: ReactNode;
  sub?: string;
}

export function CalcResultRow({ label, value, sub }: CalcResultRowProps) {
  return (
    <div className="res-row">
      <span className="res-label">{label}</span>
      <div style={{ textAlign: "right" }}>
        <div className="res-value">{value}</div>
        {sub ? (
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>{sub}</div>
        ) : null}
      </div>
    </div>
  );
}
