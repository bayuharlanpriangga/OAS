"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { konversiMetodeRows, KS_METODE_DIAKUI, type KsMetode } from "@/lib";
import type { KsKonversiModalProps } from "./types";

export function KsKonversiModal({
  open,
  onClose,
  katData,
  onExecute,
}: KsKonversiModalProps) {
  const [dari, setDari] = useState<KsMetode>("fifo");
  const [ke, setKe] = useState<KsMetode>("wa");
  const [mode, setMode] = useState<"gabung" | "timpa">("gabung");
  const [hapusSumber, setHapusSumber] = useState(false);

  const sumberRows = katData?.[dari] || [];
  const tujuanRows = katData?.[ke] || [];
  const masukCount = sumberRows.filter((e) => e.mQty > 0).length;
  const previewRows = konversiMetodeRows(sumberRows, tujuanRows, ke, mode);

  return (
    <OasModalDialog
      id="modal-konversi-ks"
      open={open}
      onClose={onClose}
      maxWidth="520px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <ArrowLeftRight size={15} /> Konversi Kartu Stock Antar Metode
        </span>
      }
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Batal</button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={dari === ke || masukCount === 0}
            onClick={() => onExecute(dari, ke, mode, hapusSumber)}
          >
            <ArrowLeftRight size={14} style={{ verticalAlign: "-2px" }} /> Konversi Sekarang
          </button>
        </>
      }
    >
      <div style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "var(--accent2)", marginBottom: "14px", lineHeight: 1.55 }}>
        Semua entri <b>MASUK</b> dari metode asal disalin ke metode tujuan, diurutkan menurut tanggal, lalu dihitung ulang sesuai metode tujuan.
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Dari Metode (Sumber)</label>
          <select value={dari} onChange={(e) => setDari(e.target.value as KsMetode)} style={{ width: "100%" }}>
            {(["fifo", "lifo", "wa", "mwa"] as KsMetode[]).map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()} ({(katData?.[m] || []).filter((r) => r.mQty > 0).length} masuk)
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Ke Metode (Tujuan)</label>
          <select value={ke} onChange={(e) => setKe(e.target.value as KsMetode)} style={{ width: "100%" }}>
            {KS_METODE_DIAKUI.map((m) => (
              <option key={m} value={m}>
                {m.toUpperCase()} ({(katData?.[m] || []).length} entri)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
        {(["gabung", "timpa"] as const).map((opt) => (
          <label
            key={opt}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 11px",
              borderRadius: "8px",
              border: mode === opt ? "2px solid var(--accent)" : "1px solid var(--border)",
              background: "var(--surface2)",
              cursor: "pointer",
              fontSize: "12.5px",
            }}
          >
            <input type="radio" checked={mode === opt} onChange={() => setMode(opt)} />
            <span>
              <b>{opt === "gabung" ? "Gabungkan dengan data tujuan" : "Timpa (replace) data tujuan"}</b>
            </span>
          </label>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 11px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface2)", cursor: "pointer", fontSize: "12.5px" }}>
          <input type="checkbox" checked={hapusSumber} onChange={(e) => setHapusSumber(e.target.checked)} />
          <span>Hapus data metode sumber ({dari.toUpperCase()}) setelah konversi</span>
        </label>
      </div>

      <div style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px", fontSize: "12px", color: "var(--muted)" }}>
        Preview hasil: <b>{previewRows.length}</b> entri di <b>{ke.toUpperCase()}</b> (dari {masukCount} entri masuk sumber).
      </div>
    </OasModalDialog>
  );
}
