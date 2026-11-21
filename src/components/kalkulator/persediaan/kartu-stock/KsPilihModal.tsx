"use client";

import { CheckCircle2, Package } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { hitungSaldoKat } from "@/lib";
import type { KsPilihModalProps } from "./types";

export function KsPilihModal({
  open,
  onClose,
  cards,
  tujuanMetode,
  selectedKatId,
  setSelectedKatId,
  onConfirm,
}: KsPilihModalProps) {
  return (
    <OasModalDialog
      id="mks-pilih-modal"
      open={open}
      onClose={onClose}
      maxWidth="460px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Package size={15} /> Pilih Kartu Stock Tujuan ({tujuanMetode.toUpperCase()})
        </span>
      }
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" type="button" onClick={onConfirm}>
            <CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Masukkan ke Kartu Ini
          </button>
        </>
      }
    >
      <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>
        Data persediaan ini akan ditambahkan ke kartu stock dan kategori mana?
      </div>
      <div style={{ display: "grid", gap: "8px", maxHeight: "50vh", overflowY: "auto" }}>
        {cards.map((card) => (
          <div key={card.id}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
              {card.nama}
            </div>
            <div style={{ display: "grid", gap: "4px" }}>
              {Object.values(card.kategori || {}).map((kat) => {
                const active = selectedKatId === kat.id;
                const s = hitungSaldoKat(kat);
                return (
                  <button
                    key={kat.id}
                    type="button"
                    onClick={() => setSelectedKatId(kat.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: active ? "var(--accent-tint)" : "var(--surface2)",
                      color: "var(--text)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: "12.5px",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{kat.nama}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      {s.totalQty} {kat.satuan || "unit"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </OasModalDialog>
  );
}
