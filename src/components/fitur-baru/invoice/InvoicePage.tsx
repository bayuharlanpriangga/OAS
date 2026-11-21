"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  agingHariIni,
  berlakuDefaultPenawaran,
  buatJurnalPembayaranInvoice,
  buatJurnalPembalik,
  catatPembayaranState,
  counterSetelahPakai,
  fmtRp,
  hitungPpn,
  JENIS_JURNAL,
  jurnalPembayaranStatus,
  nomorBerikut,
  pembayaranDokumen,
  pembayaranInvoiceBelumJurnal,
  PPN_TARIF_STANDAR,
  readAkuns,
  readCounterList,
  readInvoiceList,
  readJurnalEntries,
  readKontakList,
  readPembayaranList,
  setOasWindowFn,
  simpanInvoiceState,
  simpanPembayaranState,
  sisaTagihan,
  statusDariPembayaran,
  susunAlokasiPembayaran,
  susunHapusPembayaran,
  susunPembayaran,
  tanggalPembalikBill,
  terapkanHapusPembayaranState,
  writeCounterList,
  writeInvoiceList,
  writePembayaranList,
} from "@/lib";
import type { Akun, Invoice, InvoiceItem, Pembayaran } from "@/types";

interface InvLegacyWin {
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, aksi?: string) => boolean;
  isReadOnly?: () => boolean;
  addJurnal?: (entry: Record<string, unknown>) => { no?: string } | null;
  saveToStorage?: (showToast?: boolean) => void;
  catatNomorInvoice?: (no: string) => boolean;
  nomorInvoiceBerikut?: (tahun?: number) => string;
  renderDashboard?: () => void;
  renderJurnalUmum?: () => void;
  renderAgingPiutang?: () => void;
  renderKartuPiutang?: () => void;
  cetakInvoicePDF?: (id: string) => void;
}

const getWin = () => window as unknown as InvLegacyWin;

const cariAkunPpnKeluaran = (akuns: readonly Akun[]) =>
  akuns.find((a) => a.kode === "2301")?.kode ||
  akuns.find((a) => /ppn keluaran/i.test(a.nama || ""))?.kode ||
  "2301";

const cariAkunDefault = (
  akuns: readonly Akun[],
  prefer: string,
  fn: (a: Akun) => boolean
) => akuns.find((a) => a.kode === prefer)?.kode || akuns.find(fn)?.kode || prefer;

