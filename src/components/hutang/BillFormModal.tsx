"use client";

import { FileText, Save, Upload, X } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp } from "@/lib";
import type { BillFormModalProps } from "./types";

export function BillFormModal({
  open,
  onClose,
  form,
  setForm,
  totals,
  supplierSuggestions,
  labelAkun,
  onPickItemAkun,
  onPickUtangAkun,
  onSave,
}: BillFormModalProps) {
  return (
    <OasModalDialog
      id="modal-bill"
      open={open}
      onClose={onClose}
      maxWidth="620px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <FileText size={15} /> {form.id ? "Edit Draft Tagihan" : "Buat Tagihan Pembelian"}
        </span>
      }
      footer={
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", justifyContent: "space-between" }}>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Batal</button>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button className="btn btn-ghost" type="button" onClick={() => onSave("draft")}>
              <Save size={14} style={{ verticalAlign: "-2px" }} /> Simpan Draft
            </button>
            <button className="btn btn-primary" type="button" onClick={() => onSave("diterima")}>
              <Upload size={14} style={{ verticalAlign: "-2px" }} /> Simpan &amp; Diterima
            </button>
          </div>
        </div>
      }
    >
      <div className="form-row">
        <div className="form-group">
          <label>No. Tagihan</label>
          <input type="text" placeholder="BILL-2026-001" value={form.noBill} onChange={(e) => setForm({ ...form, noBill: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Tanggal Tagihan</label>
          <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Supplier</label>
          <input type="text" list="bill-supplier-datalist" placeholder="PT. Sumber Makmur" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <datalist id="bill-supplier-datalist">
            {supplierSuggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="form-group">
          <label>Jatuh Tempo</label>
          <input type="date" value={form.jatuhTempo} onChange={(e) => setForm({ ...form, jatuhTempo: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label>Keterangan</label>
        <textarea rows={2} placeholder="Pembelian barang dagangan" value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
      </div>

      <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
        ITEM TAGIHAN <span style={{ fontWeight: 400 }}>· nama, jumlah, harga satuan, akun</span>
      </label>
      <div style={{ display: "grid", gap: "8px" }}>
        {form.items.map((it, idx) => (
          <div key={idx} style={{ background: "var(--surface2)", padding: "8px", borderRadius: "8px", display: "grid", gap: "6px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px 30px", gap: "6px", alignItems: "center" }}>
              <input type="text" placeholder="Nama item" value={it.nama} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], nama: e.target.value }; setForm({ ...form, items: n }); }} />
              <input type="number" min={1} value={it.qty} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], qty: Number(e.target.value) }; setForm({ ...form, items: n }); }} />
              <input type="number" min={0} value={it.harga} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], harga: Number(e.target.value) }; setForm({ ...form, items: n }); }} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--danger)" }} disabled={form.items.length <= 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}>
                <X size={14} />
              </button>
            </div>
            <button className="form-picker-btn" type="button" style={{ fontSize: "12px", padding: "6px 10px" }} onClick={() => onPickItemAkun(idx)}>
              Akun: {labelAkun(it.akun)}
            </button>
          </div>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        style={{ marginTop: "6px" }}
        onClick={() => setForm({ ...form, items: [...form.items, { nama: "", qty: 1, harga: 0, akun: form.items[0]?.akun || "1301" }] })}
      >
        + Tambah Item
      </button>

      <div style={{ background: "var(--surface2)", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ color: "var(--muted)", fontSize: "13px" }}>Subtotal</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(totals.subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <label style={{ color: "var(--muted)", fontSize: "13px" }}>
            PPN Masukan{" "}
            <input type="checkbox" checked={form.ppnAktif} onChange={(e) => setForm({ ...form, ppnAktif: e.target.checked })} style={{ accentColor: "var(--accent)", cursor: "pointer" }} />{" "}
            <select value={form.ppnTarif} onChange={(e) => setForm({ ...form, ppnTarif: Number(e.target.value) })} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text)", fontSize: "12px", padding: "2px 4px" }}>
              <option value={11}>11% (non-mewah)</option>
              <option value={12}>12% (mewah)</option>
            </select>
          </label>
          <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(totals.ppn)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
          <span style={{ fontWeight: 700 }}>Total</span>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)", fontSize: "16px" }}>{fmtRp(totals.total)}</span>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: "12px" }}>
        <label>Akun Utang Usaha</label>
        <button className="form-picker-btn" type="button" onClick={onPickUtangAkun}>
          {labelAkun(form.akunUtang)}
        </button>
      </div>
    </OasModalDialog>
  );
}
