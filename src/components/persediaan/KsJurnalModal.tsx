"use client";

import { CheckCircle2, Download } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp } from "@/lib";
import type { KsJurnalModalProps } from "./types";

export function KsJurnalModal({
  open,
  onClose,
  metode,
  entries,
  selectedIdxs,
  setSelectedIdxs,
  onConfirm,
}: KsJurnalModalProps) {
  const toggle = (idx: number) => {
    setSelectedIdxs((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]
    );
  };

  return (
    <OasModalDialog
      id="ks-jurnal-popup"
      open={open}
      onClose={onClose}
      maxWidth="540px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Download size={15} /> Input Jurnal HPP ({metode.toUpperCase()})
        </span>
      }
      footer={
        <>
          <button className="btn btn-ghost btn-sm" type="button" onClick={onClose}>Batal</button>
          <button className="btn btn-primary btn-sm" type="button" disabled={!selectedIdxs.length} onClick={onConfirm}>
            <CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Input Jurnal Terpilih ({selectedIdxs.length})
          </button>
        </>
      }
    >
      {!entries.length ? (
        <div style={{ color: "var(--muted)", fontSize: "13px", textAlign: "center", padding: "20px" }}>
          Semua transaksi keluar sudah diinput ke jurnal.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "8px", maxHeight: "50vh", overflowY: "auto" }}>
          {entries.map(({ idx, entry }) => (
            <label
              key={idx}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIdxs.includes(idx)}
                onChange={() => toggle(idx)}
                style={{ width: "16px", height: "16px", accentColor: "var(--accent)", marginTop: "2px" }}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>
                  {entry.tgl} — {entry.ket || "keluar"}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  Qty Keluar: <b>{entry.kQty}</b> unit · HPP Total: <b>{fmtRp(entry.kJml)}</b>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </OasModalDialog>
  );
}
