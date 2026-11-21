"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  Lock,
  Plus,
  Settings,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  agingHariIni,
  appendKalkRowsToKatStore,
  fmtRp,
  getLegacyKsStore,
  hitungSaldoKat,
  initMultiKartuStockStore,
  JENIS_JURNAL,
  konversiMetodeRows,
  KS_METODE_DIAKUI,
  ksDefaultData,
  readMksMap,
  rekalkulasiStorage,
  saveMksStore,
  setOasWindowFn,
  writeMksMap,
  type KsCard,
  type KsEntry,
  type KsMetode,
} from "@/lib";
import {
  KsEditModal,
  KsJurnalModal,
  KsKelolaModal,
  KsKonversiModal,
  KsPilihModal,
  type KsEditModalState,
} from "./index";

interface KsWin {
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, aksi?: string) => boolean;
  isReadOnly?: () => boolean;
  addJurnal?: (entry: Record<string, unknown>) => { no?: string } | null;
  saveToStorage?: (showToast?: boolean) => void;
  renderDashboard?: () => void;
  renderJurnalUmum?: () => void;
  _invKartu?: Array<{
    tgl?: string;
    ket?: string;
    mQty?: number | string;
    mHarga?: number | string;
    kQty?: number | string;
  }>;
  _invMetode?: KsMetode;
}

const getWin = () => window as unknown as KsWin;

