"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "motion/react";
import { Download, Lightbulb } from "lucide-react";

export function fmtRp(n: number): string {
  return "Rp " + (Math.round(n) || 0).toLocaleString("id-ID");
}

export function fmtPct(n: number): string {
  return (n || 0).toFixed(2) + "%";
}

interface CalcNumberInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: CSSProperties;
  showCurrencyHint?: boolean;
}

export function CalcNumberInput({
  id,
  value,
  onChange,
  placeholder,
  disabled = false,
  style,
  showCurrencyHint = true,
}: CalcNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const numericVal = parseFloat(value);
  const showHint =
    showCurrencyHint && !focused && !Number.isNaN(numericVal) && numericVal >= 1000;

  return (
    <>
      <input
        type="number"
        id={id}
        data-formatted="1"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        style={style}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {showHint && (
        <div
          className="num-display"
          style={{
            fontSize: "10px",
            color: "var(--accent2)",
            fontFamily: "var(--mono)",
            marginTop: "2px",
          }}
        >
          = Rp {numericVal.toLocaleString("id-ID")}
        </div>
      )}
    </>
  );
}

interface CalcResultRowProps {
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

interface RasioBenchmark {
  ok?: number;
  warn?: number;
}

interface RasioTableRowProps {
  nama: string;
  nilai: string;
  satuan?: string;
  benchmark?: RasioBenchmark | null;
  keterangan?: string;
  rawText?: string;
}

export function RasioTableRow({
  nama,
  nilai,
  satuan = "",
  benchmark,
  keterangan = "",
  rawText,
}: RasioTableRowProps) {
  if (rawText !== undefined) {
    return (
      <tr className="rasio-row">
        <td>{nama}</td>
        <td>{rawText}</td>
        <td>{keterangan}</td>
      </tr>
    );
  }

  const parsed = parseFloat(nilai);
  let cls = "";
  if (benchmark) {
    if (benchmark.ok !== undefined && parsed >= benchmark.ok) cls = "rasio-ok";
    else if (benchmark.warn !== undefined && parsed >= benchmark.warn)
      cls = "rasio-warn";
    else if (!Number.isNaN(parsed)) cls = "rasio-bad";
  }
  const formatted =
    Number.isNaN(parsed) || !Number.isFinite(parsed)
      ? "—"
      : `${nilai} ${satuan}`.trimEnd();

  return (
    <tr className="rasio-row">
      <td>{nama}</td>
      <td className={cls}>{formatted}</td>
      <td>{keterangan}</td>
    </tr>
  );
}

interface KalkActionBarProps {
  id: string;
  label: string;
  onAction: () => void;
}

export function KalkActionBar({ id, label, onAction }: KalkActionBarProps) {
  return (
    <div
      id={id}
      className="kalk-input-bar"
      style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "var(--muted)",
          flexBasis: "100%",
          marginBottom: "4px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <Lightbulb size={13} strokeWidth={2} style={{ color: "var(--accent3)" }} />
        Hasil kalkulator bisa langsung diinput ke sistem:
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onAction}
        style={{
          background: "rgba(74,222,128,0.1)",
          border: "1px solid rgba(74,222,128,0.25)",
          borderRadius: "7px",
          padding: "8px 14px",
          cursor: "pointer",
          color: "var(--accent)",
          fontSize: "13px",
          fontFamily: "var(--sans)",
          fontWeight: 600,
          transition: "all 0.15s",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <Download size={14} strokeWidth={2} />
        {label}
      </motion.button>
    </div>
  );
}
