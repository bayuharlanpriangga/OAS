"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
} from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Armchair,
  ArrowUp,
  Building,
  Calendar,
  Camera,
  Car,
  Clock,
  Cog,
  DollarSign,
  Factory,
  FileText,
  ImageOff,
  Laptop,
  LayoutGrid,
  MapPin,
  Package,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Table2,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { JENIS_JURNAL } from "@/lib/accounting";
import {
  AT_CATEGORIES,
  getAtAutoEnabled,
  getAtFoto,
  getAtFotoAll,
  getAtLastRun,
  hitungPenyusutanAset,
  saveAtFotoAll,
  setAtAutoEnabled,
  setAtLastRun,
  type AsetFotoItem,
} from "@/lib/aset-tetap";
import { fmtRp as rp } from "@/lib/format";
import { callOasGlobal } from "@/lib/legacy-actions";
import {
  readAkuns,
  readAsetTetapList,
  setOasWindowFn,
  writeAsetTetapList,
} from "@/lib/legacy-store";
import type { AsetTetap, AsetTetapMetode } from "@/types";

const CATEGORY_ICON_MAP: Record<
  string,
  ComponentType<{ size?: number; style?: React.CSSProperties }>
> = {
  Kendaraan: Car,
  Bangunan: Building,
  Peralatan: Wrench,
  Mesin: Cog,
  Komputer: Laptop,
  Inventaris: Armchair,
  Tanah: MapPin,
  Lainnya: Package,
};

