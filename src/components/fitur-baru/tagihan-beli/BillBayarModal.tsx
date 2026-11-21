"use client";

import { Banknote, CheckCircle2, Trash2 } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp, jurnalPembayaranBillStatus, sisaTagihan } from "@/lib";
import type { BillBayarModalProps } from "./types";

export function BillBayarModal({
  open,
  onClose,
  bill,
  form,
  setForm,
  pembayarans,
  history,
  jurnals,
  labelAkun,
  readOnly,
  onPickKas,
  onSaveBayar,
  onDeleteBayar,
}: BillBayarModalProps) {
  return (
    <OasModalDialog
      id="modal-bayar-bill"
      open={open && Boolean(bill)}
      onClose={onClose}
      maxWidth="460px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Banknote size={15} style={{ color: "var(--accent)" }} />{" "}
          {form.mode === "riwayat"
            ? `Riwayat Pembayaran ${bill?.noBill || ""}`
            : `Bayar Tagihan ${bill?.noBill || ""}`}
        </span>
      }
      footer={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {form.mode === "riwayat" ? "Tutup" : "Batal"}
          </button>
          {form.mode === "bayar" && (
            <button className="btn btn-primary" type="button" onClick={onSaveBayar}>
              <CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Simpan Pembayaran
            </button>
          )}
        </>
      }
    >
      {bill && (
        <>
          <div style={{ background: "var(--surface2)", borderRadius: "9px", padding: "10px 12px", marginBottom: "14px", fontSize: "12.5px" }}>
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>{bill.supplier} · {bill.noBill}</div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
              <span>Total: {fmtRp(bill.total)}</span>
              <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>
                Sisa: {fmtRp(sisaTagihan(bill, pembayarans, "bill"))}
              </span>
            </div>
          </div>
          {form.mode === "bayar" && (
            <div>
              <div className="form-group"><label>Tanggal Pembayaran</label><input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
              <div className="form-group"><label>Jumlah Dibayar (Rp) · boleh sebagian</label><input type="number" min={0} step="any" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: e.target.value })} /></div>
              <div className="form-group"><label>Akun Kas/Bank</label><button className="form-picker-btn" type="button" onClick={onPickKas}>{labelAkun(form.akunKas)}</button></div>
              <div className="form-group"><label>Metode (opsional)</label><input type="text" placeholder="Transfer, Tunai, ..." value={form.metode} onChange={(e) => setForm({ ...form, metode: e.target.value })} /></div>
              <div className="form-group"><label>Catatan (opsional)</label><input type="text" value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>
              <div style={{ padding: "10px", background: "rgba(251,191,36,0.08)", borderRadius: "8px", fontSize: "12px", color: "var(--accent3)", marginBottom: history.length ? "14px" : "0" }}>
                Jurnal otomatis: Utang Usaha di debit, Kas/Bank di kredit.
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase" }}>
                Riwayat Pembayaran ({history.length})
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                {history.map((p) => {
                  const jst = jurnalPembayaranBillStatus(p, bill, jurnals, pembayarans);
                  return (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "8px 10px", background: "var(--surface2)", borderRadius: "8px", fontSize: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.tanggal} · {fmtRp(p.jumlah)}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          Akun {p.akunKas}{p.metode ? ` · ${p.metode}` : ""}{jst.jurnal ? ` · ${jst.jurnal.no}` : ""}
                        </div>
                      </div>
                      {!readOnly && (
                        <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", color: "var(--danger)" }} title="Hapus pembayaran" onClick={() => onDeleteBayar(p.id)}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </OasModalDialog>
  );
}
