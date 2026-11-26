"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  History,
  MoreVertical,
  Package,
  PackagePlus,
  Pencil,
  Trash2,
  Warehouse,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtDate, fmtRp } from "@/lib/shared/format";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
import {
  callOasGlobal,
  getLegacyKsStore,
  readProdukList,
  setOasWindowFn,
  writeProdukList,
} from "@/lib/shared/legacy-store";
import {
  ensureBarangInGudangStore,
  hitungSaldoKat,
  initMultiKartuStockStore,
  readMksMap,
  readTransferLogs,
  saveMksStore,
  transferBarangAntarGudangStore,
  writeMksMap,
  type GudangRak,
  type KsCard,
  type KsEntry,
  type KsKategori,
  type TransferGudangLog,
} from "@/lib/kalkulator/persediaan/kartu-stock";
import type { Produk } from "@/types";

interface LegacyWindowExt {
  showPage?: (page: string) => void;
  openTransaksiTab?: (tab: string) => void;
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardHanyaBaca?: (modul: string) => boolean;
  isReadOnly?: () => boolean;
  auditLog?: (action: string, modul: string, detail: string) => void;
}

function getWin(): LegacyWindowExt {
  return (typeof window !== "undefined" ? window : {}) as unknown as LegacyWindowExt;
}

interface BarangRow {
  gudangId: string;
  rakId: string;
  barang: KsKategori;
  qty: number;
  hppRata: number;
  nilai: number;
  hargaJual: number;
  ppn: number | null;
  ppnInclusive: boolean;
}

type TransferStep = 1 | 2 | 3 | 4;

interface TransferWizardState {
  open: boolean;
  step: TransferStep;
  fromGudangId: string;
  selected: Record<string, { checked: boolean; qty: string }>;
  toGudangId: string;
  destRakByBarang: Record<string, string>;
  tanggal: string;
  catatan: string;
}

const EMPTY_WIZARD: TransferWizardState = {
  open: false,
  step: 1,
  fromGudangId: "",
  selected: {},
  toGudangId: "",
  destRakByBarang: {},
  tanggal: "",
  catatan: "",
};

