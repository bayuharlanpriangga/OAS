"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, BookOpen, FileText, History, Pencil, Trash2 } from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import {
  agingHariIni,
  berlakuDefaultPenawaran,
  bisaEditBill,
  buatJurnalBill,
  buatJurnalPembayaranBill,
  buatJurnalPembalik,
  cariAkunPpnMasukan,
  catatPembayaranState,
  fmtRp,
  formDariBill,
  hapusBillByIdState,
  hitungTotalBill,
  jurnalBillStatus,
  nomorBillBerikutState,
  pembayaranDokumen,
  perbaruiBillState,
  PPN_TARIF_STANDAR,
  readAkuns,
  readBillList,
  readJurnalEntries,
  readKontakList,
  readPembayaranList,
  setOasWindowFn,
  sisaTagihan,
  susunBill,
  susunHapusPembayaran,
  susunPembayaran,
  tambahBillState,
  tanggalPembalikBill,
  terapkanHapusPembayaranState,
} from "@/lib";
import type { Akun, Bill, Pembayaran } from "@/types";
import {
  BillBayarModal,
  BillFormModal,
  type BillBayarFormState,
  type BillFormState,
} from "./BillModals";

interface BillLegacyWin {
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, aksi?: string) => boolean;
  isReadOnly?: () => boolean;
  addJurnal?: (entry: Record<string, unknown>) => { no?: string } | null;
  saveToStorage?: (showToast?: boolean) => void;
  renderDashboard?: () => void;
  renderJurnalUmum?: () => void;
  renderAgingHutang?: () => void;
  renderKartuHutang?: () => void;
}

const getWin = () => window as unknown as BillLegacyWin;

type PickerTarget =
  | { kind: "utang" }
  | { kind: "bayar-kas" }
  | { kind: "item"; idx: number }
  | null;

const cariAkunDefault = (
  akuns: readonly Akun[],
  prefer: string,
  fn: (a: Akun) => boolean
) => akuns.find((a) => a.kode === prefer)?.kode || akuns.find(fn)?.kode || prefer;