type PickerTarget = "inv-piutang" | "inv-pend" | "bayar-kas" | "alokasi-kas" | null;

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pembayarans, setPembayarans] = useState<Pembayaran[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [tick, setTick] = useState(0);
  const [today, setToday] = useState("");
  const [readOnly, setReadOnly] = useState(false);

  const [invModalOpen, setInvModalOpen] = useState(false);
  const [invForm, setInvForm] = useState({
    editId: "",
    noInvoice: "",
    pelanggan: "",
    tanggal: "",
    jatuhTempo: "",
    deskripsi: "",
    items: [{ nama: "", qty: 1, harga: 0 }],
    ppnAktif: false,
    ppnTarif: PPN_TARIF_STANDAR,
    akunPiutang: "1201",
    akunPend: "4101",
  });

  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [bayarForm, setBayarForm] = useState({
    invId: "",
    mode: "bayar" as "bayar" | "riwayat",
    tanggal: "",
    jumlah: "",
    akunKas: "1101",
    metode: "",
    catatan: "",
  });

  const [alokasiModalOpen, setAlokasiModalOpen] = useState(false);
  const [alokasiForm, setAlokasiForm] = useState({
    tanggal: "",
    jumlah: "",
    akunKas: "1101",
    metode: "",
    catatan: "",
    rows: [{ dokId: "", jumlah: "" }],
  });

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const syncAll = useCallback(() => {
    setInvoices(readInvoiceList().slice());
    setPembayarans(readPembayaranList().slice());
    setAkuns(readAkuns().slice());
    setToday(agingHariIni());
    setReadOnly(Boolean(getWin().isReadOnly?.()));
    setTick((t) => t + 1);
  }, []);

  const notifyRelated = useCallback(() => {
    syncAll();
    const w = getWin();
    w.renderDashboard?.();
    w.renderJurnalUmum?.();
    w.renderAgingPiutang?.();
    w.renderKartuPiutang?.();
  }, [syncAll]);

  const openModalInvoice = useCallback((editId?: string) => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("invoice", editId ? "update" : "create")) return;
    const curAkuns = readAkuns();
    setAkuns(curAkuns.slice());
    const today = agingHariIni();
    const inv = editId ? readInvoiceList().find((i) => i.id === editId) : null;
    if (inv) {
      setInvForm({
        editId: inv.id,
        noInvoice: inv.noInvoice || "",
        pelanggan: inv.pelanggan || "",
        tanggal: inv.tanggal || today,
        jatuhTempo: inv.jatuhTempo || berlakuDefaultPenawaran(today, 30),
        deskripsi: inv.deskripsi || "",
        items: inv.items?.length
          ? inv.items.map((it) => ({ nama: it.nama || "", qty: it.qty || 1, harga: it.harga || 0 }))
          : [{ nama: "", qty: 1, harga: 0 }],
        ppnAktif: (inv.ppn || 0) > 0 || (inv.ppnTarif || 0) > 0,
        ppnTarif: inv.ppnTarif || PPN_TARIF_STANDAR,
        akunPiutang: inv.akunPiutang || cariAkunDefault(curAkuns, "1201", (a) => a.tipe === "Aset"),
        akunPend: inv.akunPend || cariAkunDefault(curAkuns, "4101", (a) => a.tipe === "Pendapatan"),
      });
    } else {
      const nextNo = w.nomorInvoiceBerikut
        ? w.nomorInvoiceBerikut()
        : nomorBerikut("INV", new Date().getFullYear(), readInvoiceList().map((i) => i.noInvoice), readCounterList());
      setInvForm({
        editId: "",
        noInvoice: nextNo,
        pelanggan: "",
        tanggal: today,
        jatuhTempo: berlakuDefaultPenawaran(today, 30),
        deskripsi: "",
        items: [{ nama: "", qty: 1, harga: 0 }],
        ppnAktif: false,
        ppnTarif: PPN_TARIF_STANDAR,
        akunPiutang: cariAkunDefault(curAkuns, "1201", (a) => a.tipe === "Aset"),
        akunPend: cariAkunDefault(curAkuns, "4101", (a) => a.tipe === "Pendapatan"),
      });
    }
    setInvModalOpen(true);
  }, []);

  const invTotals = useMemo(() => {
    const subtotal = invForm.items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.harga) || 0),
      0
    );
    const ppn = invForm.ppnAktif ? hitungPpn(subtotal, invForm.ppnTarif) : 0;
    return { subtotal, ppn, total: subtotal + ppn };
  }, [invForm.items, invForm.ppnAktif, invForm.ppnTarif]);

  const postJurnalInvoice = useCallback((inv: Invoice): boolean => {
    const w = getWin();
    if (!w.addJurnal) return false;
    const lines = [
      { akun: inv.akunPiutang || "1201", ket: `Piutang — ${inv.pelanggan}`, debit: inv.total, kredit: 0 },
      { akun: inv.akunPend || "4101", ket: `Pendapatan — ${inv.noInvoice}`, debit: 0, kredit: inv.subtotal },
    ];
    if ((inv.ppn || 0) > 0) {
      lines.push({
        akun: cariAkunPpnKeluaran(readAkuns()),
        ket: `PPN Keluaran ${inv.ppnTarif || PPN_TARIF_STANDAR}%`,
        debit: 0,
        kredit: inv.ppn,
      });
    }
    const res = w.addJurnal({
      tanggal: inv.tanggal,
      jenis: JENIS_JURNAL.INVOICE,
      ket: `Invoice ${inv.noInvoice} — ${inv.pelanggan}${inv.deskripsi ? " (" + inv.deskripsi + ")" : ""}`,
      ref: inv.noInvoice,
      lines,
      ...(inv.ppn > 0 ? { _ppnTarif: inv.ppnTarif || PPN_TARIF_STANDAR } : {}),
    });
    if (!res) return false;
    w.saveToStorage?.(false);
    return true;
  }, []);

  const handleSimpanInvoice = useCallback(
    (status: "draft" | "terkirim") => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("invoice", invForm.editId ? "update" : "create")) return;
      const noInvoice = invForm.noInvoice.trim().toUpperCase();
      const pelanggan = invForm.pelanggan.trim();
      const tanggal = invForm.tanggal.trim();
      const jatuhTempo = invForm.jatuhTempo.trim() || tanggal;
      if (!pelanggan) return void w.showAlert?.("Nama pelanggan wajib diisi!");
      if (!noInvoice) return void w.showAlert?.("Nomor invoice wajib diisi!");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return void w.showAlert?.("Tanggal invoice tidak valid!");
      const list = readInvoiceList().slice();
      if (list.some((i) => i.id !== invForm.editId && String(i.noInvoice || "").trim().toUpperCase() === noInvoice)) {
        return void w.showAlert?.(`Nomor invoice ${noInvoice} sudah dipakai. Gunakan nomor lain.`);
      }
      const validItems: InvoiceItem[] = invForm.items
        .filter((it) => Number(it.qty) > 0 && Number(it.harga) > 0)
        .map((it) => ({ nama: it.nama.trim() || "Item", qty: Number(it.qty), harga: Number(it.harga) }));
      if (!validItems.length) return void w.showAlert?.("Isi minimal 1 item dengan qty dan harga > 0!");
      if (status === "terkirim" && (!invForm.akunPiutang || !invForm.akunPend)) {
        return void w.showAlert?.("Pilih akun Piutang dan akun Pendapatan terlebih dahulu!");
      }
      const subtotal = validItems.reduce((s, it) => s + it.qty * it.harga, 0);
      const ppnTarif = invForm.ppnAktif ? invForm.ppnTarif : 0;
      const ppn = invForm.ppnAktif ? hitungPpn(subtotal, ppnTarif) : 0;
      const total = subtotal + ppn;
      const existing = invForm.editId ? list.find((i) => i.id === invForm.editId) : null;
      const inv: Invoice = {
        id: existing ? existing.id : "INV_" + Date.now(),
        noInvoice,
        pelanggan,
        tanggal,
        jatuhTempo,
        deskripsi: invForm.deskripsi.trim(),
        items: validItems,
        subtotal,
        ppn,
        ppnTarif,
        total,
        sisaTagihan: total,
        status,
        akunPiutang: invForm.akunPiutang || "1201",
        akunPend: invForm.akunPend || "4101",
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      if (status === "terkirim" && !postJurnalInvoice(inv)) return;
      if (existing) list[list.findIndex((i) => i.id === existing.id)] = inv;
      else list.unshift(inv);
      writeInvoiceList(list);
      if (w.catatNomorInvoice) {
        w.catatNomorInvoice(noInvoice);
        void simpanInvoiceState(false);
      } else {
        writeCounterList(counterSetelahPakai(readCounterList(), noInvoice));
        void simpanInvoiceState(true);
      }
      setInvModalOpen(false);
      notifyRelated();
      w.showAlert?.(status === "terkirim" ? `Invoice ${noInvoice} disimpan & dijurnal!` : `Draft invoice ${noInvoice} disimpan!`);
    },
    [invForm, notifyRelated, postJurnalInvoice]
  );

  const handleKirimInvoice = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("invoice", "update")) return;
      const list = readInvoiceList().slice();
      const idx = list.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const inv = { ...list[idx], status: "terkirim" as const };
      if (!postJurnalInvoice(inv)) return;
      list[idx] = inv;
      writeInvoiceList(list);
      void simpanInvoiceState(false);
      notifyRelated();
      w.showAlert?.(`Invoice ${inv.noInvoice} dikirim & jurnal otomatis dibuat!`);
    },
    [notifyRelated, postJurnalInvoice]
  );

  const handleHapusInvoice = useCallback(
    (id: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("invoice", "delete")) return;
      const inv = readInvoiceList().find((i) => i.id === id);
      if (!inv) return;
      const run = () => {
        writeInvoiceList(readInvoiceList().filter((i) => i.id !== id));
        void simpanInvoiceState(false);
        notifyRelated();
        w.showAlert?.(`Invoice ${inv.noInvoice} dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(`Hapus invoice ${inv.noInvoice} (${inv.pelanggan})?`, run);
      else run();
    },
    [notifyRelated]
  );

  const openModalBayar = useCallback((id: string, mode: "bayar" | "riwayat" = "bayar") => {
    const w = getWin();
    if (mode === "bayar" && w.guardWrite && !w.guardWrite("invoice", "update")) return;
    const inv = readInvoiceList().find((i) => i.id === id);
    if (!inv) return;
    const curAkuns = readAkuns();
    setAkuns(curAkuns.slice());
    const sisa = sisaTagihan(inv, readPembayaranList(), "invoice");
    setBayarForm({
      invId: inv.id,
      mode,
      tanggal: agingHariIni(),
      jumlah: sisa > 0 ? String(sisa) : "",
      akunKas: cariAkunDefault(curAkuns, "1101", (a) => a.tipe === "Aset" && a.kode.startsWith("11")),
      metode: "",
      catatan: "",
    });
    setBayarModalOpen(true);
  }, []);

  const handleSimpanPembayaran = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("invoice", "update")) return;
    const inv = readInvoiceList().find((i) => i.id === bayarForm.invId);
    if (!inv) return;
    const hasil = susunPembayaran(
      {
        id: "PAY_" + Date.now(),
        createdAt: new Date().toISOString(),
        tanggal: bayarForm.tanggal,
        jumlah: parseFloat(bayarForm.jumlah),
        akunKas: bayarForm.akunKas,
        metode: bayarForm.metode,
        catatan: bayarForm.catatan,
      },
      inv,
      readPembayaranList(),
      "invoice"
    );
    if (!hasil.ok) return void w.showAlert?.(hasil.pesan);
    const dj = buatJurnalPembayaranInvoice(hasil.pembayaran, inv, {
      akunPiutang: cariAkunDefault(readAkuns(), "1201", (a) => a.tipe === "Aset"),
    });
    if (!dj.ok) return void w.showAlert?.(dj.pesan);
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
    void catatPembayaranState(inv, hasil);
    setBayarModalOpen(false);
    notifyRelated();
    w.showAlert?.(
      hasil.lunas
        ? `Invoice ${inv.noInvoice} LUNAS! Jurnal pembayaran otomatis dibuat.`
        : `Pembayaran ${fmtRp(hasil.pembayaran.jumlah)} dicatat. Sisa: ${fmtRp(hasil.sisaBaru)}.`
    );
  }, [bayarForm, notifyRelated]);

  const handleHapusPembayaran = useCallback(
    (payId: string) => {
      const w = getWin();
      if (w.guardWrite && !w.guardWrite("invoice", "delete")) return;
      const allPay = readPembayaranList();
      const target = allPay.find((p) => p.id === payId);
      if (!target) return;
      const inv = readInvoiceList().find((i) => i.id === target.dokId);
      const hasil = susunHapusPembayaran(payId, inv, allPay, readJurnalEntries());
      if (!hasil.ok) return void w.showAlert?.(hasil.pesan);
      const msg =
        hasil.jurnalStatus === "aktif" && hasil.jurnal
          ? `Hapus pembayaran ${fmtRp(target.jumlah)} (${target.tanggal})? Jurnal ${hasil.jurnal.no} akan dibalik otomatis.`
          : `Hapus catatan pembayaran ${fmtRp(target.jumlah)} (${target.tanggal})?`;
      const run = () => {
        if (hasil.jurnalStatus === "aktif" && hasil.jurnal && w.addJurnal) {
          const rev = buatJurnalPembalik(hasil.jurnal, tanggalPembalikBill(hasil.jurnal.tanggal, agingHariIni()));
          if (!rev.ok) return void w.showAlert?.(rev.pesan);
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
        void terapkanHapusPembayaranState(inv, hasil);
        notifyRelated();
        w.showAlert?.("Pembayaran dihapus & sisa tagihan diperbarui.");
      };
      if (w.showConfirm) w.showConfirm(msg, run);
      else run();
    },
    [notifyRelated]
  );

  const handleJurnalkanLama = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("invoice", "update")) return;
    const belum = pembayaranInvoiceBelumJurnal(readPembayaranList(), readInvoiceList(), readJurnalEntries());
    if (!belum.length) return void w.showAlert?.("Semua pembayaran invoice sudah punya jurnal.");
    const fallbackPiutang = cariAkunDefault(readAkuns(), "1201", (a) => a.tipe === "Aset");
    let okCount = 0;
    const gagal: string[] = [];
    belum.forEach(({ pembayaran: p, invoice: inv }) => {
      const dj = buatJurnalPembayaranInvoice(p, inv, { akunPiutang: fallbackPiutang });
      if (!dj.ok) return void gagal.push(`${inv.noInvoice}: ${dj.pesan}`);
      const j = w.addJurnal?.({
        tanggal: dj.jurnal.tanggal,
        jenis: dj.jurnal.jenis,
        ket: dj.jurnal.keterangan,
        ref: dj.jurnal.ref,
        lines: dj.jurnal.lines,
      });
      if (j) {
        if (j.no) p.jurnalNo = j.no;
        okCount++;
      } else gagal.push(`${inv.noInvoice}: gagal posting`);
    });
    if (okCount > 0) {
      w.saveToStorage?.(false);
      void simpanPembayaranState("invoice");
    }
    notifyRelated();
    w.showAlert?.(
      gagal.length
        ? `${okCount} pembayaran dijurnalkan, ${gagal.length} gagal: ${gagal[0]}`
        : `${okCount} pembayaran lama berhasil dijurnalkan!`
    );
  }, [notifyRelated]);

  const openModalAlokasi = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("invoice", "update")) return;
    const curAkuns = readAkuns();
    setAkuns(curAkuns.slice());
    const openInvs = readInvoiceList().filter(
      (i) => (i.status === "terkirim" || i.status === "sebagian") && sisaTagihan(i, readPembayaranList(), "invoice") > 0
    );
    if (!openInvs.length) {
      return void w.showAlert?.("Tidak ada invoice berstatus Terkirim / Sebagian yang bisa dialokasikan.");
    }
    setAlokasiForm({
      tanggal: agingHariIni(),
      jumlah: "",
      akunKas: cariAkunDefault(curAkuns, "1101", (a) => a.tipe === "Aset" && a.kode.startsWith("11")),
      metode: "",
      catatan: "",
      rows: [{ dokId: openInvs[0].id, jumlah: "" }],
    });
    setAlokasiModalOpen(true);
  }, []);

  const handleSimpanAlokasi = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("invoice", "update")) return;
    const invs = readInvoiceList();
    const pays = readPembayaranList();
    const res = susunAlokasiPembayaran(
      {
        id: "GRP_" + Date.now(),
        createdAt: new Date().toISOString(),
        tanggal: alokasiForm.tanggal,
        jumlah: parseFloat(alokasiForm.jumlah),
        akunKas: alokasiForm.akunKas,
        metode: alokasiForm.metode,
        catatan: alokasiForm.catatan,
        alokasi: alokasiForm.rows.filter((r) => r.dokId).map((r) => ({ dokId: r.dokId, jumlah: parseFloat(r.jumlah) })),
      },
      invs,
      pays
    );
    if (!res.ok) return void w.showAlert?.(res.pesan);
    const fallbackPiutang = cariAkunDefault(readAkuns(), "1201", (a) => a.tipe === "Aset");
    const jurnals = readJurnalEntries();
    const prevLen = jurnals.length;
    for (const p of res.pembayaran) {
      const inv = invs.find((i) => i.id === p.dokId);
      const dj = buatJurnalPembayaranInvoice(p, inv, { akunPiutang: fallbackPiutang });
      if (!dj.ok) {
        jurnals.length = prevLen;
        return void w.showAlert?.(dj.pesan);
      }
      if (w.addJurnal) {
        const posted = w.addJurnal({
          tanggal: dj.jurnal.tanggal,
          jenis: dj.jurnal.jenis,
          ket: dj.jurnal.keterangan,
          ref: dj.jurnal.ref,
          lines: dj.jurnal.lines,
        });
        if (!posted) {
          jurnals.length = prevLen;
          return;
        }
        if (posted.no) p.jurnalNo = posted.no;
      }
    }
    const nextPays = [...res.pembayaran.slice().reverse(), ...pays];
    writePembayaranList(nextPays);
    res.perubahan.forEach((ch) => {
      const inv = invs.find((i) => i.id === ch.dokId);
      if (!inv) return;
      if (ch.dibayarLama > 0) inv.dibayarLama = ch.dibayarLama;
      inv.sisaTagihan = ch.sisaBaru;
      inv.status = statusDariPembayaran(inv, nextPays, "invoice") as Invoice["status"];
    });
    w.saveToStorage?.(false);
    void simpanPembayaranState("invoice");
    setAlokasiModalOpen(false);
    notifyRelated();
    w.showAlert?.(`Penerimaan ${fmtRp(res.totalDialokasikan)} dialokasikan ke ${res.pembayaran.length} invoice!`);
  }, [alokasiForm, notifyRelated]);

  useEffect(() => {
    syncAll();
    setOasWindowFn("renderInvoiceList", syncAll as (...args: never[]) => unknown);
    setOasWindowFn("renderInvoiceKPI", syncAll as (...args: never[]) => unknown);
    setOasWindowFn("renderPembayaranBelumJurnal", syncAll as (...args: never[]) => unknown);
    setOasWindowFn("openModalInvoice", openModalInvoice as (...args: never[]) => unknown);
    setOasWindowFn("kirimInvoice", handleKirimInvoice as (...args: never[]) => unknown);
    setOasWindowFn("hapusInvoice", handleHapusInvoice as (...args: never[]) => unknown);
    setOasWindowFn("openModalBayarInvoice", ((id: string) => openModalBayar(id, "bayar")) as (...args: never[]) => unknown);
    setOasWindowFn("openModalLunasInvoice", ((id: string) => openModalBayar(id, "bayar")) as (...args: never[]) => unknown);
    setOasWindowFn("openRiwayatPembayaranInvoice", ((id: string) => openModalBayar(id, "riwayat")) as (...args: never[]) => unknown);
    setOasWindowFn("openModalAlokasiPembayaran", openModalAlokasi as (...args: never[]) => unknown);
  }, [handleHapusInvoice, handleKirimInvoice, openModalAlokasi, openModalBayar, openModalInvoice, syncAll]);

  const belumJurnalList = useMemo(() => {
    void tick;
    return pembayaranInvoiceBelumJurnal(pembayarans, invoices, readJurnalEntries());
  }, [invoices, pembayarans, tick]);

  const kpi = useMemo(() => {
    let totalPiutang = 0;
    let totalLunas = 0;
    let totalJatuhTempo = 0;
    invoices.forEach((inv) => {
      const sisa = sisaTagihan(inv, pembayarans, "invoice");
      if (inv.status === "lunas" || sisa <= 0) {
        if (inv.status !== "draft") totalLunas += inv.total || 0;
      } else if (inv.status === "terkirim" || inv.status === "sebagian") {
        totalPiutang += sisa;
        if (inv.jatuhTempo && inv.jatuhTempo < today) totalJatuhTempo += sisa;
      }
    });
    return { jumlah: invoices.length, totalPiutang, totalLunas, totalJatuhTempo };
  }, [invoices, pembayarans, today]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "jatuh-tempo") {
        const sisa = sisaTagihan(inv, pembayarans, "invoice");
        return (inv.status === "terkirim" || inv.status === "sebagian") && sisa > 0 && Boolean(inv.jatuhTempo && inv.jatuhTempo < today);
      }
      return inv.status === filterStatus;
    });
  }, [filterStatus, invoices, pembayarans, today]);

  const activeBayarInv = useMemo(() => invoices.find((i) => i.id === bayarForm.invId) || null, [bayarForm.invId, invoices]);
  const activeBayarHistory = useMemo(() => (activeBayarInv ? pembayaranDokumen(pembayarans, "invoice", activeBayarInv.id) : []), [activeBayarInv, pembayarans]);
  const openInvsForAlokasi = useMemo(() => invoices.filter((i) => (i.status === "terkirim" || i.status === "sebagian") && sisaTagihan(i, pembayarans, "invoice") > 0), [invoices, pembayarans]);
  const alokasiSummary = useMemo(() => {
    const masuk = parseFloat(alokasiForm.jumlah) || 0;
    const dialokasikan = alokasiForm.rows.reduce((s, r) => s + (parseFloat(r.jumlah) || 0), 0);
    return { masuk, dialokasikan, selisih: Math.round((masuk - dialokasikan) * 100) / 100 };
  }, [alokasiForm.jumlah, alokasiForm.rows]);

  const pelangganSuggestions = useMemo(
    () => readKontakList().filter((k) => k.tipe === "pelanggan" || k.tipe === "keduanya").map((k) => k.nama),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invModalOpen]
  );

  const labelAkun = (kode: string) => {
    if (!kode) return "Pilih Akun...";
    const found = akuns.find((a) => a.kode === kode);
    return found ? `${found.kode} — ${found.nama}` : kode;
  };

  return (
    <>
      <div className="page" id="page-invoice" data-react-managed="1">
        <div className="section-header">
          <div>
            <div className="section-title">
              <FileText size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
              Invoice &amp; Piutang
            </div>
            <div className="section-sub">Buat invoice · Lacak pembayaran · Jurnal otomatis</div>
          </div>
          {!readOnly && (
            <button className="btn btn-primary" type="button" onClick={() => openModalInvoice()}>
              + Buat Invoice
            </button>
          )}
        </div>

        <div id="inv-belum-jurnal">
          {belumJurnalList.length > 0 && !readOnly && (
            <div style={{ background: "rgba(217,119,43,0.12)", border: "1px solid var(--accent3)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", fontSize: "12.5px" }}>
              <span>Ada <b>{belumJurnalList.length} pembayaran invoice</b> yang belum punya jurnal akuntansi.</span>
              <button className="btn btn-primary btn-sm" type="button" onClick={handleJurnalkanLama}>Jurnalkan Sekarang</button>
            </div>
          )}
        </div>

        <div id="inv-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px", marginBottom: "16px" }}>
          {[
            { label: "Total Invoice", val: String(kpi.jumlah), color: "var(--text)" },
            { label: "Piutang Berjalan", val: fmtRp(kpi.totalPiutang), color: "var(--accent2)" },
            { label: "Sudah Lunas", val: fmtRp(kpi.totalLunas), color: "var(--green)" },
            { label: "Lewat Jatuh Tempo", val: fmtRp(kpi.totalJatuhTempo), color: kpi.totalJatuhTempo > 0 ? "var(--danger)" : "var(--muted)" },
          ].map((c) => (
            <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "var(--mono)", color: c.color, marginTop: "4px" }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div className="table-card" style={{ marginBottom: "16px" }}>
          <div className="table-header">
            <div className="table-title"><ClipboardList size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Daftar Invoice</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {!readOnly && (
                <button className="btn btn-ghost btn-sm" type="button" onClick={openModalAlokasi}>
                  <ArrowLeftRight size={13} style={{ verticalAlign: "-2px" }} /> Alokasi Pembayaran
                </button>
              )}
              <select id="inv-filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "8px", padding: "6px 10px", color: "var(--text)", fontSize: "12px", fontFamily: "var(--sans)" }}>
                <option value="all">Semua Status</option>
                <option value="draft">Draft</option>
                <option value="terkirim">Terkirim</option>
                <option value="sebagian">Dibayar Sebagian</option>
                <option value="lunas">Lunas</option>
                <option value="jatuh-tempo">Jatuh Tempo</option>
              </select>
            </div>
          </div>

          <div className="table-scroll">
            <table id="inv-table">
              <thead>
                <tr><th>No Invoice</th><th>Pelanggan</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Nominal</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr>
              </thead>
              <tbody id="inv-tbody">
                {!filteredInvoices.length ? (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: "32px" }}>Belum ada invoice. Klik &quot;+ Buat Invoice&quot; untuk membuat.</td></tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const sisa = sisaTagihan(inv, pembayarans, "invoice");
                    const isOverdue = (inv.status === "terkirim" || inv.status === "sebagian") && sisa > 0 && Boolean(inv.jatuhTempo && inv.jatuhTempo < today);
                    const payCount = pembayaranDokumen(pembayarans, "invoice", inv.id).length;
                    const badge = inv.status === "lunas"
                      ? { t: "Lunas", bg: "var(--green-tint)", c: "var(--green)" }
                      : isOverdue
                        ? { t: "Jatuh Tempo", bg: "var(--red-tint)", c: "var(--danger)" }
                        : inv.status === "sebagian"
                          ? { t: "Sebagian", bg: "rgba(217,119,43,0.12)", c: "var(--accent3)" }
                          : inv.status === "terkirim"
                            ? { t: "Terkirim", bg: "var(--accent2-tint)", c: "var(--accent2)" }
                            : { t: "Draft", bg: "var(--surface2)", c: "var(--muted)" };
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: "var(--mono)", fontWeight: 600, fontSize: "12px" }}>{inv.noInvoice}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{inv.pelanggan}</div>
                          {inv.deskripsi && <div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.deskripsi}</div>}
                        </td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap" }}>{inv.tanggal}</td>
                        <td style={{ fontFamily: "var(--mono)", fontSize: "12px", whiteSpace: "nowrap", color: isOverdue ? "var(--danger)" : undefined }}>{inv.jatuhTempo || "—"}</td>
                        <td style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "12px" }}>{fmtRp(inv.total)}</td>
                        <td style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", fontSize: "12px", color: sisa > 0 ? "var(--accent3)" : "var(--green)" }}>{inv.status === "draft" ? "—" : fmtRp(sisa)}</td>
                        <td><span style={{ background: badge.bg, color: badge.c, border: "1px solid var(--border)", fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", whiteSpace: "nowrap" }}>{badge.t}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {!readOnly && inv.status === "draft" && (
                              <>
                                <button className="btn btn-primary btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => handleKirimInvoice(inv.id)}><Send size={11} /> Kirim</button>
                                <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => openModalInvoice(inv.id)}>Edit</button>
                              </>
                            )}
                            {!readOnly && (inv.status === "terkirim" || inv.status === "sebagian") && sisa > 0 && (
                              <button className="btn btn-primary btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => openModalBayar(inv.id, "bayar")}><Banknote size={11} /> Bayar</button>
                            )}
                            {payCount > 0 && (
                              <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 8px", fontSize: "11px" }} onClick={() => openModalBayar(inv.id, "riwayat")}><History size={11} /> {payCount}</button>
                            )}
                            {!readOnly && (
                              <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", fontSize: "11px", color: "var(--danger)" }} title="Hapus" onClick={() => handleHapusInvoice(inv.id)}><Trash2 size={12} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OasModalDialog
        id="modal-invoice"
        open={invModalOpen}
        onClose={() => setInvModalOpen(false)}
        maxWidth="600px"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><FileText size={15} /> {invForm.editId ? "Edit Draft Invoice" : "Buat Invoice"}</span>}
        footer={
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", width: "100%", justifyContent: "space-between" }}>
            <button className="btn btn-ghost" type="button" onClick={() => setInvModalOpen(false)}>Batal</button>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button className="btn btn-ghost" type="button" onClick={() => handleSimpanInvoice("draft")}><Save size={14} style={{ verticalAlign: "-2px" }} /> Simpan Draft</button>
              <button className="btn btn-primary" type="button" onClick={() => handleSimpanInvoice("terkirim")}><Upload size={14} style={{ verticalAlign: "-2px" }} /> Simpan &amp; Terkirim</button>
            </div>
          </div>
        }
      >
        <div className="form-row">
          <div className="form-group"><label>No. Invoice</label><input type="text" placeholder="INV-2026-001" value={invForm.noInvoice} onChange={(e) => setInvForm({ ...invForm, noInvoice: e.target.value })} /></div>
          <div className="form-group"><label>Tanggal Invoice</label><input type="date" value={invForm.tanggal} onChange={(e) => setInvForm({ ...invForm, tanggal: e.target.value })} /></div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nama Pelanggan</label>
            <input type="text" list="inv-pelanggan-datalist" placeholder="PT. Maju Bersama" value={invForm.pelanggan} onChange={(e) => setInvForm({ ...invForm, pelanggan: e.target.value })} />
            <datalist id="inv-pelanggan-datalist">{pelangganSuggestions.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <div className="form-group"><label>Jatuh Tempo</label><input type="date" value={invForm.jatuhTempo} onChange={(e) => setInvForm({ ...invForm, jatuhTempo: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>Keterangan / Deskripsi Jasa</label><textarea rows={2} placeholder="Jasa konsultasi bulan Mei 2026" value={invForm.deskripsi} onChange={(e) => setInvForm({ ...invForm, deskripsi: e.target.value })} /></div>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 32px", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>ITEM</span>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>QTY</span>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>HARGA</span>
            <span />
          </div>
          <div style={{ display: "grid", gap: "6px" }}>
            {invForm.items.map((it, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 32px", gap: "8px", alignItems: "center" }}>
                <input type="text" placeholder="Nama barang/jasa" value={it.nama} onChange={(e) => { const n = invForm.items.slice(); n[idx] = { ...n[idx], nama: e.target.value }; setInvForm({ ...invForm, items: n }); }} />
                <input type="number" min={1} value={it.qty} onChange={(e) => { const n = invForm.items.slice(); n[idx] = { ...n[idx], qty: Number(e.target.value) }; setInvForm({ ...invForm, items: n }); }} />
                <input type="number" min={0} value={it.harga} onChange={(e) => { const n = invForm.items.slice(); n[idx] = { ...n[idx], harga: Number(e.target.value) }; setInvForm({ ...invForm, items: n }); }} />
                <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--danger)" }} disabled={invForm.items.length <= 1} onClick={() => setInvForm({ ...invForm, items: invForm.items.filter((_, i) => i !== idx) })}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: "8px" }} onClick={() => setInvForm({ ...invForm, items: [...invForm.items, { nama: "", qty: 1, harga: 0 }] })}>+ Tambah Item</button>
        <div style={{ background: "var(--surface2)", borderRadius: "10px", padding: "14px", marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}><span style={{ color: "var(--muted)", fontSize: "13px" }}>Subtotal</span><span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(invTotals.subtotal)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ color: "var(--muted)", fontSize: "13px" }}>
              PPN <input type="checkbox" checked={invForm.ppnAktif} onChange={(e) => setInvForm({ ...invForm, ppnAktif: e.target.checked })} style={{ accentColor: "var(--accent)", cursor: "pointer" }} />{" "}
              <select value={invForm.ppnTarif} onChange={(e) => setInvForm({ ...invForm, ppnTarif: Number(e.target.value) })} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "5px", color: "var(--text)", fontSize: "12px", padding: "2px 4px" }}>
                <option value={11}>11% (non-mewah)</option><option value={12}>12% (mewah)</option>
              </select>
            </label>
            <span style={{ fontFamily: "var(--mono)", fontSize: "13px" }}>{fmtRp(invTotals.ppn)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)", fontSize: "16px" }}>{fmtRp(invTotals.total)}</span>
          </div>
        </div>
        <div className="form-row" style={{ marginTop: "12px" }}>
          <div className="form-group"><label>Akun Piutang</label><button className="form-picker-btn" type="button" onClick={() => setPickerTarget("inv-piutang")}>{labelAkun(invForm.akunPiutang)}</button></div>
          <div className="form-group"><label>Akun Pendapatan</label><button className="form-picker-btn" type="button" onClick={() => setPickerTarget("inv-pend")}>{labelAkun(invForm.akunPend)}</button></div>
        </div>
      </OasModalDialog>

      <OasModalDialog
        id="modal-bayar-inv"
        open={bayarModalOpen && Boolean(activeBayarInv)}
        onClose={() => setBayarModalOpen(false)}
        maxWidth="460px"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Banknote size={15} style={{ color: "var(--accent)" }} /> {bayarForm.mode === "riwayat" ? `Riwayat Pembayaran ${activeBayarInv?.noInvoice || ""}` : `Bayar Invoice ${activeBayarInv?.noInvoice || ""}`}</span>}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setBayarModalOpen(false)}>{bayarForm.mode === "riwayat" ? "Tutup" : "Batal"}</button>
            {bayarForm.mode === "bayar" && (
              <button className="btn btn-primary" type="button" onClick={handleSimpanPembayaran}><CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Simpan Pembayaran</button>
            )}
          </>
        }
      >
        {activeBayarInv && (
          <>
            <div style={{ background: "var(--surface2)", borderRadius: "9px", padding: "10px 12px", marginBottom: "14px", fontSize: "12.5px" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>{activeBayarInv.pelanggan} · {activeBayarInv.noInvoice}</div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)" }}>
                <span>Total: {fmtRp(activeBayarInv.total)}</span>
                <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "var(--mono)" }}>Sisa: {fmtRp(sisaTagihan(activeBayarInv, pembayarans, "invoice"))}</span>
              </div>
            </div>
            {bayarForm.mode === "bayar" && (
              <div>
                <div className="form-group"><label>Tanggal Pembayaran</label><input type="date" value={bayarForm.tanggal} onChange={(e) => setBayarForm({ ...bayarForm, tanggal: e.target.value })} /></div>
                <div className="form-group"><label>Jumlah Dibayar (Rp) — boleh sebagian</label><input type="number" min={0} step="any" value={bayarForm.jumlah} onChange={(e) => setBayarForm({ ...bayarForm, jumlah: e.target.value })} /></div>
                <div className="form-group"><label>Akun Kas/Bank Penerima</label><button className="form-picker-btn" type="button" onClick={() => setPickerTarget("bayar-kas")}>{labelAkun(bayarForm.akunKas)}</button></div>
                <div className="form-group"><label>Metode (opsional)</label><input type="text" placeholder="Transfer, Tunai, ..." value={bayarForm.metode} onChange={(e) => setBayarForm({ ...bayarForm, metode: e.target.value })} /></div>
                <div className="form-group"><label>Catatan (opsional)</label><input type="text" value={bayarForm.catatan} onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })} /></div>
                <div style={{ padding: "10px", background: "rgba(251,191,36,0.08)", borderRadius: "8px", fontSize: "12px", color: "var(--accent3)", marginBottom: activeBayarHistory.length ? "14px" : "0" }}>
                  Pembayaran dicatat, sisa tagihan berkurang, dan jurnal otomatis dibuat: Kas/Bank di debit, Piutang di kredit.
                </div>
              </div>
            )}
            {activeBayarHistory.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase" }}>Riwayat Pembayaran ({activeBayarHistory.length})</div>
                <div style={{ display: "grid", gap: "6px" }}>
                  {activeBayarHistory.map((p) => {
                    const jst = jurnalPembayaranStatus(p, activeBayarInv, readJurnalEntries(), pembayarans);
                    return (
                      <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "8px 10px", background: "var(--surface2)", borderRadius: "8px", fontSize: "12px" }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.tanggal} · {fmtRp(p.jumlah)}</div>
                          <div style={{ fontSize: "11px", color: "var(--muted)" }}>Akun {p.akunKas}{p.metode ? ` · ${p.metode}` : ""}{jst.jurnal ? ` · ${jst.jurnal.no}` : ""}</div>
                        </div>
                        {!readOnly && <button className="btn btn-ghost btn-sm" type="button" style={{ padding: "4px 6px", color: "var(--danger)" }} title="Hapus pembayaran" onClick={() => handleHapusPembayaran(p.id)}><Trash2 size={13} /></button>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </OasModalDialog>

      <OasModalDialog
        id="modal-alokasi-inv"
        open={alokasiModalOpen}
        onClose={() => setAlokasiModalOpen(false)}
        maxWidth="720px"
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><ArrowLeftRight size={15} style={{ color: "var(--accent)" }} /> Alokasi Pembayaran Beberapa Invoice</span>}
        footer={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setAlokasiModalOpen(false)}>Batal</button>
            <button className="btn btn-primary" type="button" onClick={handleSimpanAlokasi}><CheckCircle2 size={14} style={{ verticalAlign: "-2px" }} /> Simpan Penerimaan</button>
          </>
        }
      >
        <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: "9px", fontSize: "12px", color: "var(--muted)", marginBottom: "14px" }}>
          Catat satu penerimaan bank/kas, lalu bagi nominalnya ke beberapa invoice. Total alokasi wajib sama dengan jumlah penerimaan.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group"><label>Tanggal Pembayaran</label><input type="date" value={alokasiForm.tanggal} onChange={(e) => setAlokasiForm({ ...alokasiForm, tanggal: e.target.value })} /></div>
          <div className="form-group"><label>Total Penerimaan (Rp)</label><input type="number" min="0.01" step="any" value={alokasiForm.jumlah} onChange={(e) => setAlokasiForm({ ...alokasiForm, jumlah: e.target.value })} /></div>
        </div>
        <div className="form-group"><label>Akun Kas/Bank</label><button className="form-picker-btn" type="button" onClick={() => setPickerTarget("alokasi-kas")}>{labelAkun(alokasiForm.akunKas)}</button></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "16px 0 9px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600 }}>Alokasi per Invoice</label>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAlokasiForm({ ...alokasiForm, rows: [...alokasiForm.rows, { dokId: "", jumlah: "" }] })}><Plus size={13} /> Tambah Invoice</button>
        </div>
        <div style={{ display: "grid", gap: "8px" }}>
          {alokasiForm.rows.map((row, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 150px 32px", gap: "8px", alignItems: "center" }}>
              <select
                value={row.dokId}
                onChange={(e) => {
                  const next = alokasiForm.rows.slice();
                  const inv = openInvsForAlokasi.find((i) => i.id === e.target.value);
                  const sisa = inv ? sisaTagihan(inv, pembayarans, "invoice") : 0;
                  next[idx] = { dokId: e.target.value, jumlah: next[idx].jumlah || (sisa > 0 ? String(sisa) : "") };
                  setAlokasiForm({ ...alokasiForm, rows: next });
                }}
              >
                <option value="">— Pilih Invoice —</option>
                {openInvsForAlokasi.map((inv) => (
                  <option key={inv.id} value={inv.id}>{inv.noInvoice} · {inv.pelanggan} (Sisa {fmtRp(sisaTagihan(inv, pembayarans, "invoice"))})</option>
                ))}
              </select>
              <input type="number" min="0" step="any" placeholder="Nominal" value={row.jumlah} onChange={(e) => { const n = alokasiForm.rows.slice(); n[idx] = { ...n[idx], jumlah: e.target.value }; setAlokasiForm({ ...alokasiForm, rows: n }); }} />
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--danger)" }} disabled={alokasiForm.rows.length <= 1} onClick={() => setAlokasiForm({ ...alokasiForm, rows: alokasiForm.rows.filter((_, i) => i !== idx) })}><X size={14} /></button>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 12px", background: "var(--surface2)", borderRadius: "8px", fontSize: "12px", margin: "10px 0 14px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <span>Dialokasikan: <b>{fmtRp(alokasiSummary.dialokasikan)}</b></span>
          <span style={{ fontWeight: 700, color: alokasiSummary.selisih === 0 && alokasiSummary.masuk > 0 ? "var(--accent)" : "var(--accent3)" }}>Selisih: {fmtRp(alokasiSummary.selisih)}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group"><label>Metode (opsional)</label><input type="text" placeholder="Transfer, Tunai, ..." value={alokasiForm.metode} onChange={(e) => setAlokasiForm({ ...alokasiForm, metode: e.target.value })} /></div>
          <div className="form-group"><label>Catatan (opsional)</label><input type="text" value={alokasiForm.catatan} onChange={(e) => setAlokasiForm({ ...alokasiForm, catatan: e.target.value })} /></div>
        </div>
      </OasModalDialog>

      <AkunPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        akuns={akuns}
        title={pickerTarget === "inv-piutang" ? "Pilih Akun Piutang" : pickerTarget === "inv-pend" ? "Pilih Akun Pendapatan" : "Pilih Akun Kas / Bank"}
        selectedKode={pickerTarget === "inv-piutang" ? invForm.akunPiutang : pickerTarget === "inv-pend" ? invForm.akunPend : pickerTarget === "bayar-kas" ? bayarForm.akunKas : alokasiForm.akunKas}
        filterFn={(a) => (pickerTarget === "inv-piutang" ? a.tipe === "Aset" : pickerTarget === "inv-pend" ? a.tipe === "Pendapatan" : a.tipe === "Aset" && a.kode.startsWith("11"))}
        onSelect={(a) => {
          if (pickerTarget === "inv-piutang") setInvForm((f) => ({ ...f, akunPiutang: a.kode }));
          else if (pickerTarget === "inv-pend") setInvForm((f) => ({ ...f, akunPend: a.kode }));
          else if (pickerTarget === "bayar-kas") setBayarForm((f) => ({ ...f, akunKas: a.kode }));
          else if (pickerTarget === "alokasi-kas") setAlokasiForm((f) => ({ ...f, akunKas: a.kode }));
          setPickerTarget(null);
        }}
      />
    </>
  );
}