export default function GudangPanel() {
  const [gudangMap, setGudangMap] = useState<Record<string, KsCard>>({});
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [selectedGudangId, setSelectedGudangId] = useState<string>("");
  const [selectedRakId, setSelectedRakId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [transferLogs, setTransferLogs] = useState<TransferGudangLog[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  // Dropdown menus (titik tiga pada tab gudang & kartu rak)
  const [gudangMenuOpen, setGudangMenuOpen] = useState(false);
  const [rakMenuOpen, setRakMenuOpen] = useState(false);
  const gudangMenuRef = useRef<HTMLDivElement | null>(null);
  const rakMenuRef = useRef<HTMLDivElement | null>(null);

  // Modal Tambah / Ubah Gudang
  const [gudangModal, setGudangModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    id: string;
    nama: string;
    lokasi: string;
  }>({ open: false, mode: "add", id: "", nama: "", lokasi: "" });

  // Modal Tambah / Ubah Rak
  const [rakModal, setRakModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    gudangId: string;
    rakId: string;
    nama: string;
  }>({ open: false, mode: "add", gudangId: "", rakId: "", nama: "" });

  // Wizard Transfer Antar Gudang (4 langkah)
  const [transferWizard, setTransferWizard] =
    useState<TransferWizardState>(EMPTY_WIZARD);

  // Modal Tambah Kategori Barang / Ubah Detail Barang (nama, satuan, rak, harga jual, PPN)
  const [barangModal, setBarangModal] = useState<{
    open: boolean;
    mode: "add" | "edit";
    gudangId: string;
    barangId: string;
    nama: string;
    satuan: string;
    rakId: string;
    hargaJual: string;
    ppn: string;
    ppnInclusive: boolean;
    hppRata: number;
    qty: number;
  }>({
    open: false,
    mode: "edit",
    gudangId: "",
    barangId: "",
    nama: "",
    satuan: "unit",
    rakId: "",
    hargaJual: "",
    ppn: "",
    ppnInclusive: false,
    hppRata: 0,
    qty: 0,
  });

  // Modal Riwayat Mutasi Barang (read-only)
  const [mutasiModal, setMutasiModal] = useState<{
    open: boolean;
    barangNama: string;
    satuan: string;
    entries: KsEntry[];
  }>({
    open: false,
    barangNama: "",
    satuan: "unit",
    entries: [],
  });

  // Close floating menus on outside click or Escape
  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        gudangMenuRef.current &&
        target &&
        !gudangMenuRef.current.contains(target)
      ) {
        setGudangMenuOpen(false);
      }
      if (rakMenuRef.current && target && !rakMenuRef.current.contains(target)) {
        setRakMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setGudangMenuOpen(false);
        setRakMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const syncFromStore = useCallback(() => {
    const init = initMultiKartuStockStore();
    const map = readMksMap();
    const list = Object.values(map);
    setGudangMap({ ...map });
    setProdukList([...readProdukList()]);
    setReadOnly(Boolean(getWin().isReadOnly?.()));
    setTransferLogs(readTransferLogs());
    setSelectedGudangId((prev) => {
      if (prev && map[prev]) return prev;
      return init.cardId || list[0]?.id || "";
    });
  }, []);

  useEffect(() => {
    syncFromStore();
    const noop = () => {};
    setOasWindowFn(
      "syncKartuStockDataFromKategori",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn("renderKartuStock", syncFromStore as (...args: never[]) => unknown);
    setOasWindowFn(
      "renderKartuStockSelector",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn("renderProduk", syncFromStore as (...args: never[]) => unknown);
    setOasWindowFn("fixKsTableStickyHeaders", noop as (...args: never[]) => unknown);
    setOasWindowFn("openModalTambahKS", (() => {
      setGudangModal({ open: true, mode: "add", id: "", nama: "", lokasi: "" });
    }) as (...args: never[]) => unknown);
  }, [syncFromStore]);

  const gudangList = useMemo(() => Object.values(gudangMap), [gudangMap]);
  const activeGudang = useMemo(
    () => gudangMap[selectedGudangId] || gudangList[0] || null,
    [gudangMap, gudangList, selectedGudangId]
  );

  const activeRakList: GudangRak[] = useMemo(
    () =>
      activeGudang && Array.isArray(activeGudang.rakList)
        ? activeGudang.rakList
        : [],
    [activeGudang]
  );

  // Semua barang pada gudang aktif
  const activeGudangRows = useMemo<BarangRow[]>(() => {
    if (!activeGudang) return [];
    const validRakIds = new Set(activeRakList.map((r) => r.id));
    const produkByKsId = new Map<string, Produk>();
    produkList.forEach((p) => {
      if (p.ksId) produkByKsId.set(p.ksId, p);
    });

    return Object.values(activeGudang.kategori || {})
      .map((brg) => {
        const saldo = hitungSaldoKat(brg);
        const rakId = brg.rakId && validRakIds.has(brg.rakId) ? brg.rakId : "";
        const ov = produkByKsId.get(brg.id);
        return {
          gudangId: activeGudang.id,
          rakId,
          barang: brg,
          qty: saldo.totalQty,
          hppRata: saldo.hppRata || saldo.hppNext || 0,
          nilai: saldo.totalNilai,
          hargaJual: ov?.hargaJual || 0,
          ppn: ov?.ppn != null && ov.ppn > 0 ? ov.ppn : null,
          ppnInclusive: Boolean(ov?.ppnInclusive),
        };
      })
      .sort((a, b) => a.barang.nama.localeCompare(b.barang.nama, "id"));
  }, [activeGudang, activeRakList, produkList]);

  const unassignedRows = useMemo(
    () => activeGudangRows.filter((r) => !r.rakId),
    [activeGudangRows]
  );

  // Pastikan rak terpilih selalu valid (tanpa opsi "Semua rak")
  const effectiveRakId = useMemo(() => {
    if (selectedRakId && activeRakList.some((r) => r.id === selectedRakId)) {
      return selectedRakId;
    }
    if (selectedRakId === "__none__" && (unassignedRows.length > 0 || activeRakList.length === 0)) {
      return "__none__";
    }
    if (activeRakList.length > 0) return activeRakList[0].id;
    return "__none__";
  }, [activeRakList, selectedRakId, unassignedRows.length]);

  const activeRak = useMemo(
    () => activeRakList.find((r) => r.id === effectiveRakId) || null,
    [activeRakList, effectiveRakId]
  );

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeGudangRows.filter((row) => {
      if (effectiveRakId === "__none__") {
        if (row.rakId !== "") return false;
      } else if (row.rakId !== effectiveRakId) {
        return false;
      }
      if (q && !row.barang.nama.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeGudangRows, effectiveRakId, search]);

  const kpi = useMemo(() => {
    const totalNilai = activeGudangRows.reduce((s, r) => s + r.nilai, 0);
    const totalUnit = activeGudangRows.reduce((s, r) => s + r.qty, 0);
    return {
      totalNilai,
      totalBarang: activeGudangRows.length,
      totalUnit,
      totalRak: activeRakList.length,
    };
  }, [activeGudangRows, activeRakList.length]);

  // ── CRUD Gudang ──
  const openAddGudang = () => {
    setGudangMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setGudangModal({ open: true, mode: "add", id: "", nama: "", lokasi: "" });
  };

  const openEditGudang = (g: KsCard) => {
    setGudangMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setGudangModal({
      open: true,
      mode: "edit",
      id: g.id,
      nama: g.nama,
      lokasi: g.lokasi || "",
    });
  };

  const handleSaveGudang = () => {
    const nama = gudangModal.nama.trim();
    if (!nama) {
      getWin().showAlert?.("Nama gudang wajib diisi.");
      return;
    }
    const map = readMksMap();
    if (gudangModal.mode === "add") {
      const id = "gudang_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5);
      map[id] = {
        id,
        nama,
        satuan: "unit",
        lokasi: gudangModal.lokasi.trim(),
        rakList: [],
        createdAt: new Date().toISOString(),
        kategori: {},
      };
      writeMksMap(map);
      saveMksStore();
      getLegacyKsStore()?.setActiveKartuStock?.(id, null);
      setSelectedGudangId(id);
      setSelectedRakId("__none__");
      getWin().auditLog?.("create", "persediaan", `Tambah gudang "${nama}"`);
      getWin().showAlert?.(`Gudang "${nama}" ditambahkan.`);
    } else {
      const target = map[gudangModal.id];
      if (!target) return;
      const oldName = target.nama;
      target.nama = nama;
      target.lokasi = gudangModal.lokasi.trim();
      writeMksMap(map);
      saveMksStore();
      getWin().auditLog?.(
        "edit",
        "persediaan",
        `Ubah nama gudang "${oldName}" menjadi "${nama}"`
      );
      getWin().showAlert?.(`Nama gudang diperbarui menjadi "${nama}".`);
    }
    setGudangModal((prev) => ({ ...prev, open: false }));
    syncFromStore();
  };

  const handleDeleteGudang = (g: KsCard) => {
    setGudangMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    const map = readMksMap();
    if (Object.keys(map).length <= 1) {
      getWin().showAlert?.("Minimal harus ada 1 gudang aktif.");
      return;
    }
    const itemCount = Object.keys(g.kategori || {}).length;
    const stokCount = Object.values(g.kategori || {}).reduce(
      (s, k) => s + hitungSaldoKat(k).totalQty,
      0
    );
    const msg =
      stokCount > 0
        ? `Gudang "${g.nama}" masih menyimpan ${itemCount} barang (${stokCount} unit). Hapus gudang ini?`
        : `Hapus gudang "${g.nama}"?`;
    const run = () => {
      const fresh = readMksMap();
      delete fresh[g.id];
      writeMksMap(fresh);
      saveMksStore();
      const firstId = Object.keys(fresh)[0] || "";
      getLegacyKsStore()?.setActiveKartuStock?.(firstId || null, null);
      setSelectedGudangId(firstId);
      setSelectedRakId("");
      syncFromStore();
      getWin().auditLog?.("delete", "persediaan", `Hapus gudang "${g.nama}"`);
      getWin().showAlert?.(`Gudang "${g.nama}" dihapus.`);
    };
    const confirmFn = getWin().showConfirm;
    if (confirmFn) confirmFn(msg, run);
    else if (window.confirm(msg)) run();
  };

  // ── CRUD Rak dalam Gudang ──
  const openAddRak = (gudangId: string) => {
    setGudangMenuOpen(false);
    setRakMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setRakModal({ open: true, mode: "add", gudangId, rakId: "", nama: "" });
  };

  const openEditRak = (gudangId: string, rak: GudangRak) => {
    setRakMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setRakModal({
      open: true,
      mode: "edit",
      gudangId,
      rakId: rak.id,
      nama: rak.nama,
    });
  };

  const handleSaveRak = () => {
    const nama = rakModal.nama.trim();
    if (!nama) {
      getWin().showAlert?.("Nama rak wajib diisi.");
      return;
    }
    const map = readMksMap();
    const g = map[rakModal.gudangId];
    if (!g) return;
    if (!Array.isArray(g.rakList)) g.rakList = [];

    if (rakModal.mode === "add") {
      const dup = g.rakList.some(
        (r) => r.nama.trim().toLowerCase() === nama.toLowerCase()
      );
      if (dup) {
        getWin().showAlert?.(`Rak "${nama}" sudah ada di ${g.nama}.`);
        return;
      }
      const id = "rak_" + Date.now() + "_" + Math.random().toString(36).slice(2, 5);
      g.rakList.push({ id, nama });
      writeMksMap(map);
      saveMksStore();
      setSelectedRakId(id);
      getWin().showAlert?.(`Rak "${nama}" ditambahkan ke ${g.nama}.`);
    } else {
      const target = g.rakList.find((r) => r.id === rakModal.rakId);
      if (!target) return;
      target.nama = nama;
      writeMksMap(map);
      saveMksStore();
      getWin().showAlert?.(`Nama rak diperbarui menjadi "${nama}".`);
    }
    setRakModal((prev) => ({ ...prev, open: false }));
    syncFromStore();
  };

  const handleDeleteRak = (gudangId: string, rak: GudangRak) => {
    setRakMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    const run = () => {
      const map = readMksMap();
      const g = map[gudangId];
      if (!g) return;
      g.rakList = (g.rakList || []).filter((r) => r.id !== rak.id);
      Object.values(g.kategori || {}).forEach((k) => {
        if (k.rakId === rak.id) k.rakId = "";
      });
      writeMksMap(map);
      saveMksStore();
      setSelectedRakId(g.rakList[0]?.id || "__none__");
      syncFromStore();
      getWin().showAlert?.(
        `Rak "${rak.nama}" dihapus. Barang di dalamnya dipindah ke Tanpa rak.`
      );
    };
    const msg = `Hapus rak "${rak.nama}"? Barang di dalam rak ini tidak akan dihapus, hanya dipindah ke Tanpa rak.`;
    const confirmFn = getWin().showConfirm;
    if (confirmFn) confirmFn(msg, run);
    else if (window.confirm(msg)) run();
  };

  // ── Tambah Kategori Barang / Edit Barang (Detail, Rak, Harga Jual, PPN) ──
  const openAddKategoriBarang = (gudangId: string, rakId: string) => {
    setRakMenuOpen(false);
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setBarangModal({
      open: true,
      mode: "add",
      gudangId,
      barangId: "",
      nama: "",
      satuan: "unit",
      rakId,
      hargaJual: "",
      ppn: "",
      ppnInclusive: false,
      hppRata: 0,
      qty: 0,
    });
  };

  const openEditBarang = (row: BarangRow) => {
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    setBarangModal({
      open: true,
      mode: "edit",
      gudangId: row.gudangId,
      barangId: row.barang.id,
      nama: row.barang.nama,
      satuan: row.barang.satuan || "unit",
      rakId: row.rakId,
      hargaJual: row.hargaJual ? String(row.hargaJual) : "",
      ppn: row.ppn != null ? String(row.ppn) : "",
      ppnInclusive: row.ppnInclusive,
      hppRata: row.hppRata,
      qty: row.qty,
    });
  };

  const handleSaveBarang = () => {
    const nama = barangModal.nama.trim();
    if (!nama) {
      getWin().showAlert?.("Nama barang wajib diisi.");
      return;
    }

    let targetBarangId = barangModal.barangId;

    if (barangModal.mode === "add") {
      const map = readMksMap();
      const g = map[barangModal.gudangId];
      if (!g) return;
      const dup = Object.values(g.kategori || {}).some(
        (k) =>
          k.nama.trim().toLowerCase() === nama.toLowerCase() &&
          (k.rakId || "") === (barangModal.rakId || "")
      );
      if (dup) {
        getWin().showAlert?.(`Kategori barang "${nama}" sudah ada di rak ini.`);
        return;
      }
      const created = ensureBarangInGudangStore(
        barangModal.gudangId,
        nama,
        barangModal.satuan.trim() || "unit",
        barangModal.rakId || undefined
      );
      if (!created) {
        getWin().showAlert?.("Gagal menambahkan kategori barang.");
        return;
      }
      targetBarangId = created.id;
      getWin().auditLog?.(
        "create",
        "persediaan",
        `Tambah kategori barang "${nama}" di ${g.nama}`
      );
    } else {
      const map = readMksMap();
      const brg = map[barangModal.gudangId]?.kategori?.[barangModal.barangId];
      if (!brg) return;
      brg.nama = nama;
      brg.satuan = barangModal.satuan.trim() || "unit";
      brg.rakId = barangModal.rakId;
      writeMksMap(map);
      saveMksStore();
    }

    // Simpan harga jual & PPN ke produkList (dipakai Transaksi Penjualan & Invoice)
    const hargaVal = parseFloat(barangModal.hargaJual) || 0;
    const ppnVal =
      barangModal.ppn.trim() !== "" ? parseFloat(barangModal.ppn) : null;
    const nextProduk = [...readProdukList()];
    const idx = nextProduk.findIndex((p) => p.ksId === targetBarangId);
    const record: Partial<Produk> & {
      ksId: string;
      hargaJual: number;
      ppn: number | null;
      ppnInclusive: boolean;
    } = {
      ksId: targetBarangId,
      hargaJual: hargaVal,
      ppn: ppnVal != null && !Number.isNaN(ppnVal) ? ppnVal : null,
      ppnInclusive: barangModal.ppnInclusive,
    };
    if (idx >= 0) {
      nextProduk[idx] = { ...nextProduk[idx], ...record };
    } else if (hargaVal > 0 || (ppnVal != null && ppnVal > 0)) {
      nextProduk.push(record);
    }
    writeProdukList(nextProduk);
    callOasGlobal("saveToStorage", false);

    setBarangModal((prev) => ({ ...prev, open: false }));
    syncFromStore();
    getWin().showAlert?.(
      barangModal.mode === "add"
        ? `Kategori barang "${nama}" ditambahkan.`
        : `Detail barang "${nama}" diperbarui.`
    );
  };

  const openMutasiModal = (row: BarangRow) => {
    const saldo = hitungSaldoKat(row.barang);
    const metode = saldo.metode || "fifo";
    const entries = row.barang.data?.[metode] || [];
    setMutasiModal({
      open: true,
      barangNama: row.barang.nama,
      satuan: row.barang.satuan || "unit",
      entries: [...entries].reverse(),
    });
  };

  // ── Wizard Transfer Antar Gudang (4 Langkah) ──
  const gudangStockSummary = useMemo(() => {
    const res: Record<string, { itemCount: number; totalQty: number }> = {};
    gudangList.forEach((g) => {
      let itemCount = 0;
      let totalQty = 0;
      Object.values(g.kategori || {}).forEach((k) => {
        const q = hitungSaldoKat(k).totalQty;
        if (q > 0) {
          itemCount += 1;
          totalQty += q;
        }
      });
      res[g.id] = { itemCount, totalQty };
    });
    return res;
  }, [gudangList]);

  const openTransferWizard = () => {
    if (getWin().guardHanyaBaca?.("Persediaan")) return;
    if (gudangList.length < 2) {
      getWin().showAlert?.(
        "Tambahkan minimal 2 gudang terlebih dahulu untuk melakukan transfer antar gudang."
      );
      return;
    }
    const defaultFrom =
      (activeGudang && (gudangStockSummary[activeGudang.id]?.itemCount || 0) > 0
        ? activeGudang.id
        : gudangList.find((g) => (gudangStockSummary[g.id]?.itemCount || 0) > 0)?.id) ||
      activeGudang?.id ||
      gudangList[0]?.id ||
      "";
    const defaultTo = gudangList.find((g) => g.id !== defaultFrom)?.id || "";
    setTransferWizard({
      open: true,
      step: 1,
      fromGudangId: defaultFrom,
      selected: {},
      toGudangId: defaultTo,
      destRakByBarang: {},
      tanggal: todayIso(),
      catatan: "",
    });
  };

  const wizardSourceItems = useMemo(() => {
    const g = gudangMap[transferWizard.fromGudangId];
    if (!g) return [];
    return Object.values(g.kategori || {})
      .map((k) => ({ k, saldo: hitungSaldoKat(k) }))
      .filter((x) => x.saldo.totalQty > 0)
      .sort((a, b) => a.k.nama.localeCompare(b.k.nama, "id"));
  }, [gudangMap, transferWizard.fromGudangId]);

  const wizardCheckedItems = useMemo(
    () =>
      wizardSourceItems.filter(
        (item) => transferWizard.selected[item.k.id]?.checked
      ),
    [wizardSourceItems, transferWizard.selected]
  );

  const wizardDestGudang = useMemo(
    () => gudangMap[transferWizard.toGudangId] || null,
    [gudangMap, transferWizard.toGudangId]
  );

  const wizardDestRaks = useMemo(
    () => (Array.isArray(wizardDestGudang?.rakList) ? wizardDestGudang.rakList : []),
    [wizardDestGudang]
  );

  const wizardNeedsRackStep = wizardDestRaks.length > 1;

  const toggleWizardItem = (barangId: string, defaultQty: number) => {
    setTransferWizard((prev) => {
      const cur = prev.selected[barangId];
      const nextChecked = !cur?.checked;
      return {
        ...prev,
        selected: {
          ...prev.selected,
          [barangId]: {
            checked: nextChecked,
            qty: cur?.qty || String(defaultQty),
          },
        },
      };
    });
  };

  const toggleWizardAll = (checkAll: boolean) => {
    setTransferWizard((prev) => {
      const next: Record<string, { checked: boolean; qty: string }> = {};
      wizardSourceItems.forEach((item) => {
        next[item.k.id] = {
          checked: checkAll,
          qty: prev.selected[item.k.id]?.qty || "1",
        };
      });
      return { ...prev, selected: next };
    });
  };

  const executeTransfer = (rakOverrideMap?: Record<string, string>) => {
    if (!wizardDestGudang) {
      getWin().showAlert?.("Pilih gudang tujuan terlebih dahulu.");
      return;
    }
    if (wizardCheckedItems.length === 0) {
      getWin().showAlert?.("Pilih minimal 1 barang untuk dipindahkan.");
      return;
    }

    // Validasi qty semua barang sebelum eksekusi agar atomik
    for (const item of wizardCheckedItems) {
      const q = parseFloat(transferWizard.selected[item.k.id]?.qty || "0");
      if (!(q > 0) || q > item.saldo.totalQty) {
        getWin().showAlert?.(
          `Jumlah transfer "${item.k.nama}" tidak valid (maks. ${item.saldo.totalQty} ${item.k.satuan || "unit"}).`
        );
        return;
      }
    }

    const singleAutoRakId =
      wizardDestRaks.length === 1 ? wizardDestRaks[0].id : "";
    const tanggal = transferWizard.tanggal || todayIso();
    let successCount = 0;

    for (const item of wizardCheckedItems) {
      const qty = parseFloat(transferWizard.selected[item.k.id]?.qty || "0");
      const toRakId = wizardNeedsRackStep
        ? (rakOverrideMap ?? transferWizard.destRakByBarang)[item.k.id] ||
          wizardDestRaks[0]?.id ||
          ""
        : singleAutoRakId;
      const res = transferBarangAntarGudangStore({
        fromGudangId: transferWizard.fromGudangId,
        barangId: item.k.id,
        toGudangId: wizardDestGudang.id,
        toRakId: toRakId || undefined,
        qty,
        tanggal,
        catatan: transferWizard.catatan,
      });
      if (!res.ok) {
        getWin().showAlert?.(res.pesan);
        syncFromStore();
        return;
      }
      successCount += 1;
      getWin().auditLog?.(
        "create",
        "persediaan",
        `Transfer ${res.log.qty} ${res.log.satuan} "${res.log.barangNama}" dari ${res.log.fromGudangNama} ke ${res.log.toGudangNama}`
      );
    }

    setTransferWizard(EMPTY_WIZARD);
    syncFromStore();
    getWin().showAlert?.(
      `${successCount} barang berhasil ditransfer ke ${wizardDestGudang.nama}${
        singleAutoRakId ? ` (${wizardDestRaks[0].nama})` : ""
      }.`
    );
  };

  const handleWizardNext = () => {
    if (transferWizard.step === 1) {
      if (!transferWizard.fromGudangId) {
        getWin().showAlert?.("Pilih gudang asal terlebih dahulu.");
        return;
      }
      if (wizardSourceItems.length === 0) {
        getWin().showAlert?.("Gudang asal belum memiliki stok untuk ditransfer.");
        return;
      }
      setTransferWizard((prev) => ({
        ...prev,
        step: 2,
        toGudangId:
          prev.toGudangId && prev.toGudangId !== prev.fromGudangId
            ? prev.toGudangId
            : gudangList.find((g) => g.id !== prev.fromGudangId)?.id || "",
      }));
      return;
    }

    if (transferWizard.step === 2) {
      if (wizardCheckedItems.length === 0) {
        getWin().showAlert?.("Centang minimal 1 barang yang ingin dipindahkan.");
        return;
      }
      for (const item of wizardCheckedItems) {
        const q = parseFloat(transferWizard.selected[item.k.id]?.qty || "0");
        if (!(q > 0) || q > item.saldo.totalQty) {
          getWin().showAlert?.(
            `Qty "${item.k.nama}" harus antara 1 sampai ${item.saldo.totalQty}.`
          );
          return;
        }
      }
      setTransferWizard((prev) => ({ ...prev, step: 3 }));
      return;
    }

    if (transferWizard.step === 3) {
      if (!transferWizard.toGudangId || transferWizard.toGudangId === transferWizard.fromGudangId) {
        getWin().showAlert?.("Pilih gudang tujuan yang berbeda dari gudang asal.");
        return;
      }
      // Jika gudang tujuan punya > 1 rak, masuk Step 4 (pilih rak per barang)
      // Jika hanya 1 rak (atau 0 rak), langsung eksekusi!
      if (wizardNeedsRackStep) {
        const nextMap: Record<string, string> = {};
        wizardCheckedItems.forEach((item) => {
          const existing = transferWizard.destRakByBarang[item.k.id];
          nextMap[item.k.id] =
            existing && wizardDestRaks.some((r) => r.id === existing)
              ? existing
              : wizardDestRaks[0].id;
        });
        setTransferWizard((prev) => ({
          ...prev,
          step: 4,
          destRakByBarang: nextMap,
        }));
      } else {
        executeTransfer();
      }
      return;
    }

    if (transferWizard.step === 4) {
      executeTransfer();
    }
  };

  const activeCardTitle = activeRak ? activeRak.nama : "Tanpa rak";
  const showRakPills = activeRakList.length > 0;

  return (
    <div id="gudang-panel-root">
      {/* Bar Aksi Utama — hanya Transfer antar gudang */}
      {!readOnly ? (
        <div className="section-header page-actions-only" style={{ marginBottom: "14px" }}>
          <button
            type="button"
            id="btn-persediaan-transfer"
            className="btn btn-ghost btn-sm"
            onClick={openTransferWizard}
          >
            <ArrowLeftRight size={14} /> Transfer antar gudang
          </button>
        </div>
      ) : null}

      {/* KPI Strip untuk Gudang Aktif */}
      <div className="oas-kpi-strip">
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">
            Nilai persediaan
            {activeGudang ? (
              <>
                {" "}
                <span className="oas-ctx-highlight">{activeGudang.nama}</span>
              </>
            ) : null}
          </div>
          <div className="oas-kpi-val num">{fmtRp(Math.round(kpi.totalNilai))}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Jenis barang</div>
          <div className="oas-kpi-val num">{kpi.totalBarang.toLocaleString("id-ID")}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Total unit stok</div>
          <div className="oas-kpi-val num">{kpi.totalUnit.toLocaleString("id-ID")}</div>
        </div>
        <div className="oas-kpi-cell">
          <div className="oas-kpi-label">Rak penyimpanan</div>
          <div className="oas-kpi-val num">{kpi.totalRak} rak</div>
        </div>
      </div>

      {/* Tab Multi-Gudang + Titik Tiga Polos (Tambah Gudang, Tambah Rak, Ubah, Hapus) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "14px",
        }}
      >
        <div
          className="tabs"
          role="tablist"
          aria-label="Daftar gudang"
          style={{ borderBottom: "none", marginBottom: 0, flex: 1 }}
        >
          {gudangList.map((g) => {
            const isActive = activeGudang?.id === g.id;
            const itemCount = Object.keys(g.kategori || {}).length;
            return (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`tab${isActive ? " active" : ""}`}
                onClick={() => {
                  setSelectedGudangId(g.id);
                  setSelectedRakId(g.rakList?.[0]?.id || "__none__");
                  setSearch("");
                  setRakMenuOpen(false);
                  setGudangMenuOpen(false);
                  getLegacyKsStore()?.setActiveKartuStock?.(g.id, null);
                }}
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
                <Warehouse size={14} aria-hidden="true" />
                <span>{g.nama}</span>
                <span className="oas-tab-count">{itemCount}</span>
              </button>
            );
          })}
        </div>

        {!readOnly && activeGudang ? (
          <div ref={gudangMenuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              id="btn-gudang-menu"
              className="oas-icon-dots"
              aria-label={`Kelola gudang ${activeGudang.nama}`}
              title={`Kelola gudang ${activeGudang.nama}`}
              onClick={() => {
                setGudangMenuOpen((o) => !o);
                setRakMenuOpen(false);
              }}
            >
              <MoreVertical size={17} />
            </button>
            {gudangMenuOpen ? (
              <div
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: "200px",
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--r-control)",
                  boxShadow: "var(--shadow-overlay)",
                  padding: "4px",
                  zIndex: 40,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={openAddGudang}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "4px",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <Warehouse size={13} style={{ color: "var(--accent-text)" }} /> Tambah gudang baru
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openAddRak(activeGudang.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "4px",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <FolderPlus size={13} style={{ color: "var(--accent2)" }} /> Tambah rak
                </button>
                <div
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    margin: "4px 6px",
                  }}
                />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openEditGudang(activeGudang)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: "4px",
                    background: "transparent",
                    color: "var(--text)",
                    fontSize: "13px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                  }}
                >
                  <Pencil size={13} /> Ubah nama gudang
                </button>
                {gudangList.length > 1 ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleDeleteGudang(activeGudang)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      border: "none",
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--red)",
                      fontSize: "13px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <Trash2 size={13} /> Hapus gudang
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Tab Rak (kotak Orias dengan lipatan kuning pojok kanan saat aktif, tanpa card luar) + Cari */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "12px",
        }}
      >
        <div
          role="tablist"
          aria-label="Tab rak penyimpanan"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {showRakPills ? (
            <>
              {activeRakList.map((rak) => {
                const cnt = activeGudangRows.filter((r) => r.rakId === rak.id).length;
                const isSelected = effectiveRakId === rak.id;
                return (
                  <button
                    key={rak.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`oas-rak-tab${isSelected ? " active" : ""}`}
                    onClick={() => {
                      setSelectedRakId(rak.id);
                      setRakMenuOpen(false);
                    }}
                  >
                    <span>{rak.nama}</span>
                    <span className="oas-tab-count">{cnt}</span>
                  </button>
                );
              })}
              {unassignedRows.length > 0 ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={effectiveRakId === "__none__"}
                  className={`oas-rak-tab${effectiveRakId === "__none__" ? " active" : ""}`}
                  onClick={() => {
                    setSelectedRakId("__none__");
                    setRakMenuOpen(false);
                  }}
                >
                  <span>Tanpa rak</span>
                  <span className="oas-tab-count">{unassignedRows.length}</span>
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        <input
          type="text"
          placeholder="Cari barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: "210px",
            maxWidth: "280px",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--r-control)",
            padding: "7px 12px",
            fontSize: "13px",
            color: "var(--text)",
            fontFamily: "var(--sans)",
          }}
        />
      </div>

      {/* Card Rak Aktif (Judul = Nama Rak, titik tiga polos ⋮ di pojok kanan) */}
      <div className="table-card" style={{ marginBottom: "18px" }}>
        <div className="table-header">
          <div>
            <div className="table-title">{activeCardTitle}</div>
            <div className="table-subtitle">
              {visibleRows.length} barang
              {activeGudang?.lokasi ? ` · ${activeGudang.lokasi}` : ""}
            </div>
          </div>

          {!readOnly && activeGudang ? (
            <div ref={rakMenuRef} style={{ position: "relative" }}>
              <button
                type="button"
                id="btn-rak-card-menu"
                className="oas-icon-dots"
                aria-label={`Opsi rak ${activeCardTitle}`}
                title={`Opsi rak ${activeCardTitle}`}
                onClick={() => {
                  setRakMenuOpen((o) => !o);
                  setGudangMenuOpen(false);
                }}
              >
                <MoreVertical size={17} />
              </button>
              {rakMenuOpen ? (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    minWidth: "204px",
                    background: "var(--surface)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--r-control)",
                    boxShadow: "var(--shadow-overlay)",
                    padding: "4px",
                    zIndex: 40,
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      openAddKategoriBarang(activeGudang.id, activeRak?.id || "")
                    }
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      border: "none",
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--text)",
                      fontSize: "13px",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <PackagePlus size={13} style={{ color: "var(--accent-text)" }} /> Tambah kategori barang
                  </button>
                  <div
                    style={{
                      height: "1px",
                      background: "var(--border)",
                      margin: "4px 6px",
                    }}
                  />
                  {activeRak ? (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openEditRak(activeGudang.id, activeRak)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "4px",
                          background: "transparent",
                          color: "var(--text)",
                          fontSize: "13px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        <Pencil size={13} /> Ubah nama rak
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDeleteRak(activeGudang.id, activeRak)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: "4px",
                          background: "transparent",
                          color: "var(--red)",
                          fontSize: "13px",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "var(--sans)",
                        }}
                      >
                        <Trash2 size={13} /> Hapus rak
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openAddRak(activeGudang.id)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        border: "none",
                        borderRadius: "4px",
                        background: "transparent",
                        color: "var(--text)",
                        fontSize: "13px",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <FolderPlus size={13} /> Buat rak baru
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Barang</th>
                <th style={{ textAlign: "right" }}>Stok</th>
                <th style={{ textAlign: "right" }}>HPP</th>
                <th style={{ textAlign: "right" }}>Harga jual</th>
                <th style={{ textAlign: "right" }}>Nilai</th>
                <th style={{ textAlign: "right", width: "92px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 20px" }}>
                    <Package
                      size={26}
                      style={{ color: "var(--muted)", marginBottom: "8px", opacity: 0.6 }}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--text)",
                        marginBottom: "4px",
                      }}
                    >
                      {search.trim()
                        ? "Barang tidak ditemukan."
                        : `Belum ada barang di ${activeCardTitle}.`}
                    </div>
                    <div
                      style={{
                        fontSize: "12.5px",
                        color: "var(--muted)",
                      }}
                    >
                      Tambahkan kategori barang melalui menu titik tiga di pojok kanan kartu ini.
                    </div>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={`${row.gudangId}-${row.barang.id}`}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>
                      {row.barang.nama}
                    </td>
                    <td
                      className="num"
                      style={{
                        fontWeight: 700,
                        color: row.qty > 0 ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      {row.qty.toLocaleString("id-ID")} {row.barang.satuan || "unit"}
                    </td>
                    <td className="num">{fmtRp(Math.round(row.hppRata))}</td>
                    <td
                      className="num"
                      style={{
                        color: row.hargaJual > 0 ? "var(--text)" : "var(--muted)",
                      }}
                    >
                      {row.hargaJual > 0 ? fmtRp(row.hargaJual) : "-"}
                      {row.ppn != null ? (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "10.5px",
                            color: "var(--accent2)",
                            fontFamily: "var(--sans)",
                          }}
                        >
                          PPN {row.ppn}%
                        </span>
                      ) : null}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {fmtRp(Math.round(row.nilai))}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openMutasiModal(row)}
                          title="Riwayat mutasi"
                          aria-label={`Riwayat mutasi ${row.barang.nama}`}
                          style={{ padding: "5px 7px" }}
                        >
                          <History size={13} />
                        </button>
                        {!readOnly ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEditBarang(row)}
                            title="Ubah detail & harga jual"
                            aria-label={`Ubah ${row.barang.nama}`}
                            style={{ padding: "5px 7px" }}
                          >
                            <Pencil size={13} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Riwayat Transfer Antar Gudang */}
      {transferLogs.length > 0 ? (
        <div className="table-card">
          <div className="table-header">
            <div>
              <div
                className="table-title"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
              >
                <ArrowLeftRight size={15} aria-hidden="true" />
                Riwayat transfer antar gudang
              </div>
              <div className="table-subtitle">
                {transferLogs.length} perpindahan stok tercatat
              </div>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Barang</th>
                  <th>Gudang asal</th>
                  <th>Gudang tujuan</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                  <th style={{ textAlign: "right" }}>Nilai</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {transferLogs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>
                      {fmtDate(log.tanggal)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.barangNama}</td>
                    <td>{log.fromGudangNama}</td>
                    <td>
                      {log.toGudangNama}
                      {log.toRakNama ? (
                        <span style={{ color: "var(--muted)" }}> · {log.toRakNama}</span>
                      ) : null}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {log.qty.toLocaleString("id-ID")} {log.satuan}
                    </td>
                    <td className="num">{fmtRp(Math.round(log.nilaiTotal))}</td>
                    <td style={{ color: "var(--muted)" }}>{log.catatan || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal Tambah / Ubah Gudang */}
      <OasModalDialog
        id="modal-gudang"
        open={gudangModal.open}
        onClose={() => setGudangModal((prev) => ({ ...prev, open: false }))}
        maxWidth="440px"
        title={gudangModal.mode === "add" ? "Tambah gudang baru" : "Ubah nama gudang"}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setGudangModal((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveGudang}
            >
              Simpan
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: "12px" }}>
          <label htmlFor="gudang-nama-input">Nama gudang</label>
          <input
            id="gudang-nama-input"
            type="text"
            placeholder="Contoh: Gudang Utama, Gudang Cabang Timur"
            value={gudangModal.nama}
            onChange={(e) =>
              setGudangModal((prev) => ({ ...prev, nama: e.target.value }))
            }
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="gudang-lokasi-input">Lokasi / alamat (opsional)</label>
          <input
            id="gudang-lokasi-input"
            type="text"
            placeholder="Contoh: Jakarta Selatan, Lantai 1"
            value={gudangModal.lokasi}
            onChange={(e) =>
              setGudangModal((prev) => ({ ...prev, lokasi: e.target.value }))
            }
          />
        </div>
      </OasModalDialog>

      {/* Modal Tambah / Ubah Rak */}
      <OasModalDialog
        id="modal-rak"
        open={rakModal.open}
        onClose={() => setRakModal((prev) => ({ ...prev, open: false }))}
        maxWidth="420px"
        title={rakModal.mode === "add" ? "Tambah rak baru" : "Ubah nama rak"}
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRakModal((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSaveRak}>
              Simpan
            </button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="rak-nama-input">Nama rak</label>
          <input
            id="rak-nama-input"
            type="text"
            placeholder="Contoh: Rak A1, Rak Bahan Baku, Etalase Depan"
            value={rakModal.nama}
            onChange={(e) =>
              setRakModal((prev) => ({ ...prev, nama: e.target.value }))
            }
            autoFocus
          />
        </div>
      </OasModalDialog>

      {/* Modal Wizard Transfer Antar Gudang (4 Langkah) */}
      <OasModalDialog
        id="modal-transfer-gudang"
        open={transferWizard.open}
        onClose={() => setTransferWizard(EMPTY_WIZARD)}
        maxWidth="580px"
        title="Transfer barang antar gudang"
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              gap: "8px",
            }}
          >
            <div>
              {transferWizard.step > 1 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setTransferWizard((prev) => ({
                      ...prev,
                      step: Math.max(1, prev.step - 1) as TransferStep,
                    }))
                  }
                >
                  <ChevronLeft size={14} /> Kembali
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setTransferWizard(EMPTY_WIZARD)}
                >
                  Batal
                </button>
              )}
            </div>
            <button
              type="button"
              id="btn-transfer-next"
              className="btn btn-primary"
              onClick={handleWizardNext}
              disabled={
                (transferWizard.step === 1 && wizardSourceItems.length === 0) ||
                (transferWizard.step === 2 && wizardCheckedItems.length === 0) ||
                (transferWizard.step === 3 && !transferWizard.toGudangId)
              }
            >
              {transferWizard.step === 1 ? (
                <>
                  Lanjut: Pilih barang <ChevronRight size={14} />
                </>
              ) : transferWizard.step === 2 ? (
                <>
                  Lanjut: Gudang tujuan ({wizardCheckedItems.length}){" "}
                  <ChevronRight size={14} />
                </>
              ) : transferWizard.step === 3 && wizardNeedsRackStep ? (
                <>
                  Lanjut: Pilih rak tujuan <ChevronRight size={14} />
                </>
              ) : (
                <>
                  <ArrowLeftRight size={14} /> Transfer {wizardCheckedItems.length}{" "}
                  barang
                </>
              )}
            </button>
          </div>
        }
      >
        {/* Indikator Langkah */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {(
            [
              { num: 1, label: "Gudang asal" },
              { num: 2, label: "Pilih barang" },
              { num: 3, label: "Gudang tujuan" },
              ...(wizardNeedsRackStep ? [{ num: 4, label: "Rak tujuan" }] : []),
            ] as Array<{ num: TransferStep; label: string }>
          ).map((s, idx) => {
            const isCurrent = transferWizard.step === s.num;
            const isDone = transferWizard.step > s.num;
            return (
              <div
                key={s.num}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {idx > 0 ? (
                  <ChevronRight
                    size={13}
                    style={{ color: "var(--muted)" }}
                    aria-hidden="true"
                  />
                ) : null}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: isCurrent ? 700 : 500,
                    background: isCurrent
                      ? "var(--accent-tint)"
                      : isDone
                        ? "var(--surface2)"
                        : "transparent",
                    border: `1px solid ${
                      isCurrent ? "var(--accent-border)" : "var(--border)"
                    }`,
                    color: isCurrent
                      ? "var(--accent-text)"
                      : isDone
                        ? "var(--text)"
                        : "var(--muted)",
                  }}
                >
                  {isDone ? <Check size={12} /> : `${s.num}.`} {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: Pilih Gudang Asal */}
        {transferWizard.step === 1 ? (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "10px",
              }}
            >
              Pilih gudang asal tempat barang akan diambil:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {gudangList.map((g) => {
                const stats = gudangStockSummary[g.id] || { itemCount: 0, totalQty: 0 };
                const disabled = stats.itemCount === 0;
                const isSelected = transferWizard.fromGudangId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      setTransferWizard((prev) => ({
                        ...prev,
                        fromGudangId: g.id,
                        selected: {},
                        destRakByBarang: {},
                        toGudangId:
                          prev.toGudangId === g.id
                            ? gudangList.find((x) => x.id !== g.id)?.id || ""
                            : prev.toGudangId,
                      }))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      width: "100%",
                      padding: "11px 14px",
                      borderRadius: "var(--r-control)",
                      border: `1px solid ${
                        isSelected ? "var(--accent-border)" : "var(--border-strong)"
                      }`,
                      background: isSelected ? "var(--accent-tint)" : "var(--surface2)",
                      color: disabled ? "var(--muted)" : "var(--text)",
                      opacity: disabled ? 0.55 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      textAlign: "left",
                      fontFamily: "var(--sans)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Warehouse
                        size={16}
                        style={{
                          color: isSelected ? "var(--accent-text)" : "var(--muted)",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                          {g.nama}
                        </div>
                        {g.lokasi ? (
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {g.lokasi}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className="num"
                      style={{ fontSize: "12px", color: "var(--muted)", flexShrink: 0 }}
                    >
                      {disabled
                        ? "Stok kosong"
                        : `${stats.itemCount} barang · ${stats.totalQty.toLocaleString("id-ID")} unit`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* STEP 2: Pilih Barang (Centang Multi-Barang + Qty) */}
        {transferWizard.step === 2 ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text)",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    wizardSourceItems.length > 0 &&
                    wizardCheckedItems.length === wizardSourceItems.length
                  }
                  onChange={(e) => toggleWizardAll(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    minWidth: "16px",
                    margin: 0,
                    cursor: "pointer",
                    accentColor: "var(--accent)",
                  }}
                />
                Pilih semua ({wizardSourceItems.length} barang)
              </label>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                {wizardCheckedItems.length} dipilih
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "310px",
                overflowY: "auto",
              }}
            >
              {wizardSourceItems.map(({ k, saldo }) => {
                const entry = transferWizard.selected[k.id];
                const isChecked = Boolean(entry?.checked);
                return (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "var(--r-control)",
                      border: `1px solid ${
                        isChecked ? "var(--accent-border)" : "var(--border)"
                      }`,
                      background: isChecked ? "var(--accent-tint)" : "var(--surface2)",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        flex: 1,
                        cursor: "pointer",
                        margin: 0,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleWizardItem(k.id, 1)}
                        style={{
                          width: "16px",
                          height: "16px",
                          minWidth: "16px",
                          margin: 0,
                          cursor: "pointer",
                          accentColor: "var(--accent)",
                        }}
                      />
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "13.5px",
                            color: "var(--text)",
                          }}
                        >
                          {k.nama}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          Tersedia: {saldo.totalQty.toLocaleString("id-ID")}{" "}
                          {k.satuan || "unit"}
                        </div>
                      </div>
                    </label>

                    {isChecked ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          flexShrink: 0,
                        }}
                      >
                        <input
                          type="number"
                          aria-label={`Jumlah transfer ${k.nama}`}
                          min="1"
                          max={saldo.totalQty}
                          inputMode="numeric"
                          value={entry?.qty || "1"}
                          onChange={(e) =>
                            setTransferWizard((prev) => ({
                              ...prev,
                              selected: {
                                ...prev.selected,
                                [k.id]: { checked: true, qty: e.target.value },
                              },
                            }))
                          }
                          style={{
                            width: "76px",
                            padding: "6px 8px",
                            textAlign: "right",
                            fontFamily: "var(--mono)",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            minWidth: "34px",
                          }}
                        >
                          {k.satuan || "unit"}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* STEP 3: Pilih Gudang Tujuan */}
        {transferWizard.step === 3 ? (
          <div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "10px",
              }}
            >
              Pilih gudang tujuan untuk {wizardCheckedItems.length} barang terpilih:
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginBottom: "16px",
              }}
            >
              {gudangList
                .filter((g) => g.id !== transferWizard.fromGudangId)
                .map((g) => {
                  const raks = Array.isArray(g.rakList) ? g.rakList : [];
                  const isSelected = transferWizard.toGudangId === g.id;
                  const rakInfo =
                    raks.length > 1
                      ? `${raks.length} rak (pilih rak di langkah berikutnya)`
                      : raks.length === 1
                        ? `1 rak (otomatis masuk ke ${raks[0].nama})`
                        : "Belum ada rak";
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setTransferWizard((prev) => ({
                          ...prev,
                          toGudangId: g.id,
                          destRakByBarang: {},
                        }))
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        width: "100%",
                        padding: "11px 14px",
                        borderRadius: "var(--r-control)",
                        border: `1px solid ${
                          isSelected ? "var(--accent-border)" : "var(--border-strong)"
                        }`,
                        background: isSelected ? "var(--accent-tint)" : "var(--surface2)",
                        color: "var(--text)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "var(--sans)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Warehouse
                          size={16}
                          style={{
                            color: isSelected ? "var(--accent-text)" : "var(--muted)",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                            {g.nama}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {rakInfo}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <Check
                          size={16}
                          style={{ color: "var(--accent-text)", flexShrink: 0 }}
                        />
                      ) : null}
                    </button>
                  );
                })}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="trf-tgl">Tanggal transfer</label>
                <input
                  id="trf-tgl"
                  type="date"
                  data-oas-upgraded="native"
                  value={transferWizard.tanggal}
                  onChange={(e) =>
                    setTransferWizard((prev) => ({
                      ...prev,
                      tanggal: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="trf-catatan">Catatan (opsional)</label>
                <input
                  id="trf-catatan"
                  type="text"
                  placeholder="Contoh: Restock cabang"
                  value={transferWizard.catatan}
                  onChange={(e) =>
                    setTransferWizard((prev) => ({
                      ...prev,
                      catatan: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* STEP 4: Pilih Rak Tujuan per Barang (hanya aktif saat gudang tujuan punya > 1 rak) */}
        {transferWizard.step === 4 && wizardDestGudang ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "12px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                Tentukan rak tujuan di <b>{wizardDestGudang.nama}</b> untuk setiap barang:
              </div>
              {wizardCheckedItems.length > 1 ? (
                <select
                  aria-label="Terapkan rak ke semua barang"
                  defaultValue=""
                  onChange={(e) => {
                    const rakId = e.target.value;
                    if (!rakId) return;
                    const updated: Record<string, string> = {};
                    wizardCheckedItems.forEach((item) => {
                      updated[item.k.id] = rakId;
                    });
                    setTransferWizard((prev) => ({
                      ...prev,
                      destRakByBarang: updated,
                    }));
                  }}
                  style={{
                    width: "auto",
                    padding: "5px 10px",
                    fontSize: "12px",
                  }}
                >
                  <option value="">Set semua ke rak...</option>
                  {wizardDestRaks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {wizardCheckedItems.map(({ k }) => {
                const qty = transferWizard.selected[k.id]?.qty || "1";
                const chosenRakId =
                  transferWizard.destRakByBarang[k.id] || wizardDestRaks[0]?.id || "";
                return (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "var(--r-control)",
                      border: "1px solid var(--border)",
                      background: "var(--surface2)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "13.5px",
                          color: "var(--text)",
                        }}
                      >
                        {k.nama}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {qty} {k.satuan || "unit"}
                      </div>
                    </div>
                    <select
                      aria-label={`Rak tujuan untuk ${k.nama}`}
                      value={chosenRakId}
                      onChange={(e) =>
                        setTransferWizard((prev) => ({
                          ...prev,
                          destRakByBarang: {
                            ...prev.destRakByBarang,
                            [k.id]: e.target.value,
                          },
                        }))
                      }
                      style={{ width: "190px", flexShrink: 0 }}
                    >
                      {wizardDestRaks.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </OasModalDialog>

      {/* Modal Tambah Kategori Barang / Ubah Detail & Harga Barang */}
      <OasModalDialog
        id="modal-barang-edit"
        open={barangModal.open}
        onClose={() => setBarangModal((prev) => ({ ...prev, open: false }))}
        maxWidth="480px"
        title={
          barangModal.mode === "add" ? (
            <>
              Tambah kategori barang{" "}
              <span className="oas-ctx-highlight">{activeCardTitle}</span>
            </>
          ) : (
            "Ubah detail & harga barang"
          )
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBarangModal((prev) => ({ ...prev, open: false }))}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveBarang}
            >
              Simpan
            </button>
          </>
        }
      >
        {barangModal.mode === "edit" ? (
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-control)",
              padding: "10px 12px",
              marginBottom: "14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                HPP otomatis (dari pembelian)
              </div>
              <div
                className="num"
                style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}
              >
                {fmtRp(Math.round(barangModal.hppRata))} / {barangModal.satuan || "unit"}
              </div>
            </div>
            <div className="num" style={{ fontSize: "12.5px", color: "var(--muted)" }}>
              Stok: {barangModal.qty.toLocaleString("id-ID")} {barangModal.satuan || "unit"}
            </div>
          </div>
        ) : null}

        <div className="form-row" style={{ marginBottom: "12px" }}>
          <div className="form-group">
            <label htmlFor="brg-nama">Nama barang</label>
            <input
              id="brg-nama"
              type="text"
              placeholder="Contoh: Kertas A4 80gsm"
              value={barangModal.nama}
              onChange={(e) =>
                setBarangModal((prev) => ({ ...prev, nama: e.target.value }))
              }
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="brg-satuan">Satuan</label>
            <input
              id="brg-satuan"
              type="text"
              placeholder="unit, pcs, rim, kg"
              value={barangModal.satuan}
              onChange={(e) =>
                setBarangModal((prev) => ({ ...prev, satuan: e.target.value }))
              }
            />
          </div>
        </div>

        {barangModal.mode === "edit" &&
        (gudangMap[barangModal.gudangId]?.rakList || []).length > 0 ? (
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label htmlFor="brg-rak">Rak penyimpanan</label>
            <select
              id="brg-rak"
              value={barangModal.rakId}
              onChange={(e) =>
                setBarangModal((prev) => ({ ...prev, rakId: e.target.value }))
              }
            >
              <option value="">Tanpa rak</option>
              {(gudangMap[barangModal.gudangId]?.rakList || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nama}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="form-row" style={{ marginBottom: "10px" }}>
          <div className="form-group">
            <label htmlFor="brg-harga-jual">Harga jual (Rp)</label>
            <input
              id="brg-harga-jual"
              type="number"
              inputMode="numeric"
              placeholder="Contoh: 75000"
              value={barangModal.hargaJual}
              onChange={(e) =>
                setBarangModal((prev) => ({ ...prev, hargaJual: e.target.value }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="brg-ppn">
              PPN (%) <span className="oas-ctx-highlight">opsional</span>
            </label>
            <input
              id="brg-ppn"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.1"
              placeholder="cth: 11"
              value={barangModal.ppn}
              onChange={(e) =>
                setBarangModal((prev) => ({ ...prev, ppn: e.target.value }))
              }
            />
          </div>
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={barangModal.ppnInclusive}
            onChange={(e) =>
              setBarangModal((prev) => ({ ...prev, ppnInclusive: e.target.checked }))
            }
            style={{
              width: "16px",
              height: "16px",
              minWidth: "16px",
              margin: 0,
              cursor: "pointer",
              accentColor: "var(--accent)",
            }}
          />
          PPN sudah termasuk harga jual (inclusive)
        </label>
      </OasModalDialog>

      {/* Modal Riwayat Mutasi Barang (Read-only) */}
      <OasModalDialog
        id="modal-mutasi-barang"
        open={mutasiModal.open}
        onClose={() => setMutasiModal((prev) => ({ ...prev, open: false }))}
        maxWidth="640px"
        title={
          <>
            Riwayat mutasi{" "}
            <span className="oas-ctx-highlight">{mutasiModal.barangNama}</span>
          </>
        }
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setMutasiModal((prev) => ({ ...prev, open: false }))}
          >
            Tutup
          </button>
        }
      >
        {mutasiModal.entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>
            Belum ada riwayat mutasi untuk barang ini.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th style={{ textAlign: "right" }}>Masuk</th>
                  <th style={{ textAlign: "right" }}>Keluar</th>
                  <th style={{ textAlign: "right" }}>Harga</th>
                </tr>
              </thead>
              <tbody>
                {mutasiModal.entries.map((e, idx) => (
                  <tr key={e.id || idx}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>
                      {fmtDate(e.tgl)}
                    </td>
                    <td>{e.ket || "-"}</td>
                    <td
                      className="num"
                      style={{
                        color: e.mQty > 0 ? "var(--green)" : "var(--muted)",
                        fontWeight: e.mQty > 0 ? 600 : 400,
                      }}
                    >
                      {e.mQty > 0 ? `+${e.mQty} ${mutasiModal.satuan}` : "-"}
                    </td>
                    <td
                      className="num"
                      style={{
                        color: e.kQty > 0 ? "var(--red)" : "var(--muted)",
                        fontWeight: e.kQty > 0 ? 600 : 400,
                      }}
                    >
                      {e.kQty > 0 ? `-${e.kQty} ${mutasiModal.satuan}` : "-"}
                    </td>
                    <td className="num">
                      {fmtRp(Math.round(e.mQty > 0 ? e.mHarga : e.kHarga))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </OasModalDialog>
    </div>
  );
}
