"use client";

import { motion } from "motion/react";
import { Download, Lightbulb } from "lucide-react";

export interface KalkActionBarProps {
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
          background: "var(--surface2)",
          border: "1px solid var(--border-strong)",
          borderRadius: "7px",
          padding: "8px 14px",
          cursor: "pointer",
          color: "var(--accent-text)",
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
