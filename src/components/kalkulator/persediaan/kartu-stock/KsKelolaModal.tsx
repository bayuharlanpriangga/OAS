"use client";

import { Lock, Pencil, Plus, Settings, Trash2, Unlock } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp, hitungSaldoCard, hitungSaldoKat } from "@/lib";
import type { KsKelolaModalProps } from "./types";

export function KsKelolaModal({
  open,
  onClose,
  cards,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onToggleLock,
  onAddKat,
  onEditKat,
  onDeleteKat,
}: KsKelolaModalProps) {
  return (
    <OasModalDialog
      id="mks-kelola-modal"
      open={open}
      onClose={onClose}
      maxWidth="520px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Settings size={15} /> Kelola Kartu Stock &amp; Kategori
        </span>
      }
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Tutup
          </button>
          <button className="btn btn-primary" type="button" onClick={onAddCard}>
            <Plus size={14} /> Tambah Kartu Stock
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "10px", maxHeight: "62vh", overflowY: "auto" }}>
        {cards.map((card) => {
          const saldo = hitungSaldoCard(card);
          const kats = Object.values(card.kategori || {});
          return (
            <div
              key={card.id}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>
                    {card.nama}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {kats.length} kategori · Stok {saldo.totalQty.toLocaleString("id-ID")} · {fmtRp(saldo.totalNilai)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    style={{ padding: "4px 6px" }}
                    title={card.lockedFromTrx ? "Buka kunci transaksi" : "Kunci dari transaksi"}
                    onClick={() => onToggleLock(card.id)}
                  >
                    {card.lockedFromTrx ? <Lock size={13} /> : <Unlock size={13} />}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    style={{ padding: "4px 6px" }}
                    title="Tambah kategori"
                    onClick={() => onAddKat(card.id)}
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    style={{ padding: "4px 6px" }}
                    title="Edit kartu"
                    onClick={() => onEditCard(card)}
                  >
                    <Pencil size={13} />
                  </button>
                  {cards.length > 1 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      style={{ padding: "4px 6px", color: "var(--danger)" }}
                      title="Hapus kartu"
                      onClick={() => onDeleteCard(card.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gap: "4px" }}>
                {kats.map((kat) => {
                  const ks = hitungSaldoKat(kat);
                  return (
                    <div
                      key={kat.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "5px 8px",
                        background: "var(--surface)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      <span>
                        {kat.nama}{" "}
                        <span style={{ color: "var(--muted)", fontSize: "11px" }}>
                          ({ks.totalQty} {kat.satuan || "unit"})
                        </span>
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          style={{ padding: "2px 5px" }}
                          onClick={() => onEditKat(card.id, kat.id)}
                        >
                          <Pencil size={11} />
                        </button>
                        {kats.length > 1 && (
                          <button
                            className="btn btn-ghost btn-sm"
                            type="button"
                            style={{ padding: "2px 5px", color: "var(--danger)" }}
                            onClick={() => onDeleteKat(card.id, kat.id)}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </OasModalDialog>
  );
}
