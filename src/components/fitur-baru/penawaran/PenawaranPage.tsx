"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Save, Trash2, X } from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  agingHariIni,
  aksiStatusPenawaran,
  berlakuDefaultPenawaran,
  fmtRp,
  hapusDokByIdState,
  hitungTotalDok,
  idDokBaru,
  nomorDokBerikutState,
  perbaruiDokState,
  pesananDariPenawaran,
  pesananDariRef,
  PPN_TARIF_STANDAR,
  readCounterList,
  readDokList,
  readKontakList,
  setOasWindowFn,
  susunDok,
  tambahDokState,
  transisiDok,
} from "@/lib";
import type { DokRecord } from "@/types";
import { STATUS_BADGE, type DokLegacyWin } from "../shared/penjualan/constants";

const getWin = () => window as unknown as DokLegacyWin;

export function PenawaranPage() {
  const [doks, setDoks] = useState<DokRecord[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    no: "",
    tanggal: "",
    kontak: "",
    berlakuSampai: "",
    items: [{ nama: "", qty: 1, satuan: "", harga: 0 }],
    ppnAktif: false,
    ppnTarif: PPN_TARIF_STANDAR,
    catatan: "",
  });

  const syncAll = useCallback(() => {
    setDoks(readDokList().slice());
    setReadOnly(Boolean(getWin().isReadOnly?.()));
  }, []);

  const openModalPenawaran = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("penawaran", "create")) return;
    const today = agingHariIni();
    setForm({
      no: nomorDokBerikutState("penawaran"),
      tanggal: today,
      kontak: "",
      berlakuSampai: berlakuDefaultPenawaran(today, 14),
      items: [{ nama: "", qty: 1, satuan: "", harga: 0 }],
      ppnAktif: false,
      ppnTarif: PPN_TARIF_STANDAR,
      catatan: "",
    });
    setModalOpen(true);
  }, []);

  const totals = useMemo(
    () =>
      hitungTotalDok({
        items: form.items.map((it) => ({
          nama: it.nama,
          qty: Number(it.qty) || 0,
          harga: Number(it.harga) || 0,
          satuan: it.satuan,
        })),
        ppnTarif: form.ppnAktif ? form.ppnTarif : 0,
      }),
    [form.items, form.ppnAktif, form.ppnTarif]
  );

  const handleSimpan = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("penawaran", "create")) return;
    const allDoks = readDokList();
    const res = susunDok(
      {
        id: idDokBaru(allDoks),
        jenis: "penawaran",
        no: form.no,
        tanggal: form.tanggal,
        kontak: form.kontak,
        berlakuSampai: form.berlakuSampai,
        items: form.items.map((it) => ({
          nama: it.nama,
          qty: Number(it.qty),
          satuan: it.satuan,
          harga: Number(it.harga),
        })),
        ppnTarif: form.ppnAktif ? form.ppnTarif : 0,
        catatan: form.catatan,
        createdAt: new Date().toISOString(),
      },
      allDoks
    );
    if (!res.ok) return void w.showAlert?.(res.pesan);
    void tambahDokState(res.dok);
    setModalOpen(false);
    syncAll();
    w.showAlert?.(`Penawaran ${res.dok.no} disimpan!`);
  }, [form, syncAll]);

  const handleUbahStatus = useCallback(
    (id: string, statusBaru: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("penawaran", "update")) return;
      const dok = readDokList().find((d) => d.id === id);
      if (!dok) return;
      const run = () => {
        const res = transisiDok(dok, statusBaru, {
          waktu: new Date().toISOString(),
        });
        if (!res.ok) return void w.showAlert?.(res.pesan);
        perbaruiDokState(res.dok);
        syncAll();
        w.showAlert?.(`Status ${dok.no} diubah menjadi ${statusBaru}.`);
      };
      if (statusBaru === "batal" || statusBaru === "ditolak") {
        if (w.showConfirm) w.showConfirm(`Ubah status ${dok.no} menjadi ${statusBaru}?`, run);
        else run();
      } else {
        run();
      }
    },
    [syncAll]
  );

  const handleBuatPesanan = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("penawaran", "create")) return;
      const allDoks = readDokList();
      const pen = allDoks.find((d) => d.id === id);
      const res = pesananDariPenawaran(pen, {
        daftar: allDoks,
        counterList: readCounterList(),
        tanggal: agingHariIni(),
      });
      if (!res.ok) return void w.showAlert?.(res.pesan);
      void tambahDokState(res.dok);
      syncAll();
      w.renderPesananList?.();
      w.showAlert?.(`Pesanan Penjualan ${res.dok.no} berhasil dibuat dari ${pen?.no}!`);
    },
    [syncAll]
  );

  const handleHapus = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("penawaran", "delete")) return;
      const dok = readDokList().find((d) => d.id === id);
      if (!dok) return;
      const run = () => {
        hapusDokByIdState(id);
        syncAll();
        w.showAlert?.(`Penawaran ${dok.no} dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(`Hapus penawaran ${dok.no}?`, run);
      else run();
    },
    [syncAll]
  );

  useEffect(() => {
    syncAll();
    setOasWindowFn("renderPenawaranList", syncAll as (...args: never[]) => unknown);
    setOasWindowFn("openModalPenawaran", openModalPenawaran as (...args: never[]) => unknown);
  }, [openModalPenawaran, syncAll]);

  const penawarans = useMemo(() => doks.filter((d) => d.jenis === "penawaran"), [doks]);
  const pelangganSuggestions = useMemo(
    () => readKontakList().filter((k) => k.tipe === "pelanggan" || k.tipe === "keduanya").map((k) => k.nama),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modalOpen]
  );

  return (
    <>
      <div className="page" id="page-penawaran" data-react-managed="1">
        <div className="section-header">
          <div>
            <div className="section-title">
              <FileText size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
              Penawaran
            </div>
            <div className="section-sub">Penawaran harga ke pelanggan · Dasar pesanan penjualan</div>
          </div>
        </div>

        <div className="table-card" style={{ marginBottom: "16px" }}>
          <div className="table-header">
            <div className="table-title">
              <FileText size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} />
              Daftar Penawaran
            </div>
            {!readOnly && (
              <button className="btn btn-primary" type="button" onClick={openModalPenawaran}>
                + Buat Penawaran
              </button>
            )}
          </div>
          <div id="penawaran-body">
            {!penawarans.length ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Belum ada penawaran.
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>No</th><th>Pelanggan</th><th>Tanggal</th><th>Berlaku</th><th>Total</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {penawarans.map((d) => {
                      const tot = hitungTotalDok(d).total;
                      const st = STATUS_BADGE[d.status] || STATUS_BADGE.draft;
                      const aksi = aksiStatusPenawaran(d.status);
                      const so = pesananDariRef(doks, "penawaran", d.id);
                      return (
                        <tr key={d.id}>
                          <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{d.no}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{d.kontak}</div>
                            {so && <div style={{ fontSize: "11px", color: "var(--accent2)" }}>SO: {so.no}</div>}
                          </td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap" }}>{d.tanggal}</td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap" }}>{d.berlakuSampai || "—"}</td>
                          <td style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "12px" }}>{fmtRp(tot)}</td>
                          <td><span style={{ background: st.bg, color: st.color, border: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px" }}>{st.label}</span></td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {!readOnly && d.status === "disetujui" && !so && (
                                <button className="btn btn-primary btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleBuatPesanan(d.id)}>
                                  Buat Pesanan
                                </button>
                              )}
                              {!readOnly && aksi.map((a) => (
                                <button
                                  key={a.ke}
                                  className={a.utama ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                                  type="button"
                                  style={{ padding: "4px 8px", fontSize: "11px", color: a.bahaya ? "var(--danger)" : undefined }}
                                  onClick={() => handleUbahStatus(d.id, a.ke)}
                                >
                                  {a.label}
                                </button>
                              ))}
                              {!readOnly && d.status === "draft" && (
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", color: "var(--danger)" }} title="Hapus" onClick={() => handleHapus(d.id)}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <OasModalDialog
        id="modal-penawaran"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="600px"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><FileText size={15} /> Buat Penawaran</span>}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setModalOpen(false)}>Batal</button>
            <button className="btn btn-primary" type="button" onClick={handleSimpan}>
              <Save size={14} style={{ verticalAlign: "-2px" }} /> Simpan Draft
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group"><label>No. Penawaran</label><input type="text" placeholder="QUO-2026-001" value={form.no} onChange={(e) => setForm({ ...form, no: e.target.value })} /></div>
          <div className="form-group"><label>Tanggal</label><input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Pelanggan</label>
            <input type="text" list="pnw-kontak-datalist" placeholder="PT. Maju Jaya" value={form.kontak} onChange={(e) => setForm({ ...form, kontak: e.target.value })} />
            <datalist id="pnw-kontak-datalist">{pelangganSuggestions.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div className="form-group"><label>Berlaku Sampai</label><input type="date" value={form.berlakuSampai} onChange={(e) => setForm({ ...form, berlakuSampai: e.target.value })} /></div>
        </div>

        <label style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600, display: "block", marginBottom: "6px" }}>
          ITEM PENAWARAN <span style={{ fontWeight: 400 }}>· nama, jumlah, satuan, harga satuan</span>
        </label>
        <div style={{ display: "grid", gap: "6px" }}>
          {form.items.map((it, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 64px 72px 110px 30px", gap: "6px", alignItems: "center" }}>
              <input type="text" placeholder="Nama item" value={it.nama} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], nama: e.target.value }; setForm({ ...form, items: n }); }} />
              <input type="number" min={1} value={it.qty} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], qty: Number(e.target.value) }; setForm({ ...form, items: n }); }} />
              <input type="text" placeholder="pcs" value={it.satuan} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], satuan: e.target.value }; setForm({ ...form, items: n }); }} />
              <input type="number" min={0} value={it.harga} onChange={(e) => { const n = form.items.slice(); n[idx] = { ...n[idx], harga: Number(e.target.value) }; setForm({ ...form, items: n }); }} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--danger)" }} disabled={form.items.length <= 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}><X size={14} /></button>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: "6px" }} onClick={() => setForm({ ...form, items: [...form.items, { nama: "", qty: 1, satuan: "", harga: 0 }] })}>+ Tambah Item</button>

        <div style={{ background: "var(--surface2)", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span style={{ color: "var(--muted)", fontSize: "13px" }}>Subtotal</span><span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(totals.subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ color: "var(--muted)", fontSize: "13px" }}>
              PPN <input type="checkbox" checked={form.ppnAktif} onChange={(e) => setForm({ ...form, ppnAktif: e.target.checked })} style={{ accentColor: "var(--accent)", cursor: "pointer" }} />{" "}
              <select value={form.ppnTarif} onChange={(e) => setForm({ ...form, ppnTarif: Number(e.target.value) })} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text)", fontSize: "12px", padding: "2px 4px" }}>
                <option value={11}>11% (non-mewah)</option><option value={12}>12% (mewah)</option>
              </select>
            </label>
            <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(totals.ppn)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--accent-text)", fontSize: "16px" }}>{fmtRp(totals.total)}</span>
          </div>
        </div>
        <div className="form-group" style={{ marginTop: "12px" }}>
          <label>Catatan</label>
          <textarea rows={2} placeholder="Syarat pembayaran, masa berlaku penawaran, dll." value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
        </div>
      </OasModalDialog>
    </>
  );
}