export default function KartuStockPanel() {
  const [mks, setMks] = useState<Record<string, KsCard>>({});
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeKatId, setActiveKatId] = useState<string | null>(null);
  const [metode, setMetode] = useState<KsMetode>("fifo");

  const [editModal, setEditModal] = useState<KsEditModalState>({
    open: false,
    mode: "add-card",
    cardId: "",
    katId: "",
    nama: "",
    satuan: "unit",
  });
  const [kelolaOpen, setKelolaOpen] = useState(false);
  const [konversiOpen, setKonversiOpen] = useState(false);

  const [pilihOpen, setPilihOpen] = useState(false);
  const [pilihMetode, setPilihMetode] = useState<KsMetode>("fifo");
  const [pilihKatId, setPilihKatId] = useState("");

  const [jurnalOpen, setJurnalOpen] = useState(false);
  const [jurnalCandidates, setJurnalCandidates] = useState<
    Array<{ idx: number; entry: KsEntry }>
  >([]);
  const [jurnalSelected, setJurnalSelected] = useState<number[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  const syncFromStore = useCallback(() => {
    const initialized = initMultiKartuStockStore();
    const map = readMksMap();
    const ids = getLegacyKsStore()?.getActiveIds?.() ?? initialized;
    const tab = (getLegacyKsStore()?.getKartuStockTab?.() || "fifo") as KsMetode;
    setMks({ ...map });
    setActiveCardId(ids.cardId);
    setActiveKatId(ids.katId);
    setMetode(tab);
    setReadOnly(Boolean(getWin().isReadOnly?.()));
  }, []);

  const switchCard = useCallback(
    (cardId: string, katId?: string) => {
      const map = readMksMap();
      const card = map[cardId];
      if (!card) return;
      const nextKat =
        katId && card.kategori?.[katId]
          ? katId
          : Object.keys(card.kategori || {})[0] || null;
      getLegacyKsStore()?.setActiveKartuStock?.(cardId, nextKat);
      if (nextKat && card.kategori?.[nextKat]) {
        getLegacyKsStore()?.setKartuStockData?.(
          JSON.parse(JSON.stringify(card.kategori[nextKat].data || ksDefaultData()))
        );
      }
      setActiveCardId(cardId);
      setActiveKatId(nextKat);
      setMks({ ...map });
    },
    []
  );

  const switchKat = useCallback(
    (katId: string) => {
      if (!activeCardId) return;
      switchCard(activeCardId, katId);
    },
    [activeCardId, switchCard]
  );

  const switchMetode = useCallback((m: KsMetode) => {
    getLegacyKsStore()?.setKartuStockTab?.(m);
    setMetode(m);
  }, []);

  const openAddCard = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("produk", "create")) return;
    setEditModal({
      open: true,
      mode: "add-card",
      cardId: "",
      katId: "",
      nama: "",
      satuan: "unit",
    });
  }, []);

  const handleSaveEditModal = useCallback(() => {
    const w = getWin();
    const nama = editModal.nama.trim();
    if (!nama) return void w.showAlert?.("Nama wajib diisi.");
    const map = { ...readMksMap() };
    const satuan = editModal.satuan.trim() || "unit";

    if (editModal.mode === "add-card") {
      const cardId = "card_" + Date.now();
      const katId = "kat_" + Date.now();
      map[cardId] = {
        id: cardId,
        nama,
        satuan: "unit",
        createdAt: new Date().toISOString(),
        kategori: {
          [katId]: {
            id: katId,
            nama,
            satuan: "unit",
            deskripsi: "",
            data: ksDefaultData(),
          },
        },
      };
      writeMksMap(map);
      getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
      saveMksStore();
    } else if (editModal.mode === "edit-card" && map[editModal.cardId]) {
      map[editModal.cardId] = { ...map[editModal.cardId], nama };
      writeMksMap(map);
      saveMksStore();
    } else if (editModal.mode === "add-kat" && map[editModal.cardId]) {
      const katId = "kat_" + Date.now();
      const card = { ...map[editModal.cardId] };
      card.kategori = {
        ...(card.kategori || {}),
        [katId]: { id: katId, nama, satuan, deskripsi: "", data: ksDefaultData() },
      };
      map[editModal.cardId] = card;
      writeMksMap(map);
      getLegacyKsStore()?.setActiveKartuStock?.(editModal.cardId, katId);
      saveMksStore();
    } else if (
      editModal.mode === "edit-kat" &&
      map[editModal.cardId]?.kategori?.[editModal.katId]
    ) {
      const card = { ...map[editModal.cardId] };
      card.kategori = {
        ...card.kategori,
        [editModal.katId]: {
          ...card.kategori[editModal.katId],
          nama,
          satuan,
        },
      };
      map[editModal.cardId] = card;
      writeMksMap(map);
      saveMksStore();
    }

    setEditModal((s) => ({ ...s, open: false }));
    syncFromStore();
    w.showAlert?.(`Kartu Stock "${nama}" disimpan!`);
  }, [editModal, syncFromStore]);

  const handleToggleLock = useCallback(
    (cardId: string) => {
      const map = { ...readMksMap() };
      if (!map[cardId]) return;
      map[cardId] = { ...map[cardId], lockedFromTrx: !map[cardId].lockedFromTrx };
      writeMksMap(map);
      saveMksStore();
      syncFromStore();
    },
    [syncFromStore]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      const w = getWin();
      const map = { ...readMksMap() };
      const card = map[cardId];
      if (!card || Object.keys(map).length <= 1) return;
      const run = () => {
        delete map[cardId];
        writeMksMap(map);
        saveMksStore();
        syncFromStore();
        w.showAlert?.(`Kartu Stock "${card.nama}" dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(`Hapus kartu stock "${card.nama}" beserta seluruh kategorinya?`, run);
      else run();
    },
    [syncFromStore]
  );

  const handleDeleteKat = useCallback(
    (cardId: string, katId: string) => {
      const w = getWin();
      const map = { ...readMksMap() };
      const card = map[cardId];
      const kat = card?.kategori?.[katId];
      if (!card || !kat || Object.keys(card.kategori).length <= 1) return;
      const run = () => {
        const nextKat = { ...card.kategori };
        delete nextKat[katId];
        map[cardId] = { ...card, kategori: nextKat };
        writeMksMap(map);
        saveMksStore();
        syncFromStore();
        w.showAlert?.(`Kategori "${kat.nama}" dihapus.`);
      };
      if (w.showConfirm) w.showConfirm(`Hapus kategori "${kat.nama}"?`, run);
      else run();
    },
    [syncFromStore]
  );

  const handleInputDariKalkulator = useCallback(() => {
    const w = getWin();
    const kartu = w._invKartu;
    const targetM =
      ((document.getElementById("inv-metode") as HTMLSelectElement | null)
        ?.value as KsMetode) ||
      w._invMetode ||
      "fifo";
    if (!kartu || !kartu.length) {
      return void w.showAlert?.("Hitung persediaan dulu!");
    }
    const ids = initMultiKartuStockStore();
    setMks({ ...readMksMap() });
    setPilihMetode(targetM);
    setPilihKatId(ids.katId || "");
    setPilihOpen(true);
  }, []);

  const handleConfirmPilih = useCallback(() => {
    const w = getWin();
    const kartu = w._invKartu;
    if (!pilihKatId || !kartu?.length) return;
    appendKalkRowsToKatStore(pilihKatId, kartu, pilihMetode);
    getLegacyKsStore()?.setKartuStockTab?.(pilihMetode);
    setPilihOpen(false);
    syncFromStore();
    w.showAlert?.(`Berhasil disimpan ke Kartu Stock (${pilihMetode.toUpperCase()})!`);
    setTimeout(() => {
      document
        .getElementById("catatan-persediaan-wrap")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, [pilihKatId, pilihMetode, syncFromStore]);

  const handleDeleteRow = useCallback(
    (idx: number) => {
      const w = getWin();
      if (!activeCardId || !activeKatId) return;
      const run = () => {
        const map = { ...readMksMap() };
        const kat = map[activeCardId]?.kategori?.[activeKatId];
        if (!kat) return;
        const rows = (kat.data?.[metode] || []).filter((_, i) => i !== idx);
        kat.data[metode] = rekalkulasiStorage(rows, metode);
        writeMksMap(map);
        saveMksStore();
        syncFromStore();
      };
      if (w.showConfirm) w.showConfirm("Hapus baris catatan persediaan ini?", run);
      else run();
    },
    [activeCardId, activeKatId, metode, syncFromStore]
  );

  const handleClearMetode = useCallback(() => {
    const w = getWin();
    if (!activeCardId || !activeKatId) return;
    const run = () => {
      const map = { ...readMksMap() };
      const kat = map[activeCardId]?.kategori?.[activeKatId];
      if (!kat) return;
      kat.data[metode] = [];
      writeMksMap(map);
      saveMksStore();
      syncFromStore();
      w.showAlert?.(`Semua catatan metode ${metode.toUpperCase()} dihapus.`);
    };
    if (w.showConfirm) {
      w.showConfirm(
        `Hapus semua catatan pada metode ${metode.toUpperCase()} untuk kategori ini?`,
        run
      );
    } else run();
  }, [activeCardId, activeKatId, metode, syncFromStore]);

  const handleExecuteKonversi = useCallback(
    (dari: KsMetode, ke: KsMetode, mode: "gabung" | "timpa", hapusSumber: boolean) => {
      const w = getWin();
      if (!activeCardId || !activeKatId) return;
      const map = { ...readMksMap() };
      const kat = map[activeCardId]?.kategori?.[activeKatId];
      if (!kat) return;
      kat.data[ke] = konversiMetodeRows(kat.data[dari] || [], kat.data[ke] || [], ke, mode);
      if (hapusSumber) kat.data[dari] = [];
      writeMksMap(map);
      getLegacyKsStore()?.setKartuStockTab?.(ke);
      saveMksStore();
      setKonversiOpen(false);
      syncFromStore();
      w.showAlert?.(`Konversi ${dari.toUpperCase()} → ${ke.toUpperCase()} selesai!`);
    },
    [activeCardId, activeKatId, syncFromStore]
  );

  const openJurnalModal = useCallback(
    (singleIdx?: number) => {
      if (!activeCardId || !activeKatId) return;
      const kat = readMksMap()[activeCardId]?.kategori?.[activeKatId];
      const storage = kat?.data?.[metode] || [];
      const items =
        singleIdx !== undefined
          ? storage[singleIdx]
            ? [{ idx: singleIdx, entry: storage[singleIdx] }]
            : []
          : storage
              .map((entry, idx) => ({ idx, entry }))
              .filter(({ entry }) => entry.kQty > 0 && !entry.jurnalDone);
      setJurnalCandidates(items);
      setJurnalSelected(items.map((x) => x.idx));
      setJurnalOpen(true);
    },
    [activeCardId, activeKatId, metode]
  );

  const handleConfirmJurnal = useCallback(() => {
    const w = getWin();
    if (!activeCardId || !activeKatId || !jurnalSelected.length) return;
    const map = { ...readMksMap() };
    const kat = map[activeCardId]?.kategori?.[activeKatId];
    if (!kat) return;
    const storage = kat.data?.[metode] || [];
    const today = agingHariIni();
    let count = 0;

    jurnalSelected.forEach((idx) => {
      const e = storage[idx];
      if (!e || e.kJml <= 0) return;
      const posted = w.addJurnal?.({
        tanggal: e.tgl || today,
        ket: `Pengakuan HPP ${metode.toUpperCase()} - ${e.ket || kat.nama}`,
        jenis: JENIS_JURNAL.KARTU_STOCK,
        lines: [
          { akun: "5101", ket: "HPP - Harga Pokok Penjualan", debit: e.kJml, kredit: 0 },
          { akun: "1301", ket: "Persediaan Barang Dagangan", debit: 0, kredit: e.kJml },
        ],
      });
      if (posted) {
        e.jurnalDone = true;
        count++;
      }
    });

    if (count > 0) {
      w.saveToStorage?.(false);
      writeMksMap(map);
      saveMksStore();
      syncFromStore();
      w.renderDashboard?.();
      w.renderJurnalUmum?.();
      w.showAlert?.(`${count} jurnal HPP berhasil diinput!`);
    }
    setJurnalOpen(false);
  }, [activeCardId, activeKatId, jurnalSelected, metode, syncFromStore]);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderKartuStock", syncFromStore as (...args: never[]) => unknown);
    setOasWindowFn("renderKartuStockSelector", syncFromStore as (...args: never[]) => unknown);
    setOasWindowFn("openModalTambahKS", openAddCard as (...args: never[]) => unknown);
    setOasWindowFn("openModalKelolaSemuaKartuStock", (() => setKelolaOpen(true)) as (...args: never[]) => unknown);
    setOasWindowFn("openKonversiKartuStock", (() => setKonversiOpen(true)) as (...args: never[]) => unknown);
    setOasWindowFn("inputKeKartuStock", handleInputDariKalkulator as (...args: never[]) => unknown);
    setOasWindowFn("switchActiveKS", switchCard as (...args: never[]) => unknown);
    setOasWindowFn("switchActiveKategori", switchKat as (...args: never[]) => unknown);
    setOasWindowFn("switchKartuStockTab", switchMetode as (...args: never[]) => unknown);
    setOasWindowFn("toggleKartuStockLock", handleToggleLock as (...args: never[]) => unknown);
  }, [
    handleInputDariKalkulator,
    handleToggleLock,
    openAddCard,
    switchCard,
    switchKat,
    switchMetode,
    syncFromStore,
  ]);

  const cards = useMemo(() => Object.values(mks), [mks]);
  const activeCard = activeCardId ? mks[activeCardId] || cards[0] || null : cards[0] || null;
  const kats = useMemo(() => Object.values(activeCard?.kategori || {}), [activeCard]);
  const activeKat =
    (activeKatId && activeCard?.kategori?.[activeKatId]) || kats[0] || null;
  const storage = useMemo(
    () => (activeKat?.data?.[metode] || []) as KsEntry[],
    [activeKat, metode]
  );
  const hasLifo = (activeKat?.data?.lifo || []).length > 0;
  const metodeOptions: KsMetode[] = hasLifo
    ? [...KS_METODE_DIAKUI, "lifo"]
    : [...KS_METODE_DIAKUI];

  const summary = useMemo(() => {
    const totalMasuk = storage.reduce((s, e) => s + e.mQty * e.mHarga, 0);
    const totalKeluar = storage.reduce((s, e) => s + (e.kJml || 0), 0);
    const last = storage[storage.length - 1];
    const lastLayers = (last?.saldoLayers || []).filter((l) => l.qty > 0);
    const saldoQty = lastLayers.reduce((s, l) => s + l.qty, 0);
    const saldoNilai = lastLayers.reduce((s, l) => s + l.qty * l.harga, 0);
    const unjournaledCount = storage.filter((e) => e.kQty > 0 && !e.jurnalDone).length;
    return { totalMasuk, totalKeluar, saldoQty, saldoNilai, unjournaledCount };
  }, [storage]);

  return (
    <>
      <div
        id="catatan-persediaan-wrap"
        className="table-card"
        style={{ marginTop: "20px" }}
        data-react-managed="1"
      >
        <div
          className="table-header"
          style={{
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={activeCard?.id || ""}
              onChange={(e) => switchCard(e.target.value)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: "13px",
              }}
            >
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama}
                </option>
              ))}
            </select>

            <select
              id="ks-metode-current"
              value={metode}
              onChange={(e) => switchMetode(e.target.value as KsMetode)}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--accent2)",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              {metodeOptions.map((m) => (
                <option key={m} value={m}>
                  Metode: {m.toUpperCase()}
                </option>
              ))}
            </select>

            {activeCard && !readOnly && (
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => handleToggleLock(activeCard.id)}
                title={
                  activeCard.lockedFromTrx
                    ? "Terkunci dari form transaksi"
                    : "Aktif di form transaksi"
                }
              >
                {activeCard.lockedFromTrx ? <Lock size={13} /> : <Unlock size={13} />}
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {!readOnly && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setKonversiOpen(true)}
                >
                  <ArrowLeftRight size={13} /> Konversi
                </button>
                {summary.unjournaledCount > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => openJurnalModal()}
                  >
                    <BookOpen size={13} /> Jurnal HPP ({summary.unjournaledCount})
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setKelolaOpen(true)}
                >
                  <Settings size={13} /> Kelola
                </button>
                {storage.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    style={{ color: "var(--danger)" }}
                    onClick={handleClearMetode}
                  >
                    <Trash2 size={13} /> Bersihkan
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Kategori tabs */}
        <div
          id="ks-selector-wrap"
          style={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
          }}
        >
          {kats.map((kat) => {
            const isActive = activeKat?.id === kat.id;
            const s = hitungSaldoKat(kat);
            return (
              <button
                key={kat.id}
                type="button"
                className={`btn btn-sm ${isActive ? "btn-primary" : "btn-ghost"}`}
                onClick={() => switchKat(kat.id)}
              >
                {kat.nama} ({s.totalQty} {kat.satuan || "unit"})
              </button>
            );
          })}
          {!readOnly && activeCard && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setEditModal({
                  open: true,
                  mode: "add-kat",
                  cardId: activeCard.id,
                  katId: "",
                  nama: "",
                  satuan: "unit",
                })
              }
            >
              <Plus size={12} /> Kategori
            </button>
          )}
        </div>

        {/* Summary strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
            gap: "8px",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface2)",
          }}
        >
          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>Total Masuk</div>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "13px" }}>{fmtRp(summary.totalMasuk)}</div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>Total HPP Keluar</div>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "13px", color: "var(--accent3)" }}>{fmtRp(summary.totalKeluar)}</div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>Saldo Qty Akhir</div>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "13px", color: "var(--accent2)" }}>
              {summary.saldoQty.toLocaleString("id-ID")} {activeKat?.satuan || "unit"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>Nilai Persediaan Akhir</div>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "13px", color: "var(--accent)" }}>{fmtRp(summary.saldoNilai)}</div>
          </div>
        </div>

        {/* Kartu Stock table */}
        <div id="kartu-stock-table-wrap" className="table-scroll">
          {!storage.length ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              Belum ada catatan persediaan pada metode <b>{metode.toUpperCase()}</b> untuk{" "}
              <b>{activeKat?.nama || "kategori ini"}</b>. Hitung persediaan di atas lalu klik
              &quot;Input ke Kartu Stock&quot;, atau catat Pembelian/Penjualan di Input Transaksi.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>Tgl</th>
                  <th rowSpan={2}>Ket</th>
                  <th colSpan={3} style={{ textAlign: "center", borderLeft: "1px solid var(--border)" }}>MASUK</th>
                  <th colSpan={3} style={{ textAlign: "center", borderLeft: "1px solid var(--border)" }}>KELUAR</th>
                  <th colSpan={3} style={{ textAlign: "center", borderLeft: "1px solid var(--border)" }}>SALDO</th>
                  <th rowSpan={2}>Aksi</th>
                </tr>
                <tr>
                  <th style={{ borderLeft: "1px solid var(--border)" }}>Qty</th>
                  <th>Hrg Beli</th>
                  <th>Jumlah</th>
                  <th style={{ borderLeft: "1px solid var(--border)" }}>Qty</th>
                  <th>HPP/Unit</th>
                  <th>Jumlah</th>
                  <th style={{ borderLeft: "1px solid var(--border)" }}>Qty</th>
                  <th>Hrg</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {storage.map((e, idx) => {
                  const layers = (e.saldoLayers || []).filter((l) => l.qty > 0);
                  const keluarL = e.keluarLayers?.length
                    ? e.keluarLayers
                    : e.kQty > 0
                      ? [{ qty: e.kQty, harga: e.kHarga }]
                      : [];
                  return (
                    <tr key={String(e.id) + "_" + idx}>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "11.5px", whiteSpace: "nowrap" }}>{e.tgl}</td>
                      <td style={{ fontSize: "12px" }}>{e.ket}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", borderLeft: "1px solid var(--border)" }}>
                        {e.mQty > 0 ? e.mQty : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {e.mQty > 0 ? fmtRp(e.mHarga) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: e.mQty > 0 ? "var(--accent)" : undefined }}>
                        {e.mQty > 0 ? fmtRp(e.mQty * e.mHarga) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", borderLeft: "1px solid var(--border)" }}>
                        {keluarL.length ? keluarL.map((l, i) => <div key={i}>{l.qty}</div>) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {keluarL.length ? keluarL.map((l, i) => <div key={i}>{fmtRp(l.harga)}</div>) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: e.kQty > 0 ? "var(--accent3)" : undefined }}>
                        {keluarL.length ? keluarL.map((l, i) => <div key={i}>{fmtRp(l.qty * l.harga)}</div>) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", borderLeft: "1px solid var(--border)" }}>
                        {layers.length ? layers.map((l, i) => <div key={i}>{l.qty}</div>) : "0"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {layers.length ? layers.map((l, i) => <div key={i}>{fmtRp(l.harga)}</div>) : "—"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 600 }}>
                        {layers.length ? layers.map((l, i) => <div key={i}>{fmtRp(l.qty * l.harga)}</div>) : "Rp 0"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                          {e.kQty > 0 &&
                            (e.jurnalDone ? (
                              <span title="Sudah dijurnal" style={{ color: "var(--accent)" }}>
                                <Check size={13} />
                              </span>
                            ) : (
                              !readOnly && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  type="button"
                                  style={{ padding: "2px 5px" }}
                                  title="Input jurnal HPP"
                                  onClick={() => openJurnalModal(idx)}
                                >
                                  <BookOpen size={12} />
                                </button>
                              )
                            ))}
                          {!readOnly && (
                            <button
                              className="btn btn-ghost btn-sm"
                              type="button"
                              style={{ padding: "2px 5px", color: "var(--danger)" }}
                              title="Hapus baris"
                              onClick={() => handleDeleteRow(idx)}
                            >
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
          )}
        </div>
      </div>

      <KsEditModal state={editModal} setState={setEditModal} onSave={handleSaveEditModal} />
      <KsKelolaModal
        open={kelolaOpen}
        onClose={() => setKelolaOpen(false)}
        cards={cards}
        onAddCard={() => {
          setKelolaOpen(false);
          openAddCard();
        }}
        onEditCard={(card) => {
          setKelolaOpen(false);
          setEditModal({
            open: true,
            mode: "edit-card",
            cardId: card.id,
            katId: "",
            nama: card.nama,
            satuan: card.satuan || "unit",
          });
        }}
        onDeleteCard={handleDeleteCard}
        onToggleLock={handleToggleLock}
        onAddKat={(cardId) => {
          setKelolaOpen(false);
          setEditModal({
            open: true,
            mode: "add-kat",
            cardId,
            katId: "",
            nama: "",
            satuan: "unit",
          });
        }}
        onEditKat={(cardId, katId) => {
          const kat = mks[cardId]?.kategori?.[katId];
          if (!kat) return;
          setKelolaOpen(false);
          setEditModal({
            open: true,
            mode: "edit-kat",
            cardId,
            katId,
            nama: kat.nama,
            satuan: kat.satuan || "unit",
          });
        }}
        onDeleteKat={handleDeleteKat}
      />
      <KsPilihModal
        open={pilihOpen}
        onClose={() => setPilihOpen(false)}
        cards={cards}
        tujuanMetode={pilihMetode}
        selectedKatId={pilihKatId}
        setSelectedKatId={setPilihKatId}
        onConfirm={handleConfirmPilih}
      />
      <KsKonversiModal
        open={konversiOpen}
        onClose={() => setKonversiOpen(false)}
        katData={activeKat?.data || null}
        onExecute={handleExecuteKonversi}
      />
      <KsJurnalModal
        open={jurnalOpen}
        onClose={() => setJurnalOpen(false)}
        metode={metode}
        entries={jurnalCandidates}
        selectedIdxs={jurnalSelected}
        setSelectedIdxs={setJurnalSelected}
        onConfirm={handleConfirmJurnal}
      />
    </>
  );
}
