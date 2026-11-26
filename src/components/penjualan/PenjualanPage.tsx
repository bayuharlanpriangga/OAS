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
  Receipt,
  Search,
  Trash2,
  Truck,
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
  readProdukList,
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
  hitungItemPembelian,
  readAkunBank1100,
  readAkunKas1100,
  todayIsoLocal,
  type ItemPembelianLine,
  type MetodeBayarBeli,
} from "@/lib/pembelian/pesanan-pembelian";
import {
  buatPesananPenjualanStore,
  generateNomorPenjualan,
  simpanPenjualanLangsungStore,
} from "@/lib/penjualan/pesanan-penjualan";
import {
  readPengirimanList,
  type PengirimanRecord,
} from "@/lib/perusahaan/pengiriman";
import type { Akun, Kontak } from "@/types";

type JualMode = "pesanan" | "langsung";
type CardTab = "rincian" | "info";

interface PickedJualItemRef {
  gudangId: string;
  gudangNama: string;
  rakId: string;
  rakNama: string;
  barang: KsKategori;
  hargaJualDefault: number;
  ppnDefault: number;
  stokSaatIni: number;
}

export default function PenjualanPage() {
  const [mode, setMode] = useState<JualMode>("pesanan");
  const [cardTab, setCardTab] = useState<CardTab>("rincian");
  const [kontakList, setKontakList] = useState<Kontak[]>([]);
  const [gudangList, setGudangList] = useState<KsCard[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [pengirimanList, setPengirimanList] = useState<PengirimanRecord[]>([]);

  // Header
  const [pelangganId, setPelangganId] = useState("");
  const [pelangganNama, setPelangganNama] = useState("");
  const [pelangganQuery, setPelangganQuery] = useState("");
  const [pelangganOpen, setPelangganOpen] = useState(false);
  const pelangganRef = useRef<HTMLDivElement | null>(null);

  const [tanggal, setTanggal] = useState("");
  const [nomor, setNomor] = useState("");
  const [items, setItems] = useState<ItemPembelianLine[]>([]);

  // Info Lainnya (pembayaran + pengiriman khusus Pesanan Penjualan)
  const [metodeBayar, setMetodeBayar] = useState<MetodeBayarBeli>("kas");
  const [akunKasKode, setAkunKasKode] = useState("1101");
  const [akunBankKode, setAkunBankKode] = useState("");
  const [pengirimanId, setPengirimanId] = useState("");
  const [noResi, setNoResi] = useState("");
  const [catatan, setCatatan] = useState("");

  // Picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerGudangId, setPickerGudangId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  // Modal item
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    editLineId: string | null;
    refItem: PickedJualItemRef | null;
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
    const ships = readPengirimanList();
    setKontakList([...readKontakList()]);
    setGudangList(Object.values(readMksMap()));
    setAkuns(nextAkuns);
    setPengirimanList(ships);
    setAkunKasKode((prev) =>
      prev && kasList.some((a) => a.kode === prev) ? prev : kasList[0]?.kode || "1101"
    );
    setAkunBankKode((prev) =>
      prev && banks.some((a) => a.kode === prev) ? prev : banks[0]?.kode || ""
    );
    setPengirimanId((prev) =>
      prev && ships.some((s) => s.id === prev) ? prev : ships[0]?.id || ""
    );
  }, []);

  useEffect(() => {
    syncMaster();
    setTanggal((prev) => prev || todayIsoLocal());
    setNomor((prev) => prev || generateNomorPenjualan("SO"));
    setOasWindowFn("renderPenjualanPage", syncMaster as (...args: never[]) => unknown);
    setOasWindowFn(
      "openPenjualanTab",
      ((tab: JualMode) => {
        if (tab === "pesanan" || tab === "langsung") {
          setMode(tab);
          setNomor(generateNomorPenjualan(tab === "pesanan" ? "SO" : "PJ"));
          syncMaster();
        }
      }) as (...args: never[]) => unknown
    );
  }, [syncMaster]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pelangganRef.current && !pelangganRef.current.contains(e.target as Node)) {
        setPelangganOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleModeChange = (nextMode: JualMode) => {
    setMode(nextMode);
    setNomor(generateNomorPenjualan(nextMode === "pesanan" ? "SO" : "PJ"));
  };

  const pelangganOptions = useMemo(() => {
    const q = pelangganQuery.trim().toLowerCase();
    const sorted = [...kontakList].sort((a, b) => {
      const aPel = a.tipe === "pelanggan" || a.tipe === "keduanya" ? 0 : 1;
      const bPel = b.tipe === "pelanggan" || b.tipe === "keduanya" ? 0 : 1;
      if (aPel !== bPel) return aPel - bPel;
      return a.nama.localeCompare(b.nama, "id");
    });
    if (!q) return sorted;
    return sorted.filter(
      (k) =>
        k.nama.toLowerCase().includes(q) ||
        (k.telp || "").toLowerCase().includes(q)
    );
  }, [kontakList, pelangganQuery]);

  const kasAccounts = useMemo(() => readAkunKas1100(akuns), [akuns]);
  const bankAccounts = useMemo(() => readAkunBank1100(akuns), [akuns]);

  const activeAkunBayar = useMemo(() => {
    if (metodeBayar === "transfer") {
      return bankAccounts.find((a) => a.kode === akunBankKode) || bankAccounts[0] || null;
    }
    return (
      kasAccounts.find((a) => a.kode === akunKasKode) ||
      kasAccounts[0] || { kode: "1101", nama: "Kas", tipe: "Aset", kat: "Lancar", normal: "D" }
    );
  }, [akunBankKode, akunKasKode, bankAccounts, kasAccounts, metodeBayar]);

  const activePengiriman = useMemo(
    () => pengirimanList.find((s) => s.id === pengirimanId) || null,
    [pengirimanId, pengirimanList]
  );

  const pickerGudang = useMemo(
    () => gudangList.find((g) => g.id === pickerGudangId) || null,
    [gudangList, pickerGudangId]
  );

  const pickerGroupedByRak = useMemo(() => {
    if (!pickerGudang) return [];
    const q = pickerSearch.trim().toLowerCase();
    const produkList = readProdukList();
    const raks = Array.isArray(pickerGudang.rakList) ? pickerGudang.rakList : [];
    const validRakIds = new Set(raks.map((r) => r.id));

    const toRef = (
      barang: KsKategori,
      rakId: string,
      rakNama: string
    ): PickedJualItemRef => {
      const saldo = hitungSaldoKat(barang);
      const ov = produkList.find((p) => p.ksId === barang.id);
      return {
        gudangId: pickerGudang.id,
        gudangNama: pickerGudang.nama,
        rakId,
        rakNama,
        barang,
        hargaJualDefault: ov?.hargaJual || 0,
        ppnDefault: ov?.ppn != null && ov.ppn > 0 ? ov.ppn : 0,
        stokSaatIni: saldo.totalQty,
      };
    };

    const allItems = Object.values(pickerGudang.kategori || {})
      .filter((b) => !q || b.nama.toLowerCase().includes(q))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    const groups: Array<{
      rakId: string;
      rakNama: string;
      items: PickedJualItemRef[];
    }> = [];

    raks.forEach((rak) => {
      const matched = allItems
        .filter((b) => b.rakId === rak.id)
        .map((b) => toRef(b, rak.id, rak.nama));
      if (matched.length > 0) {
        groups.push({ rakId: rak.id, rakNama: rak.nama, items: matched });
      }
    });

    const ungrouped = allItems
      .filter((b) => !b.rakId || !validRakIds.has(b.rakId))
      .map((b) => toRef(b, "", "Tanpa rak"));
    if (ungrouped.length > 0) {
      groups.push({ rakId: "", rakNama: "Tanpa rak", items: ungrouped });
    }
    return groups;
  }, [pickerGudang, pickerSearch]);

  const handleSelectBarang = (ref: PickedJualItemRef) => {
    if (ref.stokSaatIni <= 0) {
      callOasGlobal("showAlert", `Stok "${ref.barang.nama}" di ${ref.gudangNama} sedang kosong.`);
      return;
    }
    setPickerOpen(false);
    setItemModal({
      open: true,
      editLineId: null,
      refItem: ref,
      qty: "1",
      harga: ref.hargaJualDefault > 0 ? String(ref.hargaJualDefault) : "",
      diskonTipe: "persen",
      diskonNilai: "0",
      pajakPersen: String(ref.ppnDefault || 0),
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
        hargaJualDefault: line.harga,
        ppnDefault: line.pajakPersen,
        stokSaatIni: saldo?.totalQty || line.qty,
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

  const handleConfirmItem = () => {
    const ref = itemModal.refItem;
    if (!ref) return;
    const qty = parseFloat(itemModal.qty) || 0;
    const harga = parseFloat(itemModal.harga) || 0;
    if (!(qty > 0)) {
      callOasGlobal("showAlert", "Jumlah barang harus lebih dari 0.");
      return;
    }
    if (qty > ref.stokSaatIni) {
      callOasGlobal(
        "showAlert",
        `Stok "${ref.barang.nama}" tidak cukup (tersedia ${ref.stokSaatIni} ${ref.barang.satuan || "unit"}).`
      );
      return;
    }
    if (!(harga > 0)) {
      callOasGlobal("showAlert", "Isi harga jual terlebih dahulu.");
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
        "jline_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
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
    setPelangganId("");
    setPelangganNama("");
    setPelangganQuery("");
    setTanggal(todayIsoLocal());
    setNomor(generateNomorPenjualan(mode === "pesanan" ? "SO" : "PJ"));
    setItems([]);
    setNoResi("");
    setCatatan("");
    setCardTab("rincian");
  };

  const handleSimpan = () => {
    if (callOasGlobal("guardHanyaBaca", "Penjualan")) return;
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
      callOasGlobal("showAlert", "Pilih akun bank (1100) terlebih dahulu.");
      return;
    }

    const docNo =
      nomor.trim() || generateNomorPenjualan(mode === "pesanan" ? "SO" : "PJ");
    const payload = {
      nomor: docNo,
      tanggal,
      pelangganId,
      pelangganNama: pelangganNama.trim(),
      metodeBayar,
      akunBayarKode: activeAkunBayar?.kode || "1101",
      akunBayarNama: activeAkunBayar?.nama || "Kas",
      pengirimanId: mode === "pesanan" ? activePengiriman?.id || "" : "",
      pengirimanNama: mode === "pesanan" ? activePengiriman?.nama || "" : "",
      noResi: mode === "pesanan" ? noResi : "",
      catatan,
      items,
    };

    if (mode === "pesanan") {
      if (!activePengiriman) {
        callOasGlobal(
          "showAlert",
          "Pilih jasa pengiriman di tab Info Lainnya terlebih dahulu."
        );
        setCardTab("info");
        return;
      }
      const res = buatPesananPenjualanStore(payload);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      handleReset();
      syncMaster();
      callOasGlobal(
        "showAlert",
        `Pesanan Penjualan ${docNo} tersimpan dan masuk ke daftar Dikemas.`
      );
    } else {
      const res = simpanPenjualanLangsungStore(payload);
      if (!res.ok) {
        callOasGlobal("showAlert", res.pesan);
        return;
      }
      handleReset();
      syncMaster();
      callOasGlobal(
        "showAlert",
        `Penjualan Langsung ${docNo} berhasil disimpan. Stok gudang & jurnal diperbarui.`
      );
    }
  };

  return (
    <div className="page" id="page-penjualan" data-react-managed="1">
      {/* Tab Kategori: Pesanan Penjualan vs Penjualan Langsung */}
      <div
        role="tablist"
        aria-label="Kategori penjualan"
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}
      >
        <button
          type="button"
          role="tab"
          id="tab-jual-pesanan"
          aria-selected={mode === "pesanan"}
          className={`oas-rak-tab${mode === "pesanan" ? " active" : ""}`}
          onClick={() => handleModeChange("pesanan")}
        >
          <ClipboardList size={14} aria-hidden="true" />
          <span>Pesanan Penjualan</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-jual-langsung"
          aria-selected={mode === "langsung"}
          className={`oas-rak-tab${mode === "langsung" ? " active" : ""}`}
          onClick={() => handleModeChange("langsung")}
        >
          <Receipt size={14} aria-hidden="true" />
          <span>Penjualan Langsung</span>
        </button>
      </div>

      {/* Form Header: Pelanggan (Kontak), Tanggal, Nomor */}
      <div className="table-card" style={{ padding: "18px 20px", marginBottom: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <div className="form-group" ref={pelangganRef} style={{ position: "relative" }}>
            <label htmlFor="jual-pelanggan-input">Pelanggan</label>
            {pelangganId ? (
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
                  {pelangganNama}
                  <button
                    type="button"
                    aria-label="Hapus pilihan pelanggan"
                    onClick={() => {
                      setPelangganId("");
                      setPelangganNama("");
                      setPelangganQuery("");
                      setPelangganOpen(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "inline-flex",
                    }}
                  >
                    <X size={13} />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    syncMaster();
                    setPelangganOpen((o) => !o);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    padding: "4px",
                  }}
                  aria-label="Cari pelanggan lain"
                >
                  <Search size={15} />
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  id="jual-pelanggan-input"
                  type="text"
                  placeholder="Cari atau pilih pelanggan dari Kontak..."
                  value={pelangganQuery}
                  onFocus={() => {
                    syncMaster();
                    setPelangganOpen(true);
                  }}
                  onChange={(e) => {
                    setPelangganQuery(e.target.value);
                    setPelangganOpen(true);
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

            {pelangganOpen ? (
              <div
                role="listbox"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  maxHeight: "220px",
                  overflowY: "auto",
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  boxShadow: "var(--shadow-overlay)",
                  zIndex: 50,
                  padding: "4px",
                }}
              >
                {pelangganOptions.length === 0 ? (
                  <div
                    style={{
                      padding: "12px",
                      fontSize: "12.5px",
                      color: "var(--muted)",
                      textAlign: "center",
                    }}
                  >
                    Belum ada pelanggan di Kontak.
                  </div>
                ) : (
                  pelangganOptions.map((k) => {
                    const isPel = k.tipe === "pelanggan" || k.tipe === "keduanya";
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setPelangganId(k.id);
                          setPelangganNama(k.nama);
                          setPelangganQuery("");
                          setPelangganOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "4px",
                          background:
                            pelangganId === k.id ? "var(--accent-tint)" : "transparent",
                          color: "var(--text)",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: 600 }}>{k.nama}</span>
                        <span className={`badge ${isPel ? "badge-blue" : "badge-gray"}`}>
                          {k.tipe === "pelanggan"
                            ? "Pelanggan"
                            : k.tipe === "keduanya"
                              ? "Pelanggan & Pemasok"
                              : "Pemasok"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}
          </div>

          <div className="form-group">
            <label htmlFor="jual-nomor-input">
              Nomor # <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="jual-nomor-input"
              type="text"
              value={nomor}
              onChange={(e) => setNomor(e.target.value)}
              placeholder={mode === "pesanan" ? "SO-2026-001" : "PJ-2026-001"}
              style={{ fontFamily: "var(--mono)" }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="jual-tgl-input">
              Tanggal <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              id="jual-tgl-input"
              type="date"
              data-oas-upgraded="native"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Info Pembayaran{mode === "pesanan" ? " & Pengiriman" : ""}</label>
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
                {mode === "pesanan" ? (
                  <span className="oas-ctx-highlight">
                    {activePengiriman ? activePengiriman.nama : "Pilih pengiriman"}
                  </span>
                ) : null}
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)", flexShrink: 0 }}>
                Info Lainnya
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Rincian Barang & Info Lainnya */}
      <div className="table-card" style={{ marginBottom: "16px" }}>
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
              id="jual-card-tab-rincian"
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
              id="jual-card-tab-info"
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

        {cardTab === "rincian" ? (
          <div>
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                id="btn-cari-pilih-barang-jual"
                onClick={() => {
                  syncMaster();
                  setPickerGudangId(null);
                  setPickerSearch("");
                  setPickerOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  minWidth: "280px",
                  maxWidth: "360px",
                  width: "100%",
                  padding: "9px 14px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  color: "var(--muted)",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                }}
              >
                <span>Cari/Pilih Barang...</span>
                <Search size={15} style={{ color: "var(--accent-text)" }} />
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
                        <td style={{ fontWeight: 600 }}>{line.barangNama}</td>
                        <td style={{ color: "var(--muted)", fontSize: "12.5px" }}>
                          {line.gudangNama} · {line.rakNama}
                        </td>
                        <td className="num" style={{ fontWeight: 600 }}>
                          {line.qty.toLocaleString("id-ID")}
                        </td>
                        <td style={{ color: "var(--muted)" }}>{line.satuan}</td>
                        <td className="num">{fmtRp(line.harga)}</td>
                        <td className="num">
                          {line.diskonTotal > 0 ? `-${fmtRp(line.diskonTotal)}` : "-"}
                        </td>
                        <td className="num">
                          {line.pajakTotal > 0 ? fmtRp(line.pajakTotal) : "-"}
                        </td>
                        <td className="num" style={{ fontWeight: 700 }}>
                          {fmtRp(line.total)}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "4px" }}>
                            <button
                              type="button"
                              className="oas-icon-dots"
                              onClick={() => handleEditLine(line)}
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
                              style={{ color: "var(--red)" }}
                              aria-label={`Hapus ${line.barangNama}`}
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
                    <span>Total Penjualan</span>
                    <span className="num" style={{ color: "var(--accent-text)" }}>
                      {fmtRp(totals.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
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
                  id="btn-jual-bayar-kas"
                  onClick={() => setMetodeBayar("kas")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "var(--r-control)",
                    border: `1px solid ${
                      metodeBayar === "kas" ? "var(--accent-border)" : "var(--border-strong)"
                    }`,
                    background:
                      metodeBayar === "kas" ? "var(--accent-tint)" : "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <Wallet
                      size={17}
                      style={{
                        color: metodeBayar === "kas" ? "var(--accent-text)" : "var(--muted)",
                      }}
                    />
                    <strong>Kas (Cash)</strong>
                  </span>
                  {metodeBayar === "kas" ? (
                    <Check size={16} style={{ color: "var(--accent-text)" }} />
                  ) : null}
                </button>
                <button
                  type="button"
                  id="btn-jual-bayar-transfer"
                  onClick={() => setMetodeBayar("transfer")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "var(--r-control)",
                    border: `1px solid ${
                      metodeBayar === "transfer"
                        ? "var(--accent-border)"
                        : "var(--border-strong)"
                    }`,
                    background:
                      metodeBayar === "transfer" ? "var(--accent-tint)" : "var(--surface2)",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                    <CreditCard
                      size={17}
                      style={{
                        color:
                          metodeBayar === "transfer" ? "var(--accent-text)" : "var(--muted)",
                      }}
                    />
                    <strong>Transfer Bank</strong>
                  </span>
                  {metodeBayar === "transfer" ? (
                    <Check size={16} style={{ color: "var(--accent-text)" }} />
                  ) : null}
                </button>
              </div>
            </div>

            {metodeBayar === "transfer" ? (
              <div className="form-group" style={{ marginBottom: "16px", maxWidth: "420px" }}>
                <label htmlFor="jual-bank-select">Pilih Bank (Akun COA 1100)</label>
                <select
                  id="jual-bank-select"
                  value={akunBankKode}
                  onChange={(e) => setAkunBankKode(e.target.value)}
                >
                  {bankAccounts.map((a) => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} {a.nama}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: "16px", maxWidth: "420px" }}>
                <label htmlFor="jual-kas-select">Akun Kas (COA 1100)</label>
                <select
                  id="jual-kas-select"
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

            {/* Pengiriman HANYA muncul pada Pesanan Penjualan (Penjualan Langsung offline tanpa pengiriman) */}
            {mode === "pesanan" ? (
              <div
                id="jual-pengiriman-section"
                style={{
                  paddingTop: "14px",
                  marginBottom: "16px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    fontSize: "13px",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: "var(--text)",
                  }}
                >
                  <Truck size={15} style={{ color: "var(--accent-text)" }} />
                  Pengiriman
                </div>

                {pengirimanList.length === 0 ? (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "var(--r-control)",
                      border: "1px solid var(--border-strong)",
                      background: "var(--surface2)",
                      fontSize: "13px",
                      color: "var(--muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      maxWidth: "560px",
                    }}
                  >
                    <span>Belum ada kategori pengiriman (seperti JNT atau JNE).</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => callOasGlobal("showPage", "pengiriman")}
                    >
                      Buka Pengiriman
                    </button>
                  </div>
                ) : (
                  <div className="form-row" style={{ maxWidth: "600px" }}>
                    <div className="form-group">
                      <label htmlFor="jual-pengiriman-select">
                        Jasa Pengiriman <span style={{ color: "var(--red)" }}>*</span>
                      </label>
                      <select
                        id="jual-pengiriman-select"
                        value={pengirimanId}
                        onChange={(e) => setPengirimanId(e.target.value)}
                      >
                        {pengirimanList.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nama}
                            {s.kota ? ` (${s.kota})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="jual-no-resi">No. Resi (opsional)</label>
                      <input
                        id="jual-no-resi"
                        type="text"
                        placeholder="Bisa diisi saat dikirim"
                        value={noResi}
                        onChange={(e) => setNoResi(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="form-group" style={{ maxWidth: "600px" }}>
              <label htmlFor="jual-catatan-input">Catatan (opsional)</label>
              <textarea
                id="jual-catatan-input"
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Simpan */}
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
            {mode === "pesanan" && activePengiriman
              ? ` · ${activePengiriman.nama}`
              : ""}
          </span>
          <span className="num" style={{ fontSize: "16px", fontWeight: 700 }}>
            {fmtRp(totals.grandTotal)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button type="button" className="btn btn-ghost" onClick={handleReset}>
            Reset
          </button>
          <button
            type="button"
            id="btn-simpan-penjualan-utama"
            className="btn btn-primary"
            onClick={handleSimpan}
          >
            {mode === "pesanan" ? (
              <>
                <ClipboardList size={15} /> Simpan Pesanan Penjualan
              </>
            ) : (
              <>
                <Receipt size={15} /> Simpan Penjualan Langsung
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Picker Gudang -> Rak */}
      <OasModalDialog
        id="modal-picker-barang-jual"
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
            "Pilih Gudang"
          )
        }
        footer={
          pickerGudang ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPickerGudangId(null)}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {gudangList.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setPickerGudangId(g.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "var(--r-control)",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface2)",
                  color: "var(--text)",
                  cursor: "pointer",
                  fontFamily: "var(--sans)",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                  <Warehouse size={16} style={{ color: "var(--accent-text)" }} />
                  <strong>{g.nama}</strong>
                </span>
                <ChevronRight size={15} style={{ color: "var(--muted)" }} />
              </button>
            ))}
          </div>
        ) : (
          <div>
            <input
              type="text"
              placeholder={`Cari barang di ${pickerGudang.nama}...`}
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              style={{ marginBottom: "12px" }}
              autoFocus
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "340px", overflowY: "auto" }}>
              {pickerGroupedByRak.map((group) => (
                <div key={group.rakId || "__none__"}>
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
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-text)" }}>
                      {group.rakNama}
                    </span>
                    <span className="oas-tab-count">{group.items.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {group.items.map((ref) => (
                      <button
                        key={ref.barang.id}
                        type="button"
                        disabled={ref.stokSaatIni <= 0}
                        onClick={() => handleSelectBarang(ref)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "9px 12px",
                          borderRadius: "var(--r-control)",
                          border: "1px solid var(--border)",
                          background: "var(--surface2)",
                          color: ref.stokSaatIni > 0 ? "var(--text)" : "var(--muted)",
                          opacity: ref.stokSaatIni > 0 ? 1 : 0.55,
                          cursor: ref.stokSaatIni > 0 ? "pointer" : "not-allowed",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 600 }}>{ref.barang.nama}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Stok: {ref.stokSaatIni} {ref.barang.satuan || "unit"}
                          </div>
                        </div>
                        <div className="num" style={{ fontWeight: 600 }}>
                          {ref.hargaJualDefault > 0 ? fmtRp(ref.hargaJualDefault) : "-"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </OasModalDialog>

      {/* Modal Detail Barang Penjualan */}
      <OasModalDialog
        id="modal-detail-barang-jual"
        open={itemModal.open}
        onClose={() => setItemModal((prev) => ({ ...prev, open: false }))}
        maxWidth="460px"
        title={itemModal.refItem ? itemModal.refItem.barang.nama : "Detail Barang"}
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
              id="btn-lanjut-item-jual"
              className="btn btn-primary"
              onClick={handleConfirmItem}
            >
              Lanjut
            </button>
          </>
        }
      >
        {itemModal.refItem ? (
          <div>
            <div className="form-row" style={{ marginBottom: "12px" }}>
              <div className="form-group">
                <label>Jumlah (maks. {itemModal.refItem.stokSaatIni})</label>
                <input
                  id="item-jual-qty"
                  type="number"
                  min="1"
                  max={itemModal.refItem.stokSaatIni}
                  value={itemModal.qty}
                  onChange={(e) =>
                    setItemModal((prev) => ({ ...prev, qty: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>@Harga Jual (Rp)</label>
                <input
                  id="item-jual-harga"
                  type="number"
                  min="0"
                  value={itemModal.harga}
                  onChange={(e) =>
                    setItemModal((prev) => ({ ...prev, harga: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-row" style={{ marginBottom: "12px" }}>
              <div className="form-group">
                <label>Diskon</label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <select
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
                    id="item-jual-diskon"
                    type="number"
                    min="0"
                    value={itemModal.diskonNilai}
                    onChange={(e) =>
                      setItemModal((prev) => ({ ...prev, diskonNilai: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Pajak / PPN (%)</label>
                <select
                  id="item-jual-pajak"
                  value={itemModal.pajakPersen}
                  onChange={(e) =>
                    setItemModal((prev) => ({ ...prev, pajakPersen: e.target.value }))
                  }
                >
                  <option value="0">Tanpa pajak (0%)</option>
                  <option value="11">PPN 11%</option>
                  <option value="12">PPN 12%</option>
                </select>
              </div>
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-control)",
                background: "var(--surface2)",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
              }}
            >
              <span>Total Baris</span>
              <span className="num" style={{ color: "var(--accent-text)" }}>
                {fmtRp(itemModalCalc.total)}
              </span>
            </div>
          </div>
        ) : null}
      </OasModalDialog>
    </div>
  );
}
