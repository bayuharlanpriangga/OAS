"use client";

import { Save } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import type { KsEditModalProps } from "./types";

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
