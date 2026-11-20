"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Lock,
  Package,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Unlock,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  fmtRp,
  hitungSaldoCard,
  hitungSaldoKat,
  konversiMetodeRows,
  KS_METODE_DIAKUI,
  type KsCard,
  type KsEntry,
  type KsMetode,
} from "@/lib";

export interface KsEditModalState {
  open: boolean;
  mode: "add-card" | "edit-card" | "add-kat" | "edit-kat";
  cardId: string;
  katId: string;
  nama: string;
  satuan: string;
}

interface KsEditModalProps {
  state: KsEditModalState;
  setState: React.Dispatch<React.SetStateAction<KsEditModalState>>;
  onSave: () => void;
}

export function KsEditModal({ state, setState, onSave }: KsEditModalProps) {
  const title =
    state.mode === "add-card"
      ? "+ Tambah Kartu Stock Baru"
      : state.mode === "edit-card"
        ? "Edit Kartu Stock"
        : state.mode === "add-kat"
          ? "+ Tambah Kategori / Produk"
          : "Edit Kategori / Produk";
  const showSatuan = state.mode === "add-kat" || state.mode === "edit-kat";

  return (
    <OasModalDialog
      id="mks-modal"
      open={state.open}
      onClose={() => setState((s) => ({ ...s, open: false }))}
      maxWidth="420px"
      title={title}
      footer={
        <>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => setState((s) => ({ ...s, open: false }))}
          >
            Batal
          </button>
          <button className="btn btn-primary" type="button" onClick={onSave}>
            <Save size={14} style={{ verticalAlign: "-2px" }} /> Simpan
          </button>
        </>
      }
    >
      <div className="form-group">
        <label>
          Nama <span style={{ color: "var(--danger)" }}>*</span>
        </label>
        <input
          type="text"
          placeholder="contoh: Beras Premium, Minyak Goreng"
          value={state.nama}
          onChange={(e) => setState((s) => ({ ...s, nama: e.target.value }))}
        />
      </div>
      {showSatuan && (
        <div className="form-group">
          <label>Satuan</label>
          <input
            type="text"
            placeholder="unit, kg, liter, pcs..."
            value={state.satuan}
            onChange={(e) =>
              setState((s) => ({ ...s, satuan: e.target.value }))
            }
          />
        </div>
      )}
    </OasModalDialog>
  );
}

interface KsKelolaModalProps {
  open: boolean;
  onClose: () => void;
  cards: KsCard[];
  onAddCard: () => void;
  onEditCard: (card: KsCard) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleLock: (cardId: string) => void;
  onAddKat: (cardId: string) => void;
  onEditKat: (cardId: string, katId: string) => void;
  onDeleteKat: (cardId: string, katId: string) => void;
}

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

interface KsPilihModalProps {
  open: boolean;
  onClose: () => void;
  cards: KsCard[];
  tujuanMetode: KsMetode;
  selectedKatId: string;
  setSelectedKatId: (id: string) => void;
  onConfirm: () => void;
}

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
                      background: active ? "rgba(74,222,128,0.08)" : "var(--surface2)",
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

interface KsKonversiModalProps {
  open: boolean;
  onClose: () => void;
  katData: Record<KsMetode, KsEntry[]> | null;
  onExecute: (dari: KsMetode, ke: KsMetode, mode: "gabung" | "timpa", hapusSumber: boolean) => void;
}

export function KsKonversiModal({ open, onClose, katData, onExecute }: KsKonversiModalProps) {
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

interface KsJurnalModalProps {
  open: boolean;
  onClose: () => void;
  metode: KsMetode;
  entries: Array<{ idx: number; entry: KsEntry }>;
  selectedIdxs: number[];
  setSelectedIdxs: React.Dispatch<React.SetStateAction<number[]>>;
  onConfirm: () => void;
}

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
