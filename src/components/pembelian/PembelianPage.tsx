"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Info,
  Package,
  Pencil,
  Search,
  ShoppingCart,
  Trash2,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp } from "@/lib/shared/format";
import {
  callOasGlobal,
  readAkuns,
  readKontakList,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import {
  hitungSaldoKat,
  initMultiKartuStockStore,
  readMksMap,
  type KsCard,
  type KsKategori,
} from "@/lib/kalkulator/persediaan/kartu-stock";
import {
  buatPesananPembelianStore,
  generateNomorPembelian,
  hitungItemPembelian,
  readAkunBank1100,
  readAkunKas1100,
  simpanPembelianLangsungStore,
  todayIsoLocal,
  type ItemPembelianLine,
  type MetodeBayarBeli,
} from "@/lib/pembelian/pesanan-pembelian";
import type { Akun, Kontak } from "@/types";

type BeliMode = "pesanan" | "langsung";
type CardTab = "rincian" | "info";

interface PickedItemRef {
  gudangId: string;
  gudangNama: string;
  rakId: string;
  rakNama: string;
  barang: KsKategori;
  hppLast: number;
  stokSaatIni: number;
}

export default function PembelianPage() {
  const [mode, setMode] = useState<BeliMode>("pesanan");
  const [cardTab, setCardTab] = useState<CardTab>("rincian");

  // Data master dari store
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [gudangList, setGudangList] = useState<KsCard[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);

  // Form header
  const [pemasokId, setPemasokId] = useState("");
  const [pemasokNama, setPemasokNama] = useState("");
  const [pemasokQuery, setPemasokQuery] = useState("");
  const [pemasokOpen, setPemasokOpen] = useState(false);
  const pemasokRef = useRef<HTMLDivElement | null>(null);

  const [tanggal, setTanggal] = useState("");
  const [nomor, setNomor] = useState("");

  // Rincian barang
  const [items, setItems] = useState<ItemPembelianLine[]>([]);

  // Info lainnya (pembayaran & catatan)
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayarBeli>("kas");
  const [akunKasKode, setAkunKasKode] = useState("1101");
  const [akunBankKode, setAkunBankKode] = useState("");
  const [catatan, setCatatan] = useState("");

  // Modal Picker Gudang -> Daftar Barang per Rak
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerGudangId, setPickerGudangId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // Modal Input Detail Barang (Qty, Harga, Diskon, Pajak)
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    editLineId: string | null;
    refItem: PickedItemRef | null;
    qty: string;
    harga: string;
    diskonTipe: "persen" | "nominal";
    diskonNilai: string;
    pajakPersen: string;
  }>({
    open: false,
    editLineId: null,
    refItem: null,
    qty: "1",
    harga: "",
    diskonTipe: "persen",
    diskonNilai: "0",
    pajakPersen: "0",
  });

  const syncMaster = useCallback(() => {
    initMultiKartuStockStore();
    const nextAkuns = [...readAkuns()];
    const banks = readAkunBank1100(nextAkuns);
    const kasList = readAkunKas1100(nextAkuns);
    setKontakList([...readKontakList()]);
    setGudangList(Object.values(readMksMap()));
    setAkuns(nextAkuns);
    setAkunKasKode((prev) =>
      prev && kasList.some((a) => a.kode === prev) ? prev : kasList[0]?.kode || "1101"
    );
    setAkunBankKode((prev) =>
      prev && banks.some((a) => a.kode === prev) ? prev : banks[0]?.kode || ""
    );
  }, []);

  useEffect(() => {
    syncMaster();
    setTanggal((prev) => prev || todayIsoLocal());
    setNomor((prev) => prev || generateNomorPembelian("PO"));
    setOasWindowFn("renderPembelianPage", syncMaster as (...args: never[]) => unknown);
    setOasWindowFn(
      "openPembelianTab",
      ((tab: BeliMode) => {
        if (tab === "pesanan" || tab === "langsung") {
          setMode(tab);
          setNomor(generateNomorPembelian(tab === "pesanan" ? "PO" : "PB"));
          syncMaster();
        }
      }) as (...args: never[]) => unknown
    );
  }, [syncMaster]);

  // Tutup dropdown pemasok saat klik di luar
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pemasokRef.current && !pemasokRef.current.contains(e.target as Node)) {
        setPemasokOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleModeChange = (nextMode: BeliMode) => {
    setMode(nextMode);
    setNomor(generateNomorPembelian(nextMode === "pesanan" ? "PO" : "PB"));
  };

  // Pemasok dari Kontak (prioritaskan tipe supplier / keduanya)
  const pemasokOptions = useMemo(() => {
    const q = pemasokQuery.trim().toLowerCase();
    const sorted = [...kontakList].sort((a, b) => {
      const aSup = a.tipe === "supplier" || a.tipe === "keduanya" ? 0 : 1;
      const bSup = b.tipe === "supplier" || b.tipe === "keduanya" ? 0 : 1;
      if (aSup !== bSup) return aSup - bSup;
      return a.nama.localeCompare(b.nama, "id");
    });
    if (!q) return sorted;
    return sorted.filter(
      (k) =>
        k.nama.toLowerCase().includes(q) ||
        (k.telp || "").toLowerCase().includes(q) ||
        (k.email || "").toLowerCase().includes(q)
    );
  }, [kontakList, pemasokQuery]);

  const kasAccounts = useMemo(() => readAkunKas1100(akuns), [akuns]);
  const bankAccounts = useMemo(() => readAkunBank1100(akuns), [akuns]);

  const activeAkunBayar = useMemo(() => {
    if (metodeBayar === "transfer") {
      return (
        bankAccounts.find((a) => a.kode === akunBankKode) ||
        bankAccounts[0] ||
        null
      );
    }
    return (
      kasAccounts.find((a) => a.kode === akunKasKode) ||
      kasAccounts[0] || { kode: "1101", nama: "Kas", tipe: "Aset", kat: "Lancar", normal: "D" }
    );
  }, [akunBankKode, akunKasKode, bankAccounts, kasAccounts, metodeBayar]);

  // Daftar barang terkelompok per rak pada gudang yang dipilih di picker
  const pickerGudang = useMemo(
    () => gudangList.find((g) => g.id === pickerGudangId) || null,
    [gudangList, pickerGudangId]
  );

  const pickerGroupedByRak = useMemo(() => {
    if (!pickerGudang) return [];
    const q = pickerSearch.trim().toLowerCase();
    const raks = Array.isArray(pickerGudang.rakList) ? pickerGudang.rakList : [];
    const validRakIds = new Set(raks.map((r) => r.id));
    const allItems = Object.values(pickerGudang.kategori || {})
      .filter((brg) => !q || brg.nama.toLowerCase().includes(q))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const groups: Array<{
      rakId: string;
      rakNama: string;
      items: PickedItemRef[];
    }> = [];

    raks.forEach((rak) => {
      const matched = allItems
        .filter((b) => b.rakId === rak.id)
        .map((barang) => {
          const saldo = hitungSaldoKat(barang);
          return {
            gudangId: pickerGudang.id,
            gudangNama: pickerGudang.nama,
            rakId: rak.id,
            rakNama: rak.nama,
            barang,
            hppLast: Math.round(saldo.hppRata || saldo.hppNext || 0),
            stokSaatIni: saldo.totalQty,
          };
        });
      if (matched.length > 0) {
        groups.push({ rakId: rak.id, rakNama: rak.nama, items: matched });
      }
    });

    const ungrouped = allItems
      .filter((b) => !b.rakId || !validRakIds.has(b.rakId))
      .map((barang) => {
        const saldo = hitungSaldoKat(barang);
        return {
          gudangId: pickerGudang.id,
          gudangNama: pickerGudang.nama,
          rakId: "",
          rakNama: "Tanpa rak",
          barang,
          hppLast: Math.round(saldo.hppRata || saldo.hppNext || 0),
          stokSaatIni: saldo.totalQty,
        };
      });
    if (ungrouped.length > 0) {
      groups.push({ rakId: "", rakNama: "Tanpa rak", items: ungrouped });
    }
    return groups;
  }, [pickerGudang, pickerSearch]);

  const openBarangPicker = () => {
    syncMaster();
    setPickerGudangId(null);
    setPickerSearch("");
    setPickerOpen(true);
  };

  const handleSelectBarangFromPicker = (ref: PickedItemRef) => {
    setPickerOpen(false);
    setItemModal({
      open: true,
      editLineId: null,
      refItem: ref,
      qty: "1",
      harga: ref.hppLast > 0 ? String(ref.hppLast) : "",
      diskonTipe: "persen",
      diskonNilai: "0",
      pajakPersen: "0",
    });
  };

  const handleEditLine = (line: ItemPembelianLine) => {
    const g = gudangList.find((x) => x.id === line.gudangId);
    const brg = g?.kategori?.[line.barangId];
    const saldo = brg ? hitungSaldoKat(brg) : null;
    setItemModal({
      open: true,
      editLineId: line.id,
      refItem: {
        gudangId: line.gudangId,
        gudangNama: line.gudangNama,
        rakId: line.rakId,
        rakNama: line.rakNama,
        barang: brg || {
          id: line.barangId,
          nama: line.barangNama,
          satuan: line.satuan,
          data: { fifo: [], lifo: [], wa: [], mwa: [] },
        },
        hppLast: Math.round(saldo?.hppRata || line.harga),
        stokSaatIni: saldo?.totalQty || 0,
      },
      qty: String(line.qty),
      harga: String(line.harga),
      diskonTipe: line.diskonTipe,
      diskonNilai: String(line.diskonNilai),
      pajakPersen: String(line.pajakPersen),
    });
  };

  const itemModalCalc = useMemo(
    () =>
      hitungItemPembelian({
        qty: parseFloat(itemModal.qty) || 0,
        harga: parseFloat(itemModal.harga) || 0,
        diskonTipe: itemModal.diskonTipe,
        diskonNilai: parseFloat(itemModal.diskonNilai) || 0,
        pajakPersen: parseFloat(itemModal.pajakPersen) || 0,
      }),
    [itemModal]
  );

  const handleConfirmItemModal = () => {
    const ref = itemModal.refItem;
    if (!ref) return;
    const qty = parseFloat(itemModal.qty) || 0;
    const harga = parseFloat(itemModal.harga) || 0;
    if (!(qty > 0)) {
      callOasGlobal("showAlert", "Jumlah barang harus lebih dari 0.");
      return;
    }
    if (!(harga > 0)) {
      callOasGlobal("showAlert", "Isi harga satuan terlebih dahulu.");
      return;
    }
    const diskonNilai = parseFloat(itemModal.diskonNilai) || 0;
    const pajakPersen = parseFloat(itemModal.pajakPersen) || 0;
    const calc = hitungItemPembelian({
      qty,
      harga,
      diskonTipe: itemModal.diskonTipe,
      diskonNilai,
      pajakPersen,
    });

    const lineData: ItemPembelianLine = {
      id:
        itemModal.editLineId ||
        "line_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      gudangId: ref.gudangId,
      gudangNama: ref.gudangNama,
      rakId: ref.rakId,
      rakNama: ref.rakNama,
      barangId: ref.barang.id,
      barangNama: ref.barang.nama,
      satuan: ref.barang.satuan || "unit",
      qty,
      harga,
      diskonTipe: itemModal.diskonTipe,
      diskonNilai,
      diskonTotal: calc.diskonTotal,
      pajakPersen,
      pajakTotal: calc.pajakTotal,
      subtotal: calc.subtotal,
      total: calc.total,
    };

    setItems((prev) =>
      itemModal.editLineId
        ? prev.map((l) => (l.id === itemModal.editLineId ? lineData : l))
        : [...prev, lineData]
    );
    setItemModal((prev) => ({ ...prev, open: false }));
    setCardTab("rincian");
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const totalDiskon = items.reduce((s, i) => s + i.diskonTotal, 0);
    const totalPajak = items.reduce((s, i) => s + i.pajakTotal, 0);
    const grandTotal = subtotal + totalPajak;
    return { subtotal, totalDiskon, totalPajak, grandTotal };
  }, [items]);

  const handleReset = () => {
    setPemasokId("");
    setPemasokNama("");
    setPemasokQuery("");
    setTanggal(todayIsoLocal());
    setNomor(generateNomorPembelian(mode === "pesanan" ? "PO" : "PB"));
    setItems([]);
    setCatatan("");
    setCardTab("rincian");
  };

  const handleSimpan = () => {
    if (callOasGlobal("guardHanyaBaca", "Pembelian")) return;
    if (!pemasokId && !pemasokNama.trim()) {
      callOasGlobal("showAlert", "Pilih Pemasok terlebih dahulu.");
      return;
    }
    if (!tanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu.");
      return;
    }
    if (!callOasGlobal("guardPeriode", tanggal, "diposting")) return;
    if (items.length === 0) {
      callOasGlobal("showAlert", "Tambahkan minimal 1 barang terlebih dahulu.");
      return;
    }
    if (metodeBayar === "transfer" && !activeAkunBayar) {
      callOasGlobal(
        "showAlert",
        "Belum ada akun Bank di grup 1100 (Chart of Accounts). Tambahkan akun bank terlebih dahulu."
      );
      return;
    }

    const docNo =
      nomor.trim() || generateNomorPembelian(mode === "pesanan" ? "PO" : "PB");
    const payload = {
      nomor: docNo,
      tanggal,
      pemasokId,
      pemasokNama: pemasokNama.trim(),
      metodeBayar,
      akunBayarKode: activeAkunBayar?.kode || "1101",
      akunBayarNama: activeAkunBayar?.nama || "Kas",
      catatan,
      items,
    };

    if (mode === "pesanan") {
      const res = buatPesananPembelianStore(payload);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      handleReset();
      callOasGlobal(
        "showAlert",
        metodeBayar === "transfer"
          ? `Pesanan Pembelian ${docNo} tersimpan & saldo ${payload.akunBayarNama} langsung terpotong. Klik "Terima Pesanan" di halaman Pesanan Pembelian saat barang tiba.`
          : `Pesanan Pembelian ${docNo} tersimpan. Saldo Kas akan dipotong & stok masuk gudang saat Anda klik "Terima Pesanan" di halaman Pesanan Pembelian.`
      );
    } else {
      const res = simpanPembelianLangsungStore(payload);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      handleReset();
      callOasGlobal(
        "showAlert",
        `Pembelian Langsung ${docNo} berhasil disimpan. Stok masuk gudang & jurnal tercatat.`
      );
    }
  };

  return (
    <div className="page" id="page-pembelian" data-react-managed="1">
      {/* Tab Kategori: Pesanan Pembelian vs Pembelian Langsung */}
      <div
        role="tablist"
        aria-label="Kategori pembelian"
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}
      >
        <button
          type="button"
          role="tab"
          id="tab-beli-pesanan"
          aria-selected={mode === "pesanan"}
          className={`oas-rak-tab${mode === "pesanan" ? " active" : ""}`}
          onClick={() => handleModeChange("pesanan")}
        >
          <ClipboardList size={14} aria-hidden="true" />
          <span>Pesanan Pembelian</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-beli-langsung"
          aria-selected={mode === "langsung"}
          className={`oas-rak-tab${mode === "langsung" ? " active" : ""}`}
          onClick={() => handleModeChange("langsung")}
        >
          <ShoppingCart size={14} aria-hidden="true" />
          <span>Pembelian Langsung</span>
        </button>
      </div>

      {/* Form Header: Pemasok (terhubung ke Kontak), Tanggal, Nomor */}
      <div className="table-card" style={{ padding: "18px 20px", marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          {/* Pemasok — terhubung ke Kontak */}
          <div className="form-group" ref={pemasokRef} style={{ position: "relative" }}>
            <label htmlFor="beli-pemasok-input">
              Pemasok <span style={{ color: "var(--red)" }}>*</span>
            </label>
            {pemasokId ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  padding: "7px 10px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  minHeight: "40px",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "var(--accent2-tint)",
                    border: "1px solid var(--accent2)",
                    color: "var(--text)",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <Users size={13} style={{ color: "var(--accent2)" }} />
                  {pemasokNama}
                  <button
                    type="button"
                    aria-label="Hapus pilihan pemasok"
                    onClick={() => {
                      setPemasokId("");
                      setPemasokNama("");
                      setPemasokQuery("");
                      setPemasokOpen(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "inline-flex",
                      padding: "1px",
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    syncMaster();
                    setPemasokOpen((o) => !o);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    padding: "4px",
                  }}
                  aria-label="Cari pemasok lain"
                >
                  <Search size={15} />
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  id="beli-pemasok-input"
                  type="text"
                  placeholder="Cari atau pilih pemasok dari Kontak..."
                  value={pemasokQuery}
                  onFocus={() => {
                    syncMaster();
                    setPemasokOpen(true);
                  }}
                  onChange={(e) => {
                    setPemasokQuery(e.target.value);
                    setPemasokOpen(true);
                  }}
                  style={{ paddingRight: "34px" }}
                />
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    right: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--muted)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            )}

            {pemasokOpen ? (
              <div
                role="listbox"
                aria-label="Daftar pemasok dari Kontak"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  maxHeight: "240px",
                  overflowY: "auto",
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  boxShadow: "var(--shadow-overlay)",
                  zIndex: 50,
                  padding: "4px",
                }}
              >
                {pemasokOptions.length === 0 ? (
                  <div
                    style={{
                      padding: "14px 12px",
                      fontSize: "12.5px",
                      color: "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    Belum ada pemasok di Kontak.
                    <div style={{ marginTop: "8px" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setPemasokOpen(false);
                          callOasGlobal("showPage", "kontak");
                        }}
                      >
                        Buka menu Kontak
                      </button>
                    </div>
                  </div>
                ) : (
                  pemasokOptions.map((k) => {
                    const isSup = k.tipe === "supplier" || k.tipe === "keduanya";
                    return (
                      <button
                        key={k.id}
                        type="button"
                        role="option"
                        aria-selected={pemasokId === k.id}
                        onClick={() => {
                          setPemasokId(k.id);
                          setPemasokNama(k.nama);
                          setPemasokQuery("");
                          setPemasokOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "4px",
                          background:
                            pemasokId === k.id ? "var(--accent-tint)" : "transparent",
                          color: "var(--text)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600 }}>
                            {k.nama}
                          </div>
                          {k.telp || k.alamat ? (
                            <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              {[k.telp, k.alamat].filter(Boolean).join(" · ")}
                            </div>
                          ) : null}
                        </div>
                        <span
                          className={`badge ${isSup ? "badge-blue" : "badge-gray"}`}
                          style={{ flexShrink: 0 }}
                        >
                          {k.tipe === "supplier"
                            ? "Pemasok"
                            : k.tipe === "keduanya"
                              ? "Pemasok & Pelanggan"
                              : "Pelanggan"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          {/* Nomor # */}
          <div className="form-group">
            <label htmlFor="beli-nomor-input">
              Nomor # <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="beli-nomor-input"
              type="text"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder={mode === "pesanan" ? "PO-2026-001" : "PB-2026-001"}
              style={{ fontFamily: "var(--mono)" }}
            />
          </div>

          {/* Tanggal — tepat di bawah Pemasok */}
          <div className="form-group">
            <label htmlFor="beli-tgl-input">
              Tanggal <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="beli-tgl-input"
              type="date"
              data-oas-upgraded="native"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          {/* Status Ringkas Metode Pembayaran */}
          <div className="form-group">
            <label>Metode Pembayaran Aktif</label>
            <button
              type="button"
              onClick={() => setCardTab("info")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                width: "100%",
                padding: "9px 12px",
                background: "var(--surface2)",
                border: "1px solid var(--border-strong)",
                borderRadius: "var(--r-control)",
                color: "var(--text)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "var(--sans)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                {metodeBayar === "transfer" ? (
                  <Building2 size={14} style={{ color: "var(--accent2)" }} />
                ) : (
                  <Wallet size={14} style={{ color: "var(--accent-text)" }} />
                )}
                <strong>
                  {metodeBayar === "transfer"
                    ? `Transfer · ${activeAkunBayar ? `${activeAkunBayar.kode} ${activeAkunBayar.nama}` : "Pilih Bank"}`
                    : `Kas · ${activeAkunBayar?.kode || "1101"} ${activeAkunBayar?.nama || "Kas"}`}
                </strong>
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Ubah di Info Lainnya
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Tabel Rincian Barang & Info Lainnya */}
      <div className="table-card" style={{ marginBottom: "16px" }}>
        {/* Header Tab dalam Card (Rincian Barang | Info Lainnya) */}
        <div
          className="table-header"
          style={{
            paddingBottom: 0,
            alignItems: "flex-end",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              id="beli-card-tab-rincian"
              className={`tab${cardTab === "rincian" ? " active" : ""}`}
              onClick={() => setCardTab("rincian")}
              style={{
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <Package size={14} />
              <span>Rincian Barang</span>
              <span className="oas-tab-count">{items.length}</span>
            </button>
            <button
              type="button"
              id="beli-card-tab-info"
              className={`tab${cardTab === "info" ? " active" : ""}`}
              onClick={() => setCardTab("info")}
              style={{
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <Info size={14} />
              <span>Info Lainnya</span>
            </button>
          </div>
        </div>

        {/* TAB 1: RINCIAN BARANG */}
        {cardTab === "rincian" ? (
          <div>
            {/* Search bar Cari/Pilih Barang tepat di atas tabel */}
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                id="btn-cari-pilih-barang"
                onClick={openBarangPicker}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  minWidth: "280px",
                  flex: "0 1 360px",
                  padding: "9px 14px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  color: "var(--muted)",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                  textAlign: "left",
                }}
              >
                <span>Cari/Pilih Barang...</span>
                <Search size={15} style={{ color: "var(--accent-text)", flexShrink: 0 }} />
              </button>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nama Barang</th>
                    <th>Gudang &amp; Rak</th>
                    <th style={{ textAlign: "right" }}>Kuantitas</th>
                    <th>Satuan</th>
                    <th style={{ textAlign: "right" }}>@Harga</th>
                    <th style={{ textAlign: "right" }}>Diskon</th>
                    <th style={{ textAlign: "right" }}>Pajak</th>
                    <th style={{ textAlign: "right" }}>Total Harga</th>
                    <th style={{ textAlign: "right", width: "86px" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          padding: "42px 20px",
                          color: "var(--muted)",
                        }}
                      >
                        Belum ada data barang. Klik <b>Cari/Pilih Barang...</b> di atas untuk menambahkan.
                      </td>
                    </tr>
                  ) : (
                    items.map((line) => (
                      <tr key={line.id}>
                        <td style={{ fontWeight: 600, color: "var(--text)" }}>
                          {line.barangNama}
                        </td>
                        <td style={{ color: "var(--muted)", fontSize: "12.5px" }}>
                          {line.gudangNama} · {line.rakNama}
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {line.qty.toLocaleString("id-ID")}
                        </td>
                        <td style={{ color: "var(--muted)" }}>{line.satuan}</td>
                        <td className="num">{fmtRp(line.harga)}</td>
                        <td className="num" style={{ color: line.diskonTotal > 0 ? "var(--red)" : "var(--muted)" }}>
                          {line.diskonTotal > 0
                            ? `-${fmtRp(line.diskonTotal)}${
                                line.diskonTipe === "persen" ? ` (${line.diskonNilai}%)` : ""
                              }`
                            : "-"}
                        </td>
                        <td className="num" style={{ color: line.pajakTotal > 0 ? "var(--accent2)" : "var(--muted)" }}>
                          {line.pajakTotal > 0
                            ? `${fmtRp(line.pajakTotal)} (${line.pajakPersen}%)`
                            : "-"}
                        </td>
                        <td className="num" style={{ fontWeight: 700, color: "var(--text)" }}>
                          {fmtRp(line.total)}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="oas-icon-dots"
                              onClick={() => handleEditLine(line)}
                              title="Ubah rincian barang"
                              aria-label={`Ubah ${line.barangNama}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="oas-icon-dots"
                              onClick={() =>
                                setItems((prev) => prev.filter((x) => x.id !== line.id))
                              }
                              title="Hapus barang"
                              aria-label={`Hapus ${line.barangNama}`}
                              style={{ color: "var(--red)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ringkasan Total dalam Card */}
            {items.length > 0 ? (
              <div
                style={{
                  padding: "14px 18px",
                  borderTop: "1px solid var(--border)",
                  background: "var(--surface2)",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    minWidth: "280px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                    <span style={{ color: "var(--muted)" }}>Subtotal (setelah diskon)</span>
                    <span className="num">{fmtRp(totals.subtotal)}</span>
                  </div>
                  {totals.totalDiskon > 0 ? (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                      <span style={{ color: "var(--muted)" }}>Total Diskon</span>
                      <span className="num" style={{ color: "var(--red)" }}>
                        -{fmtRp(totals.totalDiskon)}
                      </span>
                    </div>
                  ) : null}
                  {totals.totalPajak > 0 ? (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
                      <span style={{ color: "var(--muted)" }}>Total Pajak (PPN)</span>
                      <span className="num">{fmtRp(totals.totalPajak)}</span>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "20px",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border-strong)",
                      fontSize: "15px",
                      fontWeight: 700,
                    }}
                  >
                    <span>Total Pembelian</span>
                    <span className="num" style={{ color: "var(--accent-text)" }}>
                      {fmtRp(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          /* TAB 2: INFO LAINNYA (Metode Pembayaran Kas / Transfer -> Daftar Bank 1100 + Catatan) */
          <div style={{ padding: "18px 20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "var(--text)",
                }}
              >
                Metode Pembayaran
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  id="btn-bayar-kas"
                  onClick={() => setMetodeBayar("kas")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "var(--r-control)",
                    border: `1px solid ${
                      metodeBayar === "kas" ? "var(--accent-border)" : "var(--border-strong)"
                    }`,
                    background:
                      metodeBayar === "kas" ? "var(--accent-tint)" : "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Wallet
                      size={18}
                      style={{
                        color: metodeBayar === "kas" ? "var(--accent-text)" : "var(--muted)",
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: "13.5px" }}>Kas (Cash)</div>
                  </div>
                  {metodeBayar === "kas" ? (
                    <Check size={16} style={{ color: "var(--accent-text)", flexShrink: 0 }} />
                  ) : null}
                </button>

                <button
                  type="button"
                  id="btn-bayar-transfer"
                  onClick={() => setMetodeBayar("transfer")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "var(--r-control)",
                    border: `1px solid ${
                      metodeBayar === "transfer"
                        ? "var(--accent-border)"
                        : "var(--border-strong)"
                    }`,
                    background:
                      metodeBayar === "transfer"
                        ? "var(--accent-tint)"
                        : "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <CreditCard
                      size={18}
                      style={{
                        color:
                          metodeBayar === "transfer" ? "var(--accent-text)" : "var(--muted)",
                      }}
                    />
                    <div style={{ fontWeight: 700, fontSize: "13.5px" }}>Transfer Bank</div>
                  </div>
                  {metodeBayar === "transfer" ? (
                    <Check size={16} style={{ color: "var(--accent-text)", flexShrink: 0 }} />
                  ) : null}
                </button>
              </div>
            </div>

            {metodeBayar === "transfer" ? (
              <div className="form-group" style={{ marginBottom: "16px", maxWidth: "420px" }}>
                <label htmlFor="beli-bank-select">
                  Pilih Bank (Akun COA 1100) <span style={{ color: "var(--red)" }}>*</span>
                </label>
                {bankAccounts.length === 0 ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--r-control)",
                      border: "1px solid var(--border)",
                      background: "var(--surface2)",
                      fontSize: "12.5px",
                      color: "var(--muted)",
                    }}
                  >
                    Tidak ada akun bank di grup 1100. Tambahkan akun bank di{" "}
                    <b>Chart of Accounts</b> terlebih dahulu.
                  </div>
                ) : (
                  <select
                    id="beli-bank-select"
                    value={akunBankKode}
                    onChange={(e) => setAkunBankKode(e.target.value)}
                  >
                    {bankAccounts.map((a) => (
                      <option key={a.kode} value={a.kode}>
                        {a.kode} {a.nama}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: "16px", maxWidth: "420px" }}>
                <label htmlFor="beli-kas-select">Akun Kas (COA 1100)</label>
                <select
                  id="beli-kas-select"
                  value={akunKasKode}
                  onChange={(e) => setAkunKasKode(e.target.value)}
                >
                  {kasAccounts.map((a) => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} {a.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ maxWidth: "600px" }}>
              <label htmlFor="beli-catatan-input">Catatan / Keterangan (opsional)</label>
              <textarea
                id="beli-catatan-input"
                rows={3}
                placeholder="Contoh: Pengiriman bertahap, syarat pembayaran, catatan untuk pemasok..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Aksi Simpan */}
      <div
        className="table-card"
        style={{
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>
            {items.length} item ·{" "}
            {metodeBayar === "transfer"
              ? `Transfer (${activeAkunBayar ? `${activeAkunBayar.kode} ${activeAkunBayar.nama}` : "-"})`
              : `Kas (${activeAkunBayar?.kode || "1101"} ${activeAkunBayar?.nama || "Kas"})`}
          </span>
          <span
            className="num"
            style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}
          >
            {fmtRp(totals.grandTotal)}
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            id="btn-simpan-pembelian-utama"
            className="btn btn-primary"
            onClick={handleSimpan}
          >
            {mode === "pesanan" ? (
              <>
                <ClipboardList size={15} /> Simpan Pesanan Pembelian
              </>
            ) : (
              <>
                <ShoppingCart size={15} /> Simpan Pembelian Langsung
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL 1: Pilih Gudang -> Daftar Barang Terkelompok Berdasarkan Rak */}
      <OasModalDialog
        id="modal-picker-barang-beli"
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        maxWidth="560px"
        title={
          pickerGudang ? (
            <>
              Pilih Barang{" "}
              <span className="oas-ctx-highlight">{pickerGudang.nama}</span>
            </>
          ) : (
            "Pilih Gudang Tujuan"
          )
        }
        footer={
          pickerGudang ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPickerGudangId(null);
                setPickerSearch("");
              }}
            >
              <ChevronLeft size={14} /> Kembali ke Daftar Gudang
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPickerOpen(false)}
            >
              Tutup
            </button>
          )
        }
      >
        {!pickerGudang ? (
          /* Langkah 1: Pilih Gudang terlebih dahulu */
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "4px" }}>
              Pilih gudang terlebih dahulu untuk melihat daftar barang per rak:
            </div>
            {gudangList.map((g) => {
              const itemCnt = Object.keys(g.kategori || {}).length;
              const rakCnt = Array.isArray(g.rakList) ? g.rakList.length : 0;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setPickerGudangId(g.id);
                    setPickerSearch("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "var(--r-control)",
                    border: "1px solid var(--border-strong)",
                    background: "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Warehouse size={16} style={{ color: "var(--accent-text)" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{g.nama}</div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {itemCnt} kategori barang · {rakCnt} rak
                        {g.lokasi ? ` · ${g.lokasi}` : ""}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={15} style={{ color: "var(--muted)" }} />
                </button>
              );
            })}
          </div>
        ) : (
          /* Langkah 2: Daftar Barang terkelompokkan berdasarkan Rak dengan pembatas kelompok */
          <div>
            <div style={{ marginBottom: "12px" }}>
              <input
                type="text"
                placeholder={`Cari barang di ${pickerGudang.nama}...`}
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
            </div>

            {pickerGroupedByRak.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "28px 16px",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                {pickerSearch.trim()
                  ? "Barang tidak ditemukan."
                  : `Gudang "${pickerGudang.nama}" belum punya kategori barang. Tambahkan dulu di menu Persediaan (⋮ pada kartu rak → Tambah kategori barang).`}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {pickerGroupedByRak.map((group) => (
                  <div key={group.rakId || "__none__"}>
                    {/* Pembatas kelompok Rak */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                        paddingBottom: "5px",
                        borderBottom: "1px solid var(--border-strong)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: "var(--accent-text)",
                          letterSpacing: "0.02em",
                        }}
                      >
                        {group.rakNama}
                      </span>
                      <span className="oas-tab-count">{group.items.length}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {group.items.map((ref) => (
                        <button
                          key={ref.barang.id}
                          type="button"
                          onClick={() => handleSelectBarangFromPicker(ref)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "var(--r-control)",
                            border: "1px solid var(--border)",
                            background: "var(--surface2)",
                            color: "var(--text)",
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "var(--sans)",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                              {ref.barang.nama}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                              Stok saat ini: {ref.stokSaatIni.toLocaleString("id-ID")}{" "}
                              {ref.barang.satuan || "unit"}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div className="num" style={{ fontSize: "12.5px", fontWeight: 600 }}>
                              {ref.hppLast > 0 ? fmtRp(ref.hppLast) : "-"}
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              HPP terakhir
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </OasModalDialog>

      {/* MODAL 2: Input Jumlah, Harga, Diskon, Pajak -> Lanjut ke Tabel */}
      <OasModalDialog
        id="modal-detail-barang-beli"
        open={itemModal.open}
        onClose={() => setItemModal((prev) => ({ ...prev, open: false }))}
        maxWidth="460px"
        title={
          itemModal.refItem
            ? itemModal.refItem.barang.nama
            : "Detail Barang Pembelian"
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setItemModal((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-lanjut-item-beli"
              className="btn btn-primary"
              onClick={handleConfirmItemModal}
            >
              Lanjut
            </button>
          </>
        }
      >
        {itemModal.refItem ? (
          <div>
            <div
              style={{
                padding: "9px 12px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                marginBottom: "14px",
                fontSize: "12.5px",
                color: "var(--muted)",
              }}
            >
              {itemModal.refItem.gudangNama} · {itemModal.refItem.rakNama} · Satuan:{" "}
              <b style={{ color: "var(--text)" }}>
                {itemModal.refItem.barang.satuan || "unit"}
              </b>
            </div>

            <div className="form-row" style={{ marginBottom: "12px" }}>
              <div className="form-group">
                <label htmlFor="item-beli-qty">
                  Jumlah ({itemModal.refItem.barang.satuan || "unit"})
                </label>
                <input
                  id="item-beli-qty"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={itemModal.qty}
                  onChange={(e) =>
                    setItemModal((prev) => ({ ...prev, qty: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="item-beli-harga">@Harga Satuan (Rp)</label>
                <input
                  id="item-beli-harga"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="Contoh: 50000"
                  value={itemModal.harga}
                  onChange={(e) =>
                    setItemModal((prev) => ({ ...prev, harga: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: "14px" }}>
              <div className="form-group">
                <label htmlFor="item-beli-diskon">Diskon (opsional)</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <select
                    aria-label="Tipe diskon"
                    value={itemModal.diskonTipe}
                    onChange={(e) =>
                      setItemModal((prev) => ({
                        ...prev,
                        diskonTipe: e.target.value === "nominal" ? "nominal" : "persen",
                      }))
                    }
                    style={{ width: "74px", flexShrink: 0 }}
                  >
                    <option value="persen">%</option>
                    <option value="nominal">Rp</option>
                  </select>
                  <input
                    id="item-beli-diskon"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={itemModal.diskonNilai}
                    onChange={(e) =>
                      setItemModal((prev) => ({
                        ...prev,
                        diskonNilai: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="item-beli-pajak">Pajak / PPN (%)</label>
                <select
                  id="item-beli-pajak"
                  value={itemModal.pajakPersen}
                  onChange={(e) =>
                    setItemModal((prev) => ({
                      ...prev,
                      pajakPersen: e.target.value,
                    }))
                  }
                >
                  <option value="0">Tanpa pajak (0%)</option>
                  <option value="11">PPN 11%</option>
                  <option value="12">PPN 12%</option>
                </select>
              </div>
            </div>

            {/* Ringkasan kalkulasi baris */}
            <div
              style={{
                padding: "11px 13px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                fontSize: "12.5px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Bruto</span>
                <span className="num">{fmtRp(itemModalCalc.bruto)}</span>
              </div>
              {itemModalCalc.diskonTotal > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Diskon</span>
                  <span className="num" style={{ color: "var(--red)" }}>
                    -{fmtRp(itemModalCalc.diskonTotal)}
                  </span>
                </div>
              ) : null}
              {itemModalCalc.pajakTotal > 0 ? (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>
                    Pajak ({itemModal.pajakPersen}%)
                  </span>
                  <span className="num">{fmtRp(itemModalCalc.pajakTotal)}</span>
                </div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "6px",
                  borderTop: "1px solid var(--border-strong)",
                  fontWeight: 700,
                  fontSize: "14px",
                }}
              >
                <span>Total Baris</span>
                <span className="num" style={{ color: "var(--accent-text)" }}>
                  {fmtRp(itemModalCalc.total)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </OasModalDialog>
    </div>
  );
}