export default function AsetTetapPage() {
  const [asetList, setAsetList] = useState<AsetTetap[]>([]);
  const [fotoRevision, setFotoRevision] = useState(0);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "aktif" | "disposal">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal Tambah / Edit Aset
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("Kendaraan");
  const [tglPerolehan, setTglPerolehan] = useState("");
  const [harga, setHarga] = useState("");
  const [residu, setResidu] = useState("0");
  const [umur, setUmur] = useState("5");
  const [metode, setMetode] = useState<AsetTetapMetode>("garis-lurus");
  const [lokasi, setLokasi] = useState("");
  const [buatJurnal, setBuatJurnal] = useState(true);

  // Modal Foto Lampiran
  const [fotoModalAsetId, setFotoModalAsetId] = useState<string | null>(null);
  const [lightboxFoto, setLightboxFoto] = useState<AsetFotoItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const syncFromStore = useCallback(() => {
    setAsetList([...readAsetTetapList()]);
    setAutoEnabled(getAtAutoEnabled());
    setLastRun(getAtLastRun());
    setFotoRevision((r) => r + 1);
  }, []);

  const checkAndRunAutoPenyusutan = useCallback(
    (force = false) => {
      if (!getAtAutoEnabled() && !force) return;
      const aktif = readAsetTetapList().filter((a) => a.status === "aktif");
      if (!aktif.length) return;

      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const last = getAtLastRun() || "";
      if (!force && last.substring(0, 7) === thisMonth) return;

      const tgl = now.toISOString().split("T")[0];
      let total = 0;
      const lines: Array<{
        akun: string;
        ket: string;
        debit: number;
        kredit: number;
      }> = [];
      const akuns = readAkuns();

      aktif.forEach((aset) => {
        const hargaVal = aset.hargaPerolehan;
        const residuVal = aset.nilaiResidu || 0;
        const umurBln = (aset.umurEkonomis || 1) * 12;
        let penyBulan =
          aset.metode === "garis-lurus"
            ? (hargaVal - residuVal) / umurBln
            : (hargaVal * (2 / (aset.umurEkonomis || 1))) / 12;
        penyBulan = Math.round(Math.max(0, penyBulan));
        if (!penyBulan) return;
        const { nilaiBuku } = hitungPenyusutanAset(aset, now);
        if (nilaiBuku <= residuVal) return;

        total += penyBulan;
        const akunBeban = akuns.find(
          (a) =>
            a.tipe === "Beban" && a.nama.toLowerCase().includes("penyusutan")
        );
        const akunAkum = akuns.find(
          (a) =>
            a.tipe === "Aset" &&
            a.kat === "Kontra" &&
            a.nama.toLowerCase().includes("penyusutan")
        );
        if (akunBeban && akunAkum) {
          lines.push({
            akun: akunBeban.kode,
            ket: `Penyusutan ${aset.nama}`,
            debit: penyBulan,
            kredit: 0,
          });
          lines.push({
            akun: akunAkum.kode,
            ket: `Akum. Penyusutan ${aset.nama}`,
            debit: 0,
            kredit: penyBulan,
          });
        }
      });

      if (!lines.length) {
        if (force) {
          callOasGlobal(
            "showAlert",
            "Tidak ada akun penyusutan di CoA atau semua aset sudah habis disusutkan."
          );
        }
        return;
      }

      const posted = callOasGlobal("postJurnalLegacy", {
        id: "JRN_PENY_" + Date.now(),
        tanggal: tgl,
        jenis: JENIS_JURNAL.PENYUSUTAN,
        keterangan: `Penyusutan Otomatis ${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })} — ${aktif.length} aset`,
        lines,
      });

      if (!posted) {
        if (force) {
          callOasGlobal(
            "showAlert",
            "Jurnal penyusutan dilewati: periode sudah dikunci."
          );
        }
        return;
      }

      callOasGlobal("saveToStorage", false);
      setAtLastRun(now.toISOString());
      syncFromStore();
      if (force) {
        callOasGlobal(
          "showAlert",
          `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Jurnal penyusutan <b>${rp(total)}</b> dibuat untuk <b>${aktif.length} aset</b>!`
        );
        callOasGlobal("renderDashboard");
      }
    },
    [syncFromStore]
  );

  const handleToggleAuto = useCallback(
    (on: boolean) => {
      setAtAutoEnabled(on);
      setAutoEnabled(on);
      if (on) checkAndRunAutoPenyusutan(true);
    },
    [checkAndRunAutoPenyusutan]
  );

  const handleBuatJurnalBulanan = useCallback(() => {
    const aktif = readAsetTetapList().filter((a) => a.status === "aktif");
    if (!aktif.length) {
      callOasGlobal("showAlert", "Tidak ada aset aktif.");
      return;
    }
    checkAndRunAutoPenyusutan(true);
  }, [checkAndRunAutoPenyusutan]);

  const openModalForm = useCallback((targetEditId: string | null = null) => {
    if (callOasGlobal("guardHanyaBaca", "Aset tetap")) return;
    const found = targetEditId
      ? readAsetTetapList().find((a) => a.id === targetEditId)
      : null;

    setEditId(targetEditId || "");
    setNama(found?.nama || "");
    setKategori(found?.kategori || "Kendaraan");
    setTglPerolehan(
      found?.tglPerolehan || new Date().toISOString().split("T")[0]
    );
    setHarga(found?.hargaPerolehan ? String(found.hargaPerolehan) : "");
    setResidu(String(found?.nilaiResidu ?? 0));
    setUmur(String(found?.umurEkonomis ?? 5));
    setMetode(found?.metode || "garis-lurus");
    setLokasi(found?.lokasi || "");
    setBuatJurnal(!targetEditId);
    setFormOpen(true);
  }, []);

  const handleSimpanAset = useCallback(() => {
    const trimmedNama = nama.trim();
    const hargaVal = parseFloat(harga) || 0;
    if (!trimmedNama || !hargaVal) {
      callOasGlobal(
        "showAlert",
        "Nama aset dan harga perolehan wajib diisi."
      );
      return;
    }

    const list = [...readAsetTetapList()];
    const existing = editId ? list.find((a) => a.id === editId) : undefined;
    const aset: AsetTetap = {
      id: editId || "AT_" + Date.now(),
      nama: trimmedNama,
      hargaPerolehan: hargaVal,
      kategori,
      tglPerolehan: tglPerolehan || new Date().toISOString().split("T")[0],
      nilaiResidu: parseFloat(residu) || 0,
      umurEkonomis: parseInt(umur, 10) || 5,
      metode,
      lokasi,
      status: existing?.status || "aktif",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (editId) {
      const idx = list.findIndex((a) => a.id === editId);
      if (idx >= 0) list[idx] = { ...list[idx], ...aset };
    } else {
      list.unshift(aset);
      writeAsetTetapList(list);
      callOasGlobal("saveToStorage", false);
    }

    writeAsetTetapList(list);
    callOasGlobal("saveFiturBaru");
    setFormOpen(false);
    syncFromStore();
    callOasGlobal("renderDashboard");
    callOasGlobal(
      "showAlert",
      `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Aset "<b>${trimmedNama}</b>" berhasil disimpan!`
    );
  }, [
    nama,
    harga,
    editId,
    kategori,
    tglPerolehan,
    residu,
    umur,
    metode,
    lokasi,
    syncFromStore,
  ]);

  const handleDisposalAset = useCallback(
    (id: string) => {
      const list = [...readAsetTetapList()];
      const idx = list.findIndex((a) => a.id === id);
      if (idx < 0) return;
      const aset = list[idx];
      if (!window.confirm(`Disposal aset "${aset.nama}"?`)) return;
      list[idx] = {
        ...aset,
        status: "disposal",
        tglDisposal: new Date().toISOString().split("T")[0],
      };
      writeAsetTetapList(list);
      callOasGlobal("saveFiturBaru");
      syncFromStore();
      callOasGlobal("renderDashboard");
      callOasGlobal("showAlert", `Aset "${aset.nama}" ditandai disposal.`);
    },
    [syncFromStore]
  );

  const handleHapusAset = useCallback(
    (id: string) => {
      const aset = readAsetTetapList().find((a) => a.id === id);
      if (!aset) return;

      const doDelete = () => {
        const fotoAll = getAtFotoAll();
        delete fotoAll[id];
        saveAtFotoAll(fotoAll);
        writeAsetTetapList(readAsetTetapList().filter((a) => a.id !== id));
        callOasGlobal("saveFiturBaru");
        syncFromStore();
        callOasGlobal("renderDashboard");
        callOasGlobal("showAlert", "Aset dihapus.");
      };

      const confirmPromise = callOasGlobal("showCustomConfirmGeneral", {
        icon: '<i class="ti ti-trash" style="font-size:18px;color:var(--red);"></i>',
        iconColor: "rgba(239,68,68,0.15)",
        iconBorder: "rgba(239,68,68,0.3)",
        title: "Hapus Aset Permanen?",
        subtitle: `Aset <b>${aset.nama}</b> akan dihapus beserta seluruh data fotonya.`,
        rows: [
          { label: "Nama Aset", value: aset.nama, color: "var(--text)" },
          {
            label: "Harga Perolehan",
            value: rp(aset.hargaPerolehan),
            color: "var(--accent3)",
          },
          { label: "Kategori", value: aset.kategori, color: "var(--muted)" },
        ],
        warning:
          '<i class="ti ti-alert-triangle" style="vertical-align:-2px;margin-right:4px;"></i> Tindakan ini tidak dapat dibatalkan.',
        btnLabel: "🗑️ Ya, Hapus Permanen",
        btnGradient: "linear-gradient(135deg,#ef4444,#dc2626)",
      }) as Promise<boolean> | undefined;

      if (confirmPromise?.then) {
        confirmPromise.then((ok) => {
          if (ok) doDelete();
        });
      } else if (window.confirm(`Hapus aset "${aset.nama}" permanen?`)) {
        doDelete();
      }
    },
    [syncFromStore]
  );

  const handleFotoUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const asetId = fotoModalAsetId;
      const file = e.target.files?.[0];
      if (!asetId || !file) return;
      if (file.size > 5 * 1024 * 1024) {
        callOasGlobal("showAlert", "❌ File terlalu besar (maks 5MB)");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result !== "string") return;
        const all = getAtFotoAll();
        if (!all[asetId]) all[asetId] = [];
        all[asetId].push({
          name: file.name,
          data: result,
          date: new Date().toLocaleDateString("id-ID"),
        });
        saveAtFotoAll(all);
        setFotoRevision((r) => r + 1);
        callOasGlobal(
          "showAlert",
          '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Foto berhasil ditambahkan!'
        );
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [fotoModalAsetId]
  );

  const handleDeleteFoto = useCallback((asetId: string, idx: number) => {
    if (!window.confirm("Hapus foto ini?")) return;
    const all = getAtFotoAll();
    if (all[asetId]) {
      all[asetId].splice(idx, 1);
      saveAtFotoAll(all);
      setFotoRevision((r) => r + 1);
    }
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderAsetTetap", syncFromStore);
    setOasWindowFn("renderAsetTetapKPI", syncFromStore);
    setOasWindowFn(
      "openModalAsetTetap",
      openModalForm as (...args: never[]) => unknown
    );
    setOasWindowFn("simpanAsetTetap", handleSimpanAset);
    setOasWindowFn("atInitOnLoad", () => {
      syncFromStore();
      checkAndRunAutoPenyusutan(false);
    });
    setOasWindowFn(
      "atToggleAuto",
      handleToggleAuto as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "atCheckAndRunAutoPenyusutan",
      checkAndRunAutoPenyusutan as (...args: never[]) => unknown
    );
    setOasWindowFn("buatJurnalPenyusutanBulanan", handleBuatJurnalBulanan);
    setOasWindowFn(
      "disposalAset",
      handleDisposalAset as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "hapusAset",
      handleHapusAset as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openFotoAset",
      ((id: string) => setFotoModalAsetId(id)) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "atSetView",
      ((v: "grid" | "table") => setViewMode(v)) as (...args: never[]) => unknown
    );
  }, [
    syncFromStore,
    openModalForm,
    handleSimpanAset,
    checkAndRunAutoPenyusutan,
    handleToggleAuto,
    handleBuatJurnalBulanan,
    handleDisposalAset,
    handleHapusAset,
  ]);

  const kpi = useMemo(() => {
    const aktif = asetList.filter((a) => a.status === "aktif");
    const totalPerolehan = aktif.reduce((s, a) => s + a.hargaPerolehan, 0);
    const totalAkum = aktif.reduce(
      (s, a) => s + hitungPenyusutanAset(a).akumPenyusutan,
      0
    );
    const totalNilaiBuku = aktif.reduce(
      (s, a) => s + hitungPenyusutanAset(a).nilaiBuku,
      0
    );
    const pctSusut = totalPerolehan
      ? Math.round((totalAkum / totalPerolehan) * 100)
      : 0;
    return {
      aktifCount: aktif.length,
      totalPerolehan,
      totalAkum,
      totalNilaiBuku,
      pctSusut,
    };
  }, [asetList]);

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return asetList.filter(
      (a) =>
        (filterStatus === "all" || a.status === filterStatus) &&
        (!q || a.nama.toLowerCase().includes(q))
    );
  }, [asetList, filterStatus, search]);

  const fotoMap = useMemo(() => {
    void fotoRevision;
    return getAtFotoAll();
  }, [fotoRevision]);

  const activeFotoAset = useMemo(
    () => (fotoModalAsetId ? asetList.find((a) => a.id === fotoModalAsetId) : null),
    [asetList, fotoModalAsetId]
  );

  const activeFotos = useMemo(() => {
    void fotoRevision;
    return fotoModalAsetId ? getAtFoto(fotoModalAsetId) : [];
  }, [fotoModalAsetId, fotoRevision]);

  const autoSubText = autoEnabled
    ? lastRun
      ? `Terakhir: ${new Date(lastRun).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`
      : "Belum pernah dijalankan — berjalan otomatis tiap bulan"
    : "Nonaktif — jurnal tidak dibuat otomatis";

  return (
    <div className="page" id="page-aset-tetap" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Register Aset Tetap</div>
          <div className="section-sub">
            Daftar aset · Foto lampiran · Penyusutan otomatis · Nilai buku
          </div>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className="btn btn-primary btn-sm"
          onClick={() => openModalForm(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <Plus size={14} /> Tambah Aset
        </motion.button>
      </div>

      {/* KPI Cards */}
      <div
        id="at-kpi"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        {[
          {
            label: "Jumlah Aset Aktif",
            val: `${kpi.aktifCount} aset`,
            Icon: Factory,
            clr: "var(--accent2)",
          },
          {
            label: "Total Harga Perolehan",
            val: rp(kpi.totalPerolehan),
            Icon: DollarSign,
            clr: "var(--accent)",
          },
          {
            label: "Akum. Penyusutan",
            val: `${rp(kpi.totalAkum)} (${kpi.pctSusut}%)`,
            Icon: TrendingDown,
            clr: "var(--red)",
          },
          {
            label: "Total Nilai Buku",
            val: rp(kpi.totalNilaiBuku),
            Icon: FileText,
            clr: "var(--accent3)",
          },
        ].map(({ label, val, Icon, clr }) => (
          <div
            key={label}
            style={{
              flex: 1,
              minWidth: "140px",
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: "12px",
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Icon size={13} /> {label}
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: clr,
                marginTop: "4px",
              }}
            >
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Auto Penyusutan Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "160px" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Clock size={14} style={{ color: "var(--accent2)" }} /> Penyusutan
            Otomatis
          </div>
          <div
            style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}
            id="at-auto-sub"
          >
            {autoSubText}
          </div>
        </div>
        <label
          style={{
            position: "relative",
            display: "inline-block",
            width: "40px",
            height: "22px",
            flexShrink: 0,
          }}
        >
          <input
            type="checkbox"
            id="at-auto-toggle"
            checked={autoEnabled}
            onChange={(e) => handleToggleAuto(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            id="at-toggle-slider"
            style={{
              position: "absolute",
              cursor: "pointer",
              inset: 0,
              background: "rgba(255,255,255,0.1)",
              borderRadius: "22px",
              transition: ".25s",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleBuatJurnalBulanan}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <SlidersHorizontal size={12} /> Jalankan Sekarang
        </button>
      </div>

      {/* Warning banner */}
      {!autoEnabled ? (
        <div
          id="at-warn-banner"
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "10px",
            padding: "11px 14px",
            marginBottom: "12px",
            fontSize: "12.5px",
            color: "var(--accent3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={17} style={{ flexShrink: 0 }} />
          <div>
            <b>Penyusutan Otomatis dinonaktifkan.</b> Klik{" "}
            <b>Jalankan Sekarang</b> tiap akhir bulan untuk membuat jurnal
            penyusutan secara manual.
          </div>
        </div>
      ) : null}

      {/* Filter + View Toggle */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "14px",
          alignItems: "center",
        }}
      >
        <select
          id="at-filter-status"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as "all" | "aktif" | "disposal")
          }
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "7px 12px",
            color: "var(--text)",
            fontSize: "13px",
          }}
        >
          <option value="all">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="disposal">Disposal</option>
        </select>
        <input
          type="text"
          id="at-search"
          placeholder="Cari nama aset..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: "180px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "7px 12px",
            color: "var(--text)",
            fontSize: "13px",
          }}
        />
        <div
          style={{
            display: "flex",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            className={`at-view-btn${viewMode === "grid" ? " active" : ""}`}
            id="at-view-btn-grid"
            onClick={() => setViewMode("grid")}
            title="Grid"
            aria-label="Tampilan grid"
            style={{
              background: "none",
              border: "none",
              padding: "6px 11px",
              cursor: "pointer",
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`at-view-btn${viewMode === "table" ? " active" : ""}`}
            id="at-view-btn-table"
            onClick={() => setViewMode("table")}
            title="Tabel"
            aria-label="Tampilan tabel"
            style={{
              background: "none",
              border: "none",
              borderLeft: "1px solid var(--border)",
              padding: "6px 11px",
              cursor: "pointer",
              color: "var(--muted)",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <Table2 size={15} />
          </button>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" ? (
        <div id="at-grid-view">
          <div
            id="at-card-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(270px,1fr))",
              gap: "14px",
              marginBottom: "16px",
            }}
          >
            {filteredList.length === 0 ? (
              <div
                style={{
                  gridColumn: "1/-1",
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--muted)",
                }}
              >
                <Factory
                  size={36}
                  style={{
                    display: "block",
                    margin: "0 auto 12px",
                    opacity: 0.3,
                  }}
                />
                Belum ada aset. Klik <b>Tambah Aset</b> untuk mulai.
              </div>
            ) : (
              filteredList.map((a) => {
                const { akumPenyusutan, nilaiBuku } = hitungPenyusutanAset(a);
                const pct = a.hargaPerolehan
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round((nilaiBuku / a.hargaPerolehan) * 100)
                      )
                    )
                  : 0;
                const fotos = fotoMap[a.id] || [];
                const CatIcon = CATEGORY_ICON_MAP[a.kategori] || Package;
                const isLow = pct < 25;
                const isDisp = a.status === "disposal";

                return (
                  <div
                    key={a.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      transition: "border-color 0.15s",
                      opacity: isDisp ? 0.55 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "140px",
                        background: "var(--surface2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                    >
                      {fotos.length > 0 ? (
                        <img
                          src={fotos[0].data}
                          alt={a.nama}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <CatIcon
                          size={48}
                          style={{ opacity: 0.3, color: "var(--accent2)" }}
                        />
                      )}
                      {isDisp ? (
                        <span
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "rgba(239,68,68,0.8)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          Disposal
                        </span>
                      ) : pct < 20 ? (
                        <span
                          style={{
                            position: "absolute",
                            top: "8px",
                            right: "8px",
                            background: "rgba(239,68,68,0.8)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          Hampir Habis
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setFotoModalAsetId(a.id)}
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          right: "8px",
                          background: "rgba(0,0,0,0.55)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          color: "#fff",
                          borderRadius: "8px",
                          padding: "4px 9px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Camera size={11} />
                        {fotos.length ? `${fotos.length} Foto` : "+ Foto"}
                      </button>
                    </div>

                    <div
                      style={{
                        padding: "12px 14px",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 700,
                            color: "var(--text)",
                          }}
                        >
                          {a.nama}
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "5px",
                            background: "rgba(34,211,238,0.1)",
                            color: "var(--accent2)",
                          }}
                        >
                          {a.kategori}
                        </span>
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "10px",
                            color: "var(--muted)",
                            marginBottom: "3px",
                          }}
                        >
                          <span>Nilai Buku tersisa</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: isLow ? "var(--red)" : "var(--accent)",
                            }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: "5px",
                            background: "rgba(255,255,255,0.08)",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: "3px",
                              background: isLow
                                ? "linear-gradient(to right,#ef4444,#f97316)"
                                : "linear-gradient(to right,var(--accent),var(--accent2))",
                              transition: "width 0.4s",
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <div
                          style={{
                            flex: 1,
                            background: "var(--surface2)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "9px",
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              letterSpacing: ".05em",
                            }}
                          >
                            Nilai Buku
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: isLow ? "var(--red)" : "var(--accent)",
                              fontFamily: "var(--mono)",
                              marginTop: "1px",
                            }}
                          >
                            {rp(nilaiBuku)}
                          </div>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            background: "var(--surface2)",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "9px",
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              letterSpacing: ".05em",
                            }}
                          >
                            Disusutkan
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "var(--red)",
                              fontFamily: "var(--mono)",
                              marginTop: "1px",
                            }}
                          >
                            {rp(akumPenyusutan)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--muted)",
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Calendar size={10} /> {a.tglPerolehan}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <TrendingUp size={10} />{" "}
                          {a.metode === "garis-lurus"
                            ? "Garis Lurus"
                            : "Saldo Menurun"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <Clock size={10} /> {a.umurEkonomis} thn
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        borderTop: "1px solid var(--border)",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setFotoModalAsetId(a.id)}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          borderRight: "1px solid var(--border)",
                          color: "var(--muted)",
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <Camera size={12} />
                        {fotos.length ? (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "var(--accent2)",
                            }}
                          >
                            {fotos.length}
                          </span>
                        ) : (
                          "Foto"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openModalForm(a.id)}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          borderRight: "1px solid var(--border)",
                          color: "var(--muted)",
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      {a.status === "aktif" ? (
                        <button
                          type="button"
                          onClick={() => handleDisposalAset(a.id)}
                          title="Tandai Disposal"
                          aria-label={`Disposal ${a.nama}`}
                          style={{
                            flex: 1,
                            background: "none",
                            border: "none",
                            borderRight: "1px solid var(--border)",
                            color: "var(--muted)",
                            padding: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <ArrowUp size={12} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleHapusAset(a.id)}
                        title="Hapus aset"
                        aria-label={`Hapus ${a.nama}`}
                        style={{
                          flex: 1,
                          background: "none",
                          border: "none",
                          color: "var(--muted)",
                          padding: "8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div id="at-table-view">
          <div className="table-card">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nama Aset</th>
                    <th>Kategori</th>
                    <th>Tgl Perolehan</th>
                    <th style={{ textAlign: "right" }}>Harga Perolehan</th>
                    <th style={{ textAlign: "right" }}>Akum. Penyusutan</th>
                    <th style={{ textAlign: "right" }}>Nilai Buku</th>
                    <th>Metode</th>
                    <th>Status</th>
                    <th style={{ width: "130px" }} />
                  </tr>
                </thead>
                <tbody id="at-tbody">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          textAlign: "center",
                          color: "var(--muted)",
                          padding: "32px",
                        }}
                      >
                        Belum ada aset
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((a) => {
                      const { akumPenyusutan, nilaiBuku } =
                        hitungPenyusutanAset(a);
                      const fotoCount = (fotoMap[a.id] || []).length;
                      return (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 500 }}>{a.nama}</td>
                          <td>
                            <span
                              style={{
                                background: "rgba(34,211,238,0.14)",
                                color: "var(--accent2)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                              }}
                            >
                              {a.kategori}
                            </span>
                          </td>
                          <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {a.tglPerolehan}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--mono)",
                            }}
                          >
                            {rp(a.hargaPerolehan)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--mono)",
                              color: "var(--red)",
                            }}
                          >
                            {rp(akumPenyusutan)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontFamily: "var(--mono)",
                              fontWeight: 600,
                              color:
                                nilaiBuku > 0 ? "var(--accent)" : "var(--muted)",
                            }}
                          >
                            {rp(nilaiBuku)}
                          </td>
                          <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {a.metode === "garis-lurus"
                              ? "Garis Lurus"
                              : "Saldo Menurun"}
                          </td>
                          <td>
                            {a.status === "aktif" ? (
                              <span
                                style={{
                                  background: "rgba(74,222,128,0.14)",
                                  color: "var(--accent)",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                }}
                              >
                                Aktif
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: "rgba(248,113,113,0.14)",
                                  color: "var(--red)",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                }}
                              >
                                Disposal
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setFotoModalAsetId(a.id)}
                                style={
                                  fotoCount
                                    ? { color: "var(--accent2)" }
                                    : undefined
                                }
                              >
                                <Camera size={12} />
                                {fotoCount ? (
                                  <span style={{ fontSize: "10px" }}>
                                    {fotoCount}
                                  </span>
                                ) : null}
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openModalForm(a.id)}
                              >
                                <Pencil size={12} />
                              </button>
                              {a.status === "aktif" ? (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleDisposalAset(a.id)}
                                >
                                  <Upload size={12} />
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleHapusAset(a.id)}
                              >
                                <Trash2 size={12} />
                              </button>
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
      )}

      <div id="at-jurnal-info" style={{ marginTop: "12px" }} />

      {/* Modal Tambah / Edit Aset */}
      <OasModalDialog
        id="modal-aset-tetap"
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="520px"
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Factory size={16} />{" "}
            {editId ? "Edit Aset Tetap" : "Tambah Aset Tetap"}
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFormOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimpanAset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Save size={14} /> Simpan Aset
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="at-nama">Nama Aset *</label>
            <input
              type="text"
              id="at-nama"
              placeholder="Kendaraan Operasional"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="at-kategori">Kategori</label>
            <select
              id="at-kategori"
              style={{ width: "100%" }}
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {AT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="at-tgl-perolehan">Tanggal Perolehan *</label>
            <div className="date-input-wrap">
              <input
                type="date"
                id="at-tgl-perolehan"
                value={tglPerolehan}
                onChange={(e) => setTglPerolehan(e.target.value)}
              />
              <span className="date-input-icon">
                <Calendar size={15} />
              </span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="at-harga">Harga Perolehan (Rp) *</label>
            <input
              type="number"
              id="at-harga"
              placeholder="0"
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="at-residu">Nilai Residu (Rp)</label>
            <input
              type="number"
              id="at-residu"
              placeholder="0"
              value={residu}
              onChange={(e) => setResidu(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="at-umur">Umur Ekonomis (Tahun) *</label>
            <input
              type="number"
              id="at-umur"
              placeholder="5"
              min="1"
              value={umur}
              onChange={(e) => setUmur(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="at-metode">Metode Penyusutan</label>
            <select
              id="at-metode"
              style={{ width: "100%" }}
              value={metode}
              onChange={(e) => setMetode(e.target.value as AsetTetapMetode)}
            >
              <option value="garis-lurus">Garis Lurus (Straight-Line)</option>
              <option value="saldo-menurun">
                Saldo Menurun (Double Declining)
              </option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="at-lokasi">Lokasi / Keterangan</label>
            <input
              type="text"
              id="at-lokasi"
              placeholder="Kantor Pusat"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text)",
            }}
          >
            <input
              type="checkbox"
              id="at-buat-jurnal"
              checked={buatJurnal}
              onChange={(e) => setBuatJurnal(e.target.checked)}
              style={{ accentColor: "var(--accent)", flexShrink: 0 }}
            />
            Buat Jurnal Perolehan Otomatis (Aset Tetap/Kredit Kas)
          </label>
        </div>
      </OasModalDialog>

      {/* Modal Foto Lampiran Aset */}
      <OasModalDialog
        id="modal-aset-foto"
        open={fotoModalAsetId !== null}
        onClose={() => setFotoModalAsetId(null)}
        maxWidth="480px"
        title={
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Camera size={15} />{" "}
            {activeFotoAset ? `Foto — ${activeFotoAset.nama}` : "Foto Aset"}
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setFotoModalAsetId(null)}
            >
              Tutup
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Plus size={12} /> Tambah
            </button>
          </>
        }
      >
        <input
          ref={fileInputRef}
          type="file"
          id="at-foto-input"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleFotoUpload}
        />
        <div
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            marginBottom: "12px",
          }}
        >
          Foto tampil sebagai thumbnail kartu aset. Maks 5MB per foto.
        </div>
        <div
          id="at-foto-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          {activeFotos.map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="at-foto-item"
              onClick={() => setLightboxFoto(f)}
            >
              <img src={f.data} alt={f.name} loading="lazy" />
              <button
                type="button"
                className="at-foto-item-del"
                aria-label="Hapus foto"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fotoModalAsetId) handleDeleteFoto(fotoModalAsetId, idx);
                }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="at-foto-add"
            onClick={() => fileInputRef.current?.click()}
            style={{
              aspectRatio: "1",
              borderRadius: "10px",
              border: "2px dashed var(--border)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: "6px",
              background: "var(--surface)",
              color: "var(--muted)",
              fontSize: "11px",
            }}
          >
            <Camera size={22} />
            <span>{activeFotos.length ? "Tambah" : "Tambah Foto"}</span>
          </button>
        </div>
        {activeFotos.length === 0 ? (
          <div
            id="at-foto-empty"
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            <ImageOff
              size={28}
              style={{
                display: "block",
                margin: "0 auto 8px",
                opacity: 0.4,
              }}
            />
            Belum ada foto
          </div>
        ) : null}
      </OasModalDialog>

      {/* Photo Lightbox */}
      {lightboxFoto ? (
        <div
          role="presentation"
          onClick={() => setLightboxFoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            cursor: "pointer",
          }}
        >
          <img
            src={lightboxFoto.data}
            alt={lightboxFoto.name}
            style={{
              maxWidth: "92vw",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>
            {lightboxFoto.name} · Klik untuk tutup
          </div>
        </div>
      ) : null}
    </div>
  );
}