export default function BillPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [pembayarans, setPembayarans] = useState<Pembayaran[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [tick, setTick] = useState(0);

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billForm, setBillForm] = useState<BillFormState>({
    id: "",
    createdAt: "",
    noBill: "",
    supplier: "",
    tanggal: agingHariIni(),
    jatuhTempo: berlakuDefaultPenawaran(agingHariIni(), 30),
    deskripsi: "",
    items: [{ nama: "", qty: 1, harga: 0, akun: "1301" }],
    ppnAktif: false,
    ppnTarif: PPN_TARIF_STANDAR,
    akunUtang: "2101",
  });

  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [bayarForm, setBayarForm] = useState<BillBayarFormState>({
    billId: "",
    mode: "bayar",
    tanggal: agingHariIni(),
    jumlah: "",
    akunKas: "1101",
    metode: "",
    catatan: "",
  });

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const syncAll = useCallback(() => {
    setBills(readBillList().slice());
    setPembayarans(readPembayaranList().slice());
    setAkuns(readAkuns().slice());
    setTick((t) => t + 1);
  }, []);

  const notifyRelated = useCallback(() => {
    syncAll();
    const w = getWin();
    w.renderDashboard?.();
    w.renderJurnalUmum?.();
    w.renderAgingHutang?.();
    w.renderKartuHutang?.();
  }, [syncAll]);

  const openModalBill = useCallback((editId?: string) => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("bill", editId ? "update" : "create")) return;
    const curAkuns = readAkuns();
    setAkuns(curAkuns.slice());
    const today = agingHariIni();
    if (editId) {
      const b = readBillList().find((x) => x.id === editId);
      if (!b) return;
      if (!bisaEditBill(b)) {
        return void w.showAlert?.("⚠️ Hanya tagihan berstatus Draft yang bisa diedit.");
      }
      const f = formDariBill(b);
      setBillForm({
        id: f.id || "",
        createdAt: f.createdAt || "",
        noBill: f.noBill || "",
        supplier: f.supplier || "",
        tanggal: f.tanggal || today,
        jatuhTempo: f.jatuhTempo || "",
        deskripsi: f.deskripsi || "",
        items: f.items?.length
          ? f.items.map((it) => ({
              nama: it.nama || "",
              qty: it.qty || 1,
              harga: it.harga || 0,
              akun: it.akun || "1301",
            }))
          : [{ nama: "", qty: 1, harga: 0, akun: "1301" }],
        ppnAktif: f.ppnAktif,
        ppnTarif: f.ppnTarif,
        akunUtang: f.akunUtang || cariAkunDefault(curAkuns, "2101", (a) => a.tipe === "Liabilitas"),
      });
    } else {
      const defItemAkun = cariAkunDefault(
        curAkuns,
        "1301",
        (a) => a.tipe === "HPP" || a.tipe === "Beban" || a.kode.startsWith("13")
      );
      setBillForm({
        id: "",
        createdAt: "",
        noBill: nomorBillBerikutState(),
        supplier: "",
        tanggal: today,
        jatuhTempo: berlakuDefaultPenawaran(today, 30),
        deskripsi: "",
        items: [{ nama: "", qty: 1, harga: 0, akun: defItemAkun }],
        ppnAktif: false,
        ppnTarif: PPN_TARIF_STANDAR,
        akunUtang: cariAkunDefault(curAkuns, "2101", (a) => a.tipe === "Liabilitas"),
      });
    }
    setBillModalOpen(true);
  }, []);

  const billTotals = useMemo(
    () => hitungTotalBill(billForm.items, billForm.ppnAktif, billForm.ppnTarif),
    [billForm.items, billForm.ppnAktif, billForm.ppnTarif]
  );

  const postJurnalUntukBill = useCallback((bill: Bill): boolean => {
    const w = getWin();
    const res = buatJurnalBill(bill, {
      akunPpnMasukan: cariAkunPpnMasukan(readAkuns()),
    });
    if (!res.ok) {
      w.showAlert?.("⚠️ " + res.pesan);
      return false;
    }
    if (!w.addJurnal) return false;
    const j = w.addJurnal({
      tanggal: res.jurnal.tanggal,
      jenis: res.jurnal.jenis,
      ket: res.jurnal.keterangan,
      ref: res.jurnal.ref,
      lines: res.jurnal.lines,
      ...(res.jurnal._ppnTarif ? { _ppnTarif: res.jurnal._ppnTarif } : {}),
    });
    if (!j) return false;
    if (j.no) bill.jurnalNo = j.no;
    w.saveToStorage?.(false);
    return true;
  }, []);

  const handleSimpanBill = useCallback(
    (status: "draft" | "diterima") => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("bill", billForm.id ? "update" : "create")) return;
      const existingNomor = readBillList()
        .filter((b) => b.id !== billForm.id)
        .map((b) => b.noBill);
      const res = susunBill(
        {
          id: billForm.id || undefined,
          createdAt: billForm.createdAt || undefined,
          noBill: billForm.noBill,
          supplier: billForm.supplier,
          tanggal: billForm.tanggal,
          jatuhTempo: billForm.jatuhTempo,
          deskripsi: billForm.deskripsi,
          items: billForm.items.map((it) => ({
            nama: it.nama,
            qty: Number(it.qty),
            harga: Number(it.harga),
            akun: it.akun,
          })),
          ppnAktif: billForm.ppnAktif,
          ppnTarif: billForm.ppnTarif,
          akunUtang: billForm.akunUtang,
          status,
        },
        existingNomor
      );
      if (!res.ok) return void w.showAlert?.("⚠️ " + res.pesan);
      const bill = res.bill;
      if (status === "diterima" && !postJurnalUntukBill(bill)) return;
      if (billForm.id) perbaruiBillState(bill);
      else void tambahBillState(bill);
      setBillModalOpen(false);
      notifyRelated();
      w.showAlert?.(
        status === "diterima"
          ? `Tagihan ${bill.noBill} disimpan & dijurnal!`
          : `Draft tagihan ${bill.noBill} disimpan!`
      );
    },
    [billForm, notifyRelated, postJurnalUntukBill]
  );

  const handleBuatJurnalBill = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("bill", "update")) return;
      const b = readBillList().find((x) => x.id === id);
      if (!b) return;
      const updated = { ...b };
      if (!postJurnalUntukBill(updated)) return;
      perbaruiBillState(updated);
      notifyRelated();
      w.showAlert?.(`Jurnal untuk tagihan ${updated.noBill} berhasil dibuat!`);
    },
    [notifyRelated, postJurnalUntukBill]
  );

  const handleHapusBill = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("bill", "delete")) return;
      const allBills = readBillList();
      const b = allBills.find((x) => x.id === id);
      if (!b) return;
      const st = jurnalBillStatus(b, readJurnalEntries(), allBills);
      const msg =
        st.status === "aktif" && st.jurnal
          ? `Hapus tagihan ${b.noBill} (${b.supplier})? Jurnal ${st.jurnal.no} akan dibalik otomatis dengan jurnal pembalik.`
          : `Hapus tagihan ${b.noBill} (${b.supplier})?`;
      const run = () => {
        if (st.status === "aktif" && st.jurnal && w.addJurnal) {
          const rev = buatJurnalPembalik(
            st.jurnal,
            tanggalPembalikBill(st.jurnal.tanggal, agingHariIni())
          );
          if (!rev.ok) return void w.showAlert?.("⚠️ " + rev.pesan);
          const posted = w.addJurnal({
            tanggal: rev.entry.tanggal,
            jenis: rev.entry.jenis,
            ket: rev.entry.ket,
            ref: rev.entry.ref,
            reversalOf: rev.entry.reversalOf,
            lines: rev.entry.lines,
          });
          if (!posted) return;
          w.saveToStorage?.(false);
        }
        hapusBillByIdState(id);
        notifyRelated();
        w.showAlert?.(`Tagihan ${b.noBill} dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(msg, run);
      else run();
    },
    [notifyRelated]
  );

  const openModalBayar = useCallback(
    (id: string, mode: "bayar" | "riwayat" = "bayar") => {
      const w = getWin();
      if (mode === "bayar" && w.guardWrite && !w.guardWrite("bill", "update")) return;
      const b = readBillList().find((x) => x.id === id);
      if (!b) return;
      const curAkuns = readAkuns();
      setAkuns(curAkuns.slice());
      const sisa = sisaTagihan(b, readPembayaranList(), "bill");
      setBayarForm({
        billId: b.id,
        mode,
        tanggal: agingHariIni(),
        jumlah: sisa > 0 ? String(sisa) : "",
        akunKas: cariAkunDefault(curAkuns, "1101", (a) => a.tipe === "Aset" && a.kode.startsWith("11")),
        metode: "",
        catatan: "",
      });
      setBayarModalOpen(true);
    },
    []
  );

  const handleSimpanBayarBill = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("bill", "update")) return;
    const b = readBillList().find((x) => x.id === bayarForm.billId);
    if (!b) return;
    const hasil = susunPembayaran(
      {
        id: "PAYB_" + Date.now(),
        createdAt: new Date().toISOString(),
        tanggal: bayarForm.tanggal,
        jumlah: parseFloat(bayarForm.jumlah),
        akunKas: bayarForm.akunKas,
        metode: bayarForm.metode,
        catatan: bayarForm.catatan,
      },
      b,
      readPembayaranList(),
      "bill"
    );
    if (!hasil.ok) return void w.showAlert?.("⚠️ " + hasil.pesan);
    const dj = buatJurnalPembayaranBill(hasil.pembayaran, b);
    if (!dj.ok) return void w.showAlert?.("⚠️ " + dj.pesan);
    if (w.addJurnal) {
      const j = w.addJurnal({
        tanggal: dj.jurnal.tanggal,
        jenis: dj.jurnal.jenis,
        ket: dj.jurnal.keterangan,
        ref: dj.jurnal.ref,
        lines: dj.jurnal.lines,
      });
      if (!j) return;
      if (j.no) hasil.pembayaran.jurnalNo = j.no;
      w.saveToStorage?.(false);
    }
    void catatPembayaranState(b, hasil);
    setBayarModalOpen(false);
    notifyRelated();
    w.showAlert?.(
      hasil.lunas
        ? `Tagihan ${b.noBill} LUNAS! Jurnal pembayaran otomatis dibuat.`
        : `Pembayaran ${fmtRp(hasil.pembayaran.jumlah)} dicatat. Sisa: ${fmtRp(hasil.sisaBaru)}.`
    );
  }, [bayarForm, notifyRelated]);

  const handleHapusBayarBill = useCallback(
    (payId: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("bill", "delete")) return;
      const allPay = readPembayaranList();
      const target = allPay.find((p) => p.id === payId);
      if (!target) return;
      const b = readBillList().find((x) => x.id === target.dokId);
      const hasil = susunHapusPembayaran(payId, b, allPay, readJurnalEntries());
      if (!hasil.ok) return void w.showAlert?.("⚠️ " + hasil.pesan);
      const msg =
        hasil.jurnalStatus === "aktif" && hasil.jurnal
          ? `Hapus pembayaran ${fmtRp(target.jumlah)} (${target.tanggal})? Jurnal ${hasil.jurnal.no} akan dibalik otomatis.`
          : `Hapus catatan pembayaran ${fmtRp(target.jumlah)} (${target.tanggal})?`;
      const run = () => {
        if (hasil.jurnalStatus === "aktif" && hasil.jurnal && w.addJurnal) {
          const rev = buatJurnalPembalik(
            hasil.jurnal,
            tanggalPembalikBill(hasil.jurnal.tanggal, agingHariIni())
          );
          if (!rev.ok) return void w.showAlert?.("⚠️ " + rev.pesan);
          const posted = w.addJurnal({
            tanggal: rev.entry.tanggal,
            jenis: rev.entry.jenis,
            ket: rev.entry.ket,
            ref: rev.entry.ref,
            reversalOf: rev.entry.reversalOf,
            lines: rev.entry.lines,
          });
          if (!posted) return;
          w.saveToStorage?.(false);
        }
        void terapkanHapusPembayaranState(b, hasil);
        notifyRelated();
        w.showAlert?.("Pembayaran tagihan dihapus & sisa utang diperbarui.");
      };
      if (w.showConfirm) w.showConfirm(msg, run);
      else run();
    },
    [notifyRelated]
  );

  useEffect(() => {
    syncAll();
    setOasWindowFn("renderBillList", syncAll as (...args: never[]) => unknown);
    setOasWindowFn("openModalBill", openModalBill as (...args: never[]) => unknown);
    setOasWindowFn("editBill", openModalBill as (...args: never[]) => unknown);
    setOasWindowFn("openModalBayarBill", ((id: string) => openModalBayar(id, "bayar")) as (...args: never[]) => unknown);
    setOasWindowFn("openRiwayatPembayaranBill", ((id: string) => openModalBayar(id, "riwayat")) as (...args: never[]) => unknown);
  }, [openModalBayar, openModalBill, syncAll]);

  const jurnals = useMemo(() => { void tick; return readJurnalEntries(); }, [tick]);
  const supplierSuggestions = useMemo(
    () => readKontakList().filter((k) => k.tipe === "supplier" || k.tipe === "keduanya").map((k) => k.nama),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [billModalOpen]
  );
  const activeBayarBill = useMemo(() => bills.find((b) => b.id === bayarForm.billId) || null, [bayarForm.billId, bills]);
  const activeBayarHistory = useMemo(
    () => (activeBayarBill ? pembayaranDokumen(pembayarans, "bill", activeBayarBill.id) : []),
    [activeBayarBill, pembayarans]
  );

  const labelAkun = (kode: string) => {
    if (!kode) return "Pilih Akun...";
    const found = akuns.find((a) => a.kode === kode);
    return found ? `${found.kode} — ${found.nama}` : kode;
  };
  const readOnly = typeof window !== "undefined" && Boolean(getWin().isReadOnly?.());
  const today = agingHariIni();

  return (
    <>
      <div className="page" id="page-bill" data-react-managed="1">
        <div className="section-header">
          <div>
            <div className="section-title">
              <FileText size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
              Tagihan Pembelian
            </div>
            <div className="section-sub">Tagihan dari supplier yang belum dibayar · Utang usaha</div>
          </div>
        </div>

        <div className="table-card" style={{ marginBottom: "16px" }}>
          <div className="table-header">
            <div className="table-title">
              <FileText size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} />
              Daftar Tagihan Pembelian
            </div>
            {!readOnly && (
              <button className="btn btn-primary" type="button" onClick={() => openModalBill()}>+ Buat Tagihan</button>
            )}
          </div>

          <div id="bill-body">
            {!bills.length ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Belum ada tagihan pembelian.
              </div>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr><th>No Tagihan</th><th>Supplier</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Total</th><th>Sisa</th><th>Status</th><th>Jurnal</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {bills.map((b) => {
                      const sisa = sisaTagihan(b, pembayarans, "bill");
                      const jst = jurnalBillStatus(b, jurnals, bills);
                      const payCount = pembayaranDokumen(pembayarans, "bill", b.id).length;
                      const overdue = (b.status === "diterima" || b.status === "sebagian") && sisa > 0 && Boolean(b.jatuhTempo && b.jatuhTempo < today);
                      const badge = b.status === "lunas"
                        ? { t: "Lunas", bg: "rgba(74,222,128,0.15)", c: "var(--accent)" }
                        : overdue
                          ? { t: "Jatuh Tempo", bg: "rgba(248,113,113,0.15)", c: "var(--danger)" }
                          : b.status === "sebagian"
                            ? { t: "Sebagian", bg: "rgba(251,191,36,0.15)", c: "var(--accent3)" }
                            : b.status === "diterima"
                              ? { t: "Diterima", bg: "rgba(34,211,238,0.15)", c: "var(--accent2)" }
                              : { t: "Draft", bg: "rgba(148,163,184,0.15)", c: "var(--muted)" };
                      return (
                        <tr key={b.id}>
                          <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{b.noBill}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{b.supplier}</div>
                            {b.deskripsi && <div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.deskripsi}</div>}
                          </td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap" }}>{b.tanggal}</td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap", color: overdue ? "var(--danger)" : undefined }}>{b.jatuhTempo || "—"}</td>
                          <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{fmtRp(b.total)}</td>
                          <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: sisa > 0 ? "var(--accent3)" : "var(--accent)" }}>{b.status === "draft" ? "—" : fmtRp(sisa)}</td>
                          <td><span style={{ background: badge.bg, color: badge.c, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>{badge.t}</span></td>
                          <td style={{ fontSize: "11px", fontFamily: "var(--mono)", color: "var(--muted)" }}>
                            {jst.status === "aktif" && jst.jurnal ? jst.jurnal.no : jst.status === "dibalik" ? "Dibalik" : jst.status === "belum" ? "Belum" : "—"}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {!readOnly && bisaEditBill(b) && (
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 7px", fontSize: "11px" }} onClick={() => openModalBill(b.id)}><Pencil size={11} /> Edit</button>
                              )}
                              {!readOnly && b.status === "diterima" && jst.status === "belum" && (
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 7px", fontSize: "11px" }} onClick={() => handleBuatJurnalBill(b.id)}><BookOpen size={11} /> Jurnal</button>
                              )}
                              {!readOnly && (b.status === "diterima" || b.status === "sebagian") && sisa > 0 && (
                                <button className="btn btn-primary btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => openModalBayar(b.id, "bayar")}><Banknote size={11} /> Bayar</button>
                              )}
                              {payCount > 0 && (
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 7px", fontSize: "11px" }} onClick={() => openModalBayar(b.id, "riwayat")}><History size={11} /> {payCount}</button>
                              )}
                              {!readOnly && (
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", fontSize: "11px", color: "var(--danger)" }} title="Hapus" onClick={() => handleHapusBill(b.id)}><Trash2 size={12} /></button>
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

      <BillFormModal
        open={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        form={billForm}
        setForm={setBillForm}
        totals={billTotals}
        supplierSuggestions={supplierSuggestions}
        labelAkun={labelAkun}
        onPickItemAkun={(idx) => setPickerTarget({ kind: "item", idx })}
        onPickUtangAkun={() => setPickerTarget({ kind: "utang" })}
        onSave={handleSimpanBill}
      />

      <BillBayarModal
        open={bayarModalOpen}
        onClose={() => setBayarModalOpen(false)}
        bill={activeBayarBill}
        form={bayarForm}
        setForm={setBayarForm}
        pembayarans={pembayarans}
        history={activeBayarHistory}
        jurnals={jurnals}
        labelAkun={labelAkun}
        readOnly={readOnly}
        onPickKas={() => setPickerTarget({ kind: "bayar-kas" })}
        onSaveBayar={handleSimpanBayarBill}
        onDeleteBayar={handleHapusBayarBill}
      />

      <AkunPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        akuns={akuns}
        title={pickerTarget?.kind === "utang" ? "Pilih Akun Utang Usaha" : pickerTarget?.kind === "bayar-kas" ? "Pilih Akun Kas / Bank" : "Pilih Akun Item Tagihan"}
        selectedKode={pickerTarget?.kind === "utang" ? billForm.akunUtang : pickerTarget?.kind === "bayar-kas" ? bayarForm.akunKas : pickerTarget?.kind === "item" ? billForm.items[pickerTarget.idx]?.akun : ""}
        filterFn={(a) => (pickerTarget?.kind === "utang" ? a.tipe === "Liabilitas" : pickerTarget?.kind === "bayar-kas" ? a.tipe === "Aset" && a.kode.startsWith("11") : a.tipe === "Aset" || a.tipe === "Beban" || a.tipe === "HPP")}
        onSelect={(a) => {
          if (pickerTarget?.kind === "utang") setBillForm((f) => ({ ...f, akunUtang: a.kode }));
          else if (pickerTarget?.kind === "bayar-kas") setBayarForm((f) => ({ ...f, akunKas: a.kode }));
          else if (pickerTarget?.kind === "item") {
            const idx = pickerTarget.idx;
            setBillForm((f) => { const n = f.items.slice(); if (n[idx]) n[idx] = { ...n[idx], akun: a.kode }; return { ...f, items: n }; });
          }
          setPickerTarget(null);
        }}
      />
    </>
  );
}
