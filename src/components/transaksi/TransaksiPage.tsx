"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Eye,
  Package,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import { resolveAkunSetting } from "@/lib/accounting";
import { guessAkunPersediaanDefault } from "@/lib/default-akuns";
import { fmtRp } from "@/lib/format";
import { callOasGlobal } from "@/lib/legacy-store";
import {
  readAkuns,
  readCurrentCompany,
  readKontakList,
  readMultiKartuStock,
  readProdukList,
  readTransaksiAkunSettings,
  setLegacyActiveKartuStock,
  setLegacyKartuStockTab,
  setLegacyKsJustWroteDirectly,
  setOasWindowFn,
  type KsCardRecord,
  type KsKategoriRecord,
  type KsSaldoSummary,
} from "@/lib/legacy-store";
import type { Akun, JurnalEntry, JurnalLine } from "@/types";

type TrxTab = "simpel" | "kas" | "penjualan" | "pembelian" | "umum";

interface BahanBakuRow {
  rowId: string;
  katId: string;
  katLabel: string;
  qty: string;
}

interface ManualLineRow {
  id: number;
  akun: string;
  ket: string;
  debit: string;
  kredit: string;
}

const JUAL_AKUN_OPTIONS = [
  { value: "4101", label: "Penjualan Barang", sub: "Akun 4101 · Penjualan Barang" },
  { value: "4102", label: "Penjualan Jasa", sub: "Akun 4102 · Penjualan Jasa" },
  { value: "4105", label: "Manufaktur", sub: "Akun 4105 · Penjualan Produk Manufaktur" },
  { value: "4106", label: "Properti", sub: "Akun 4106 · Pendapatan Properti / Sewa" },
  { value: "4107", label: "Bahan Baku", sub: "Akun 4107 · Penjualan Bahan Baku" },
  { value: "4202", label: "Pendapatan Sewa", sub: "Akun 4202 · Pendapatan Sewa" },
  {
    value: "4205",
    label: "Pendapatan Lainnya",
    sub: "Akun 4205 · Pendapatan Non-Operasional Lainnya",
  },
] as const;

const BELI_AKUN_OPTIONS = [
  {
    value: "1301",
    label: "Persediaan Barang Dagangan",
    sub: "Akun 1301 · Stok barang untuk dijual",
  },
  {
    value: "1302",
    label: "Persediaan Bahan Baku",
    sub: "Akun 1302 · Bahan mentah untuk produksi",
  },
  {
    value: "1303",
    label: "Barang Dalam Proses",
    sub: "Akun 1303 · Persediaan WIP / setengah jadi",
  },
  {
    value: "1304",
    label: "Persediaan Barang Jadi",
    sub: "Akun 1304 · Produk siap jual dari manufaktur",
  },
  {
    value: "1401",
    label: "Perlengkapan Kantor",
    sub: "Akun 1401 · Supplies / ATK kantor",
  },
  {
    value: "5101",
    label: "HPP / Beban Pembelian",
    sub: "Akun 5101 · Langsung ke beban HPP",
  },
] as const;

const SIMPEL_TIPE_OPTIONS = [
  {
    value: "masuk",
    label: "Uang Masuk",
    sub: "Penerimaan kas, modal, piutang",
  },
  {
    value: "keluar",
    label: "Uang Keluar",
    sub: "Pengeluaran kas, beban operasional",
  },
] as const;

const METODE_SHORT: Record<string, string> = {
  fifo: "FIFO",
  lifo: "LIFO",
  wa: "WA",
  mwa: "MWA",
};

function findKatById(
  katId: string
): { kat: KsKategoriRecord; card: KsCardRecord } | null {
  const cards = Object.values(readMultiKartuStock());
  for (const card of cards) {
    if (card.kategori && card.kategori[katId]) {
      return { kat: card.kategori[katId], card };
    }
  }
  return null;
}

function readKsSaldo(kat: KsKategoriRecord): KsSaldoSummary {
  const res = callOasGlobal("getKsSaldo", kat);
  if (res && typeof res === "object") return res as KsSaldoSummary;
  return {
    totalQty: 0,
    hppNext: 0,
    totalNilai: 0,
    metode: kat.metode || "fifo",
    layers: [],
  };
}

function readCardSaldo(card: KsCardRecord): { totalQty: number } {
  const res = callOasGlobal("getCardSaldo", card);
  if (res && typeof res === "object" && "totalQty" in res) {
    return res as { totalQty: number };
  }
  return { totalQty: 0 };
}

function isProdukJualAkun(kode: string): boolean {
  return kode === "4101" || kode === "4105" || kode === "4107";
}

function isPersediaanBeliAkun(kode: string, akuns: readonly Akun[]): boolean {
  if (["1301", "1302", "1303", "1304"].includes(kode)) return true;
  const a = akuns.find((x) => x.kode === kode);
  return (
    !!a &&
    ((a.tipe as string) === "Persediaan" || (a.tipe as string) === "Aset Lancar")
  );
}

function getDefaultJualAkunKode(): string {
  const comp = readCurrentCompany();
  const tipe = comp?.type || comp?.tipe || "";
  if (tipe === "jasa") return "4102";
  if (tipe === "properti") return "4106";
  if (tipe === "dagang" || tipe === "manufaktur") return "4101";
  return "4101";
}

export default function TransaksiPage() {
  const [activeTab, setActiveTab] = useState<TrxTab>("simpel");
  const [akuns, setAkuns] = useState<Akun[]>([]);

  // Shared AkunPickerModal target
  const [akunPickerTarget, setAkunPickerTarget] = useState<
    null | { mode: "kas" } | { mode: "manual"; lineId: number }
  >(null);

  // ── Mode Cepat state ──
  const [simpelTipe, setSimpelTipe] = useState<"masuk" | "keluar">("masuk");
  const [simpelTanggal, setSimpelTanggal] = useState("");
  const [simpelJumlah, setSimpelJumlah] = useState("");
  const [simpelKet, setSimpelKet] = useState("");
  const [simpelPreviewLines, setSimpelPreviewLines] = useState<
    JurnalLine[] | null
  >(null);

  // ── Kas state ──
  const [kasTanggal, setKasTanggal] = useState("");
  const [kasJenis, setKasJenis] = useState<"masuk" | "keluar">("masuk");
  const [kasAkunLawan, setKasAkunLawan] = useState("");
  const [kasJumlah, setKasJumlah] = useState("");
  const [kasKet, setKasKet] = useState("");
  const [kasPreviewLines, setKasPreviewLines] = useState<
    Array<{ akun: string; d: number; k: number }> | null
  >(null);

  // ── Penjualan state ──
  const [jualTanggal, setJualTanggal] = useState("");
  const [jualInv, setJualInv] = useState("");
  const [jualMetode, setJualMetode] = useState<"tunai" | "kredit">("tunai");
  const [jualAkunPend, setJualAkunPend] = useState("4101");
  const [jualProdukId, setJualProdukId] = useState("");
  const [jualProdukLabel, setJualProdukLabel] = useState("");
  const [jualQty, setJualQty] = useState("1");
  const [jualManualJumlah, setJualManualJumlah] = useState("");
  const [jualKontakId, setJualKontakId] = useState("");
  const [jualKontakLabel, setJualKontakLabel] = useState("");
  const [jualKet, setJualKet] = useState("");
  const [jualPreviewLines, setJualPreviewLines] = useState<
    Array<{ akun: string; d: number; k: number }> | null
  >(null);

  // ── Pembelian state ──
  const [beliTanggal, setBeliTanggal] = useState("");
  const [beliFaktur, setBeliFaktur] = useState("");
  const [beliMetode, setBeliMetode] = useState<"tunai" | "kredit">("tunai");
  const [beliAkun, setBeliAkun] = useState("1301");
  const [beliProdukId, setBeliProdukId] = useState("");
  const [beliProdukLabel, setBeliProdukLabel] = useState("");
  const [beliQty, setBeliQty] = useState("1");
  const [beliJumlah, setBeliJumlah] = useState("");
  const [beliKontakId, setBeliKontakId] = useState("");
  const [beliKontakLabel, setBeliKontakLabel] = useState("");
  const [beliKet, setBeliKet] = useState("");
  const [beliBahanBakuRows, setBeliBahanBakuRows] = useState<BahanBakuRow[]>([]);
  const bbSeqRef = useRef(1);
  const [beliPreview, setBeliPreview] = useState<{
    title: string;
    infoHtml?: string;
    lines: JurnalLine[];
  } | null>(null);

  // ── Manual state ──
  const manualSeqRef = useRef(1);
  const createDefaultManualLines = useCallback((akunList: readonly Akun[]) => {
    const firstKode = akunList[0]?.kode || "1101";
    const id1 = manualSeqRef.current++;
    const id2 = manualSeqRef.current++;
    return [
      { id: id1, akun: firstKode, ket: "", debit: "", kredit: "" },
      { id: id2, akun: firstKode, ket: "", debit: "", kredit: "" },
    ];
  }, []);
  const [manTanggal, setManTanggal] = useState("");
  const [manNo, setManNo] = useState("");
  const [manKet, setManKet] = useState("");
  const [manualLines, setManualLines] = useState<ManualLineRow[]>([]);

  const syncAkuns = useCallback(() => {
    const list = [...readAkuns()];
    setAkuns(list);
    setManualLines((prev) =>
      prev.length ? prev : createDefaultManualLines(list)
    );
  }, [createDefaultManualLines]);

  const initJualDefault = useCallback(() => {
    const def = getDefaultJualAkunKode();
    setJualAkunPend(def);
  }, []);

  const resetManualLines = useCallback(() => {
    const list = readAkuns();
    setAkuns([...list]);
    setManualLines(createDefaultManualLines(list));
  }, [createDefaultManualLines]);

  useEffect(() => {
    syncAkuns();
  }, [syncAkuns]);

  // ── Derived Penjualan values ──
  const jualIsProduk = isProdukJualAkun(jualAkunPend);
  const jualCalc = useMemo(() => {
    const qty = parseFloat(jualQty) || 1;
    if (!jualIsProduk) {
      return {
        totalHarga: parseFloat(jualManualJumlah) || 0,
        hppTotal: 0,
        hasProdukPrice: true,
      };
    }
    if (!jualProdukId) {
      return { totalHarga: 0, hppTotal: 0, hasProdukPrice: false };
    }
    const found = findKatById(jualProdukId);
    const override = readProdukList().find((p) => p.ksId === jualProdukId);
    const saldo = found ? readKsSaldo(found.kat) : null;
    const hargaUnit = override?.hargaJual || 0;
    return {
      totalHarga: hargaUnit > 0 ? hargaUnit * qty : 0,
      hppTotal: saldo ? Math.round(saldo.hppNext * qty) : 0,
      hasProdukPrice: hargaUnit > 0,
    };
  }, [jualIsProduk, jualProdukId, jualQty, jualManualJumlah]);

  // ── Derived Pembelian values ──
  const beliIsPersediaan = isPersediaanBeliAkun(beliAkun, akuns);
  const beliIsBarangJadi = beliAkun === "1304";
  const beliTotalHint = useMemo(() => {
    if (!beliIsPersediaan || beliIsBarangJadi) return 0;
    const qty = parseFloat(beliQty) || 1;
    const harga = parseFloat(beliJumlah) || 0;
    return qty * harga;
  }, [beliIsPersediaan, beliIsBarangJadi, beliQty, beliJumlah]);

  const beliBahanBakuSummary = useMemo(() => {
    const qtyJadi = parseFloat(beliQty) || 1;
    let total = 0;
    let allValid = beliBahanBakuRows.length > 0;
    const details = beliBahanBakuRows.map((row) => {
      const q = parseFloat(row.qty) || 0;
      if (!row.katId || q <= 0) {
        allValid = false;
        return { ...row, saldo: null as KsSaldoSummary | null, subtotal: 0 };
      }
      const found = findKatById(row.katId);
      if (!found) {
        allValid = false;
        return { ...row, saldo: null as KsSaldoSummary | null, subtotal: 0 };
      }
      const saldo = readKsSaldo(found.kat);
      const subtotal = q * (saldo.hppNext || 0);
      total += subtotal;
      return { ...row, saldo, subtotal };
    });
    return {
      total,
      perUnit: qtyJadi > 0 ? total / qtyJadi : total,
      allValid,
      details,
    };
  }, [beliBahanBakuRows, beliQty]);

  // ── Manual balance ──
  const manualTotals = useMemo(() => {
    let td = 0;
    let tk = 0;
    manualLines.forEach((l) => {
      td += parseFloat(l.debit) || 0;
      tk += parseFloat(l.kredit) || 0;
    });
    return { td, tk, balanced: Math.abs(td - tk) < 0.01 };
  }, [manualLines]);

  // ── Pickers ──
  const openSimpelTipePicker = useCallback(() => {
    callOasGlobal("openOptPicker", {
      title: "Jenis Transaksi",
      options: SIMPEL_TIPE_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        sub: o.sub,
      })),
      currentValue: simpelTipe,
      onSelect: (val: string) => {
        setSimpelTipe(val === "keluar" ? "keluar" : "masuk");
        setSimpelPreviewLines(null);
      },
    });
  }, [simpelTipe]);

  const openKontakSelectPicker = useCallback((target: "jual" | "beli") => {
    const list = readKontakList();
    if (!list.length) {
      callOasGlobal(
        "showAlert",
        "Belum ada kontak. Tambahkan di Master Kontak terlebih dahulu."
      );
      return;
    }
    const cur = target === "jual" ? jualKontakId : beliKontakId;
    callOasGlobal("openOptPicker", {
      title: "Pilih Kontak",
      options: [
        { value: "", label: "— Tanpa Kontak —", sub: "Kosongkan kontak" },
        ...list.map((k) => ({
          value: k.id,
          label: k.nama,
          sub: `${k.tipe}${k.telp ? " · " + k.telp : ""}`,
        })),
      ],
      currentValue: cur,
      onSelect: (val: string, label: string) => {
        if (target === "jual") {
          setJualKontakId(val || "");
          setJualKontakLabel(val ? label : "");
        } else {
          setBeliKontakId(val || "");
          setBeliKontakLabel(val ? label : "");
        }
      },
    });
  }, [jualKontakId, beliKontakId]);

  const openJualAkunPicker = useCallback(() => {
    callOasGlobal("openOptPicker", {
      title: "Pilih Jenis Penjualan",
      options: JUAL_AKUN_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        sub: o.sub,
      })),
      currentValue: jualAkunPend,
      onSelect: (val: string) => {
        setJualAkunPend(val);
        if (!isProdukJualAkun(val)) {
          setJualProdukId("");
          setJualProdukLabel("");
        } else {
          setJualManualJumlah("");
        }
        setJualPreviewLines(null);
      },
    });
  }, [jualAkunPend]);

  const selectProdukJual = useCallback(
    (katId: string) => {
      const found = findKatById(katId);
      if (!found) return;
      const override = readProdukList().find((p) => p.ksId === katId);
      setJualProdukId(katId);
      setJualProdukLabel(found.kat.nama);
      if (!jualKet) setJualKet(found.kat.nama);
      if (!override?.hargaJual || override.hargaJual <= 0) {
        callOasGlobal(
          "showAlert",
          '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produk dipilih — harga jual belum diset di Master Produk.'
        );
      }
    },
    [jualKet]
  );

  const openProdukPickerJual = useCallback(() => {
    const allCards = Object.values(readMultiKartuStock());
    const cards = allCards.filter((c) => !c.lockedFromTrx);
    if (!allCards.length) {
      callOasGlobal(
        "showAlert",
        "Belum ada kartu stock. Tambahkan di menu Persediaan."
      );
      return;
    }
    if (!cards.length) {
      callOasGlobal(
        "showAlert",
        "Tidak ada produk tersedia. Aktifkan kartu stock di menu Persediaan (klik ikon gembok)."
      );
      return;
    }

    const pickLevel2 = (card: KsCardRecord) => {
      const kats = Object.values(card.kategori || {});
      if (!kats.length) {
        callOasGlobal("showAlert", "Kartu stock ini belum punya barang.");
        return;
      }
      if (kats.length === 1) {
        selectProdukJual(kats[0].id);
        return;
      }
      callOasGlobal("openOptPicker", {
        title: `Pilih Barang — ${card.nama}`,
        options: kats.map((kat) => {
          const saldo = readKsSaldo(kat);
          const ov = readProdukList().find((p) => p.ksId === kat.id);
          const hJual = ov?.hargaJual || 0;
          return {
            value: kat.id,
            label: kat.nama,
            sub: `${METODE_SHORT[saldo.metode] || "FIFO"} · Stok: ${saldo.totalQty} · HPP: ${fmtRp(saldo.hppNext)} · Jual: ${hJual ? fmtRp(hJual) : "Belum diset"}`,
          };
        }),
        currentValue: jualProdukId,
        onSelect: (katId: string) => selectProdukJual(katId),
      });
    };

    if (cards.length === 1) {
      pickLevel2(cards[0]);
      return;
    }

    callOasGlobal("openOptPicker", {
      title: "Pilih Kartu Stock",
      options: cards.map((card) => {
        const s = readCardSaldo(card);
        return {
          value: card.id,
          label: card.nama,
          sub: `${Object.keys(card.kategori || {}).length} barang · Stok: ${s.totalQty.toLocaleString("id-ID")} ${(card.satuan as string) || "unit"}`,
        };
      }),
      currentValue: "",
      onSelect: (cardId: string) => {
        const card = readMultiKartuStock()[cardId];
        if (card) pickLevel2(card);
      },
    });
  }, [jualProdukId, selectProdukJual]);

  const addBeliBahanBakuRow = useCallback(() => {
    setBeliBahanBakuRows((prev) => [
      ...prev,
      { rowId: `bb${bbSeqRef.current++}`, katId: "", katLabel: "", qty: "1" },
    ]);
  }, []);

  const openBeliAkunPicker = useCallback(() => {
    callOasGlobal("openOptPicker", {
      title: "Pilih Jenis Pembelian",
      options: BELI_AKUN_OPTIONS.map((o) => ({
        value: o.value,
        label: o.label,
        sub: o.sub,
      })),
      currentValue: beliAkun,
      onSelect: (val: string) => {
        setBeliAkun(val);
        const nextIsPers = isPersediaanBeliAkun(val, readAkuns());
        if (!nextIsPers) {
          setBeliProdukId("");
          setBeliProdukLabel("");
        }
        if (val === "1304") {
          setBeliBahanBakuRows((prev) =>
            prev.length
              ? prev
              : [
                  {
                    rowId: `bb${bbSeqRef.current++}`,
                    katId: "",
                    katLabel: "",
                    qty: "1",
                  },
                ]
          );
        } else {
          setBeliBahanBakuRows([]);
        }
        setBeliPreview(null);
      },
    });
  }, [beliAkun]);

  const openBeliProdukPicker = useCallback(() => {
    const allCards = Object.values(readMultiKartuStock());
    if (!allCards.length) {
      callOasGlobal(
        "showAlert",
        "Belum ada kartu stock. Tambahkan di menu Persediaan."
      );
      return;
    }

    const applyProduk = (katId: string, label: string) => {
      setBeliProdukId(katId);
      setBeliProdukLabel(label);
      if (!beliKet) setBeliKet(`Pembelian ${label}`);
    };

    const pickLevel2 = (card: KsCardRecord) => {
      const kats = Object.values(card.kategori || {});
      if (!kats.length) {
        callOasGlobal("showAlert", "Kartu stock ini belum punya barang.");
        return;
      }
      if (kats.length === 1) {
        applyProduk(kats[0].id, kats[0].nama);
        return;
      }
      callOasGlobal("openOptPicker", {
        title: `Pilih Barang — ${card.nama}`,
        options: kats.map((kat) => {
          const saldo = readKsSaldo(kat);
          return {
            value: kat.id,
            label: kat.nama,
            sub: `${METODE_SHORT[saldo.metode] || "FIFO"} · Stok: ${saldo.totalQty} ${(card.satuan as string) || "unit"}`,
          };
        }),
        currentValue: beliProdukId,
        onSelect: (katId: string, label: string) => applyProduk(katId, label),
      });
    };

    if (allCards.length === 1) {
      pickLevel2(allCards[0]);
      return;
    }

    callOasGlobal("openOptPicker", {
      title: "Pilih Kartu Stock",
      options: allCards.map((card) => {
        const s = readCardSaldo(card);
        return {
          value: card.id,
          label: card.nama,
          sub: `${Object.keys(card.kategori || {}).length} barang · Stok: ${s.totalQty} ${(card.satuan as string) || "unit"}`,
        };
      }),
      currentValue: "",
      onSelect: (cardId: string) => {
        const card = readMultiKartuStock()[cardId];
        if (card) pickLevel2(card);
      },
    });
  }, [beliKet, beliProdukId]);

  const openBahanBakuPicker = useCallback((rowId: string) => {
    const allCards = Object.values(readMultiKartuStock());
    if (!allCards.length) {
      callOasGlobal(
        "showAlert",
        "Belum ada kartu stock. Tambahkan di menu Persediaan."
      );
      return;
    }

    const pickLevel2 = (card: KsCardRecord) => {
      const kats = Object.values(card.kategori || {});
      if (!kats.length) {
        callOasGlobal("showAlert", "Kartu stock ini belum punya barang.");
        return;
      }
      callOasGlobal("openOptPicker", {
        title: `Pilih Bahan Baku — ${card.nama}`,
        options: kats.map((kat) => {
          const saldo = readKsSaldo(kat);
          return {
            value: kat.id,
            label: kat.nama,
            sub: `${METODE_SHORT[saldo.metode] || "FIFO"} · Stok: ${saldo.totalQty} ${(card.satuan as string) || "unit"} · HPP: ${fmtRp(saldo.hppNext)}/unit`,
          };
        }),
        currentValue:
          beliBahanBakuRows.find((r) => r.rowId === rowId)?.katId || "",
        onSelect: (katId: string, label: string) => {
          setBeliBahanBakuRows((prev) =>
            prev.map((r) =>
              r.rowId === rowId ? { ...r, katId, katLabel: label } : r
            )
          );
        },
      });
    };

    if (allCards.length === 1) {
      pickLevel2(allCards[0]);
      return;
    }

    callOasGlobal("openOptPicker", {
      title: "Pilih Kartu Stock",
      options: allCards.map((card) => {
        const s = readCardSaldo(card);
        return {
          value: card.id,
          label: card.nama,
          sub: `${Object.keys(card.kategori || {}).length} barang · Stok: ${s.totalQty} ${(card.satuan as string) || "unit"}`,
        };
      }),
      currentValue: "",
      onSelect: (cardId: string) => {
        const card = readMultiKartuStock()[cardId];
        if (card) pickLevel2(card);
      },
    });
  }, [beliBahanBakuRows]);

  // ── Mode Cepat Actions ──
  const buildSimpelLines = useCallback(
    (tipe: "masuk" | "keluar", jumlah: number, ket: string): JurnalLine[] => {
      const label = ket || "Transaksi";
      if (tipe === "masuk") {
        return [
          { akun: "1101", ket: label, debit: jumlah, kredit: 0 },
          { akun: "3101", ket: "Modal / Penerimaan", debit: 0, kredit: jumlah },
        ];
      }
      const list = readAkuns();
      const akunBeban =
        list.find((a) => a.tipe === "Beban" && a.kode === "6101") ||
        list.find((a) => a.tipe === "Beban") || { kode: "6101" };
      return [
        { akun: akunBeban.kode, ket: label, debit: jumlah, kredit: 0 },
        { akun: "1101", ket: label, debit: 0, kredit: jumlah },
      ];
    },
    []
  );

  const handlePreviewSimpel = useCallback(() => {
    const jumlah = parseFloat(simpelJumlah) || 0;
    if (!jumlah) {
      callOasGlobal("showAlert", "Isi jumlah terlebih dahulu!");
      return;
    }
    setSimpelPreviewLines(
      buildSimpelLines(simpelTipe, jumlah, simpelKet.trim() || "Transaksi")
    );
  }, [simpelJumlah, simpelTipe, simpelKet, buildSimpelLines]);

  const handleSimpanSimpel = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Jurnal")) return;
    const jumlah = parseFloat(simpelJumlah) || 0;
    const ket = simpelKet.trim();
    if (!simpelTanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu!");
      return;
    }
    if (!callOasGlobal("guardPeriode", simpelTanggal, "diposting")) return;
    if (!jumlah) {
      callOasGlobal("showAlert", "Isi jumlah terlebih dahulu!");
      return;
    }
    if (!ket) {
      callOasGlobal("showAlert", "Isi keterangan!");
      return;
    }
    const lines = buildSimpelLines(simpelTipe, jumlah, ket);
    callOasGlobal("showOpSpinner", "Menyimpan transaksi...", ket);
    window.setTimeout(() => {
      callOasGlobal("addJurnal", {
        tanggal: simpelTanggal,
        ket,
        jenis: "Kas",
        lines,
      });
      setSimpelJumlah("");
      setSimpelKet("");
      setSimpelPreviewLines(null);
      callOasGlobal("hideOpSpinner");
      callOasGlobal(
        "showAlert",
        '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Transaksi berhasil disimpan!'
      );
      callOasGlobal("renderDashboard");
    }, 400);
  }, [simpelTanggal, simpelJumlah, simpelKet, simpelTipe, buildSimpelLines]);

  // ── Kas Actions ──
  const handlePreviewKas = useCallback(() => {
    const jumlah = parseFloat(kasJumlah) || 0;
    if (!jumlah) {
      setKasPreviewLines(null);
      return;
    }
    const akunNama =
      readAkuns().find((a) => a.kode === kasAkunLawan)?.nama || kasAkunLawan;
    setKasPreviewLines(
      kasJenis === "masuk"
        ? [
            { akun: "Kas", d: jumlah, k: 0 },
            { akun: akunNama, d: 0, k: jumlah },
          ]
        : [
            { akun: akunNama, d: jumlah, k: 0 },
            { akun: "Kas", d: 0, k: jumlah },
          ]
    );
  }, [kasJumlah, kasAkunLawan, kasJenis]);

  const handleSimpanKas = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Jurnal")) return;
    const jumlah = parseFloat(kasJumlah) || 0;
    const ket =
      kasKet.trim() ||
      (kasJenis === "masuk" ? "Penerimaan Kas" : "Pengeluaran Kas");
    if (!kasTanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu!");
      return;
    }
    if (!callOasGlobal("guardPeriode", kasTanggal, "diposting")) return;
    if (!jumlah) {
      callOasGlobal("showAlert", "Isi jumlah transaksi terlebih dahulu!");
      return;
    }
    if (!kasAkunLawan) {
      callOasGlobal("showAlert", "Pilih akun lawan terlebih dahulu!");
      return;
    }
    const lines: JurnalLine[] =
      kasJenis === "masuk"
        ? [
            { akun: "1101", ket: "Kas masuk", debit: jumlah, kredit: 0 },
            { akun: kasAkunLawan, ket, debit: 0, kredit: jumlah },
          ]
        : [
            { akun: kasAkunLawan, ket, debit: jumlah, kredit: 0 },
            { akun: "1101", ket: "Kas keluar", debit: 0, kredit: jumlah },
          ];
    callOasGlobal("addJurnal", {
      tanggal: kasTanggal,
      ket,
      jenis: "Kas",
      lines,
    });
    callOasGlobal(
      "auditLog",
      "create",
      "jurnal",
      `Jurnal Kas ${kasJenis === "masuk" ? "Masuk" : "Keluar"} — ${fmtRp(jumlah)}`
    );
    setKasJumlah("");
    setKasKet("");
    setKasAkunLawan("");
    setKasPreviewLines(null);
    callOasGlobal("showAlert", "✓ Jurnal Kas berhasil disimpan!");
  }, [kasTanggal, kasJumlah, kasKet, kasJenis, kasAkunLawan]);

  // ── Penjualan Actions ──
  const handlePreviewJual = useCallback(() => {
    const jumlah = jualCalc.totalHarga;
    if (!jumlah) {
      setJualPreviewLines(null);
      return;
    }
    const akunNama =
      readAkuns().find((a) => a.kode === jualAkunPend)?.nama || "Penjualan";
    const debNama = jualMetode === "tunai" ? "Kas" : "Piutang Usaha";
    const lines = [
      { akun: debNama, d: jumlah, k: 0 },
      { akun: akunNama, d: 0, k: jumlah },
    ];
    if (jualCalc.hppTotal > 0) {
      lines.push({
        akun: "HPP - Harga Pokok Penjualan",
        d: jualCalc.hppTotal,
        k: 0,
      });
      lines.push({
        akun: "Persediaan Barang Dagangan",
        d: 0,
        k: jualCalc.hppTotal,
      });
    }
    setJualPreviewLines(lines);
  }, [jualCalc, jualAkunPend, jualMetode]);

  const handleSimpanPenjualan = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Jurnal")) return;
    if (!jualTanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu!");
      return;
    }
    if (!callOasGlobal("guardPeriode", jualTanggal, "diposting")) return;

    if (jualIsProduk && !jualProdukId) {
      callOasGlobal("showAlert", "Pilih produk terlebih dahulu!");
      return;
    }
    const jumlah = jualCalc.totalHarga;
    if (!jumlah) {
      callOasGlobal(
        "showAlert",
        jualIsProduk && jualProdukId
          ? "Harga jual belum diset — atur di Master Produk terlebih dahulu."
          : "Isi jumlah penjualan terlebih dahulu!"
      );
      return;
    }

    const inv = jualInv.trim() || String(callOasGlobal("autoNo", "INV") || "INV-001");
    const ket = jualKet.trim() || `Penjualan ${inv}`;
    const opt = JUAL_AKUN_OPTIONS.find((o) => o.value === jualAkunPend);
    const akunPendNama = opt ? opt.label : "Penjualan";
    const debAkun = jualMetode === "tunai" ? "1101" : "1201";
    const debNama = jualMetode === "tunai" ? "Kas masuk" : "Piutang usaha";

    const currentAkuns = readAkuns();
    const settings = readTransaksiAkunSettings();
    const ppnProduk = jualProdukId
      ? readProdukList().find((p) => p.ksId === jualProdukId)
      : null;
    const adaPpn = !!(ppnProduk?.ppn != null && ppnProduk.ppn > 0);
    let baseAmount = jumlah;
    let ppnNominal = 0;
    let kasTotal = jumlah;

    if (adaPpn && ppnProduk?.ppn) {
      if (ppnProduk.ppnInclusive) {
        ppnNominal = Math.round((jumlah * ppnProduk.ppn) / (100 + ppnProduk.ppn));
        baseAmount = jumlah - ppnNominal;
        kasTotal = jumlah;
      } else {
        baseAmount = jumlah;
        ppnNominal = Math.round((jumlah * ppnProduk.ppn) / 100);
        kasTotal = jumlah + ppnNominal;
      }
    }

    const jualLines: JurnalLine[] = [
      { akun: debAkun, ket: debNama, debit: kasTotal, kredit: 0 },
      {
        akun: resolveAkunSetting(settings, "jual", jualAkunPend),
        ket: akunPendNama,
        debit: 0,
        kredit: baseAmount,
      },
    ];
    if (adaPpn && ppnNominal > 0 && ppnProduk?.ppn) {
      const akunPpnOut = currentAkuns.some((a) => a.kode === "2301")
        ? "2301"
        : currentAkuns.find(
            (a) =>
              a.nama.toLowerCase().includes("ppn") && a.tipe === "Liabilitas"
          )?.kode || "2301";
      jualLines.push({
        akun: akunPpnOut,
        ket: `Utang PPN Keluaran ${ppnProduk.ppn}%`,
        debit: 0,
        kredit: ppnNominal,
      });
    }

    callOasGlobal("addJurnal", {
      tanggal: jualTanggal,
      ket,
      jenis: "Penjualan",
      ref: inv,
      kontakId: jualKontakId,
      _ppnTarif: adaPpn ? ppnProduk?.ppn : undefined,
      _ksId: jualProdukId || undefined,
      lines: jualLines,
    });

    const qtyNum = parseFloat(jualQty) || 1;
    if (jualProdukId) {
      const found = findKatById(jualProdukId);
      if (found) setLegacyActiveKartuStock(found.card.id, jualProdukId);
      const hppResult = callOasGlobal(
        "deductKartuStockOnSale",
        jualProdukId,
        qtyNum,
        jualTanggal,
        ket
      ) as { hppBatch?: number } | undefined;
      const hppReal = hppResult?.hppBatch ?? jualCalc.hppTotal;
      if (hppReal > 0) {
        const overrideProduk = readProdukList().find(
          (p) => p.ksId === jualProdukId
        );
        const akunHpp =
          overrideProduk?.akunHpp || settings.jualHpp || "5101";
        const akunPers =
          overrideProduk?.akunPers ||
          settings.jualPersediaan ||
          guessAkunPersediaanDefault(
            `${found?.kat.nama || ""} ${found?.card.nama || ""}`
          );
        callOasGlobal("addJurnal", {
          tanggal: jualTanggal,
          ket: `HPP ${ket}`,
          jenis: "Penjualan",
          ref: inv,
          kontakId: jualKontakId,
          lines: [
            { akun: akunHpp, ket: "HPP", debit: hppReal, kredit: 0 },
            { akun: akunPers, ket: "Persediaan keluar", debit: 0, kredit: hppReal },
          ],
        });
      }
      if (found) {
        setLegacyKartuStockTab(readKsSaldo(found.kat).metode || "fifo");
        callOasGlobal("syncKartuStockDataFromKategori");
        callOasGlobal("renderKartuStock");
        callOasGlobal("renderKartuStockSelector");
        setLegacyKsJustWroteDirectly(false);
      }
    }

    if (jualKontakId) {
      callOasGlobal("updateKontakTotalTrx", jualKontakId, jumlah, "penjualan");
    }
    callOasGlobal(
      "auditLog",
      "create",
      "jurnal",
      `Penjualan${inv ? " " + inv : ""} — ${fmtRp(jumlah)}`,
      { ref: inv }
    );

    setJualInv("");
    setJualManualJumlah("");
    setJualKet("");
    setJualKontakId("");
    setJualKontakLabel("");
    setJualProdukId("");
    setJualProdukLabel("");
    setJualQty("1");
    setJualPreviewLines(null);
    callOasGlobal("showAlert", "✓ Jurnal Penjualan berhasil disimpan!");
  }, [
    jualTanggal,
    jualIsProduk,
    jualProdukId,
    jualCalc,
    jualInv,
    jualKet,
    jualAkunPend,
    jualMetode,
    jualKontakId,
    jualQty,
  ]);

  // ── Pembelian Actions ──
  const buildBeliLines = useCallback(
    (akunKode: string, totalBeli: number, metode: "tunai" | "kredit", ket: string): JurnalLine[] => {
      const settings = readTransaksiAkunSettings();
      const akunEfektif = resolveAkunSetting(settings, "beli", akunKode);
      const krAkun = metode === "tunai" ? "1101" : "2101";
      const krNama = metode === "tunai" ? "Kas" : "Utang Usaha";
      return [
        { akun: akunEfektif, ket, debit: totalBeli, kredit: 0 },
        { akun: krAkun, ket: krNama, debit: 0, kredit: totalBeli },
      ];
    },
    []
  );

  const handlePreviewBeli = useCallback(() => {
    const qty = parseFloat(beliQty) || 1;
    const ket = beliKet.trim() || "Pembelian";

    if (beliIsBarangJadi && beliBahanBakuRows.length) {
      if (!beliBahanBakuSummary.allValid || !beliBahanBakuSummary.total) {
        setBeliPreview(null);
        callOasGlobal(
          "showAlert",
          "Lengkapi semua bahan baku (pilih barang & isi qty) terlebih dahulu!"
        );
        return;
      }
      if (!beliProdukId) {
        setBeliPreview(null);
        callOasGlobal(
          "showAlert",
          "Pilih produk Barang Jadi yang diproduksi terlebih dahulu!"
        );
        return;
      }
      const total = beliBahanBakuSummary.total;
      setBeliPreview({
        title: "Preview Jurnal — Produksi Barang Jadi",
        lines: [
          { akun: "1304", ket, debit: total, kredit: 0 },
          {
            akun: "1302",
            ket: "Pemakaian bahan baku produksi",
            debit: 0,
            kredit: total,
          },
        ],
      });
      return;
    }

    const hargaPerUnit = parseFloat(beliJumlah) || 0;
    if (!hargaPerUnit) {
      setBeliPreview(null);
      callOasGlobal("showAlert", "Isi harga per unit terlebih dahulu!");
      return;
    }
    const totalBeli = beliProdukId ? hargaPerUnit * qty : hargaPerUnit;
    setBeliPreview({
      title: "Preview Jurnal",
      lines: buildBeliLines(beliAkun, totalBeli, beliMetode, ket),
    });
  }, [
    beliQty,
    beliKet,
    beliIsBarangJadi,
    beliBahanBakuRows,
    beliBahanBakuSummary,
    beliProdukId,
    beliJumlah,
    beliAkun,
    beliMetode,
    buildBeliLines,
  ]);

  const handleSimpanPembelian = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Jurnal")) return;
    if (!beliTanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu!");
      return;
    }
    if (!callOasGlobal("guardPeriode", beliTanggal, "diposting")) return;

    const faktur =
      beliFaktur.trim() || String(callOasGlobal("autoNo", "PO") || "PO-001");
    const qty = parseFloat(beliQty) || 1;
    const ket = beliKet.trim() || `Pembelian ${faktur}`;

    // Mode Produksi Barang Jadi (1304)
    if (beliIsBarangJadi && beliBahanBakuRows.length) {
      if (!beliProdukId) {
        callOasGlobal(
          "showAlert",
          "Pilih produk Barang Jadi yang diproduksi terlebih dahulu!"
        );
        return;
      }
      const invalidRow = beliBahanBakuRows.find(
        (r) => !r.katId || !(parseFloat(r.qty) > 0)
      );
      if (invalidRow) {
        callOasGlobal(
          "showAlert",
          "Lengkapi semua baris bahan baku (pilih barang & isi qty)!"
        );
        return;
      }

      const kebutuhan: Record<string, number> = {};
      beliBahanBakuRows.forEach((r) => {
        kebutuhan[r.katId] = (kebutuhan[r.katId] || 0) + (parseFloat(r.qty) || 0);
      });
      for (const katId of Object.keys(kebutuhan)) {
        const needed = kebutuhan[katId];
        const found = findKatById(katId);
        const saldo = found ? readKsSaldo(found.kat) : null;
        if (!saldo || saldo.totalQty < needed) {
          const rowLabel =
            beliBahanBakuRows.find((r) => r.katId === katId)?.katLabel || katId;
          callOasGlobal(
            "showAlert",
            `Stok "${rowLabel}" tidak cukup! Dibutuhkan: ${needed}, Tersedia: ${saldo ? saldo.totalQty : 0}`
          );
          return;
        }
      }

      let totalHpp = 0;
      beliBahanBakuRows.forEach((row) => {
        const res = callOasGlobal(
          "deductKartuStockOnSale",
          row.katId,
          parseFloat(row.qty) || 0,
          beliTanggal,
          `Pemakaian bahan baku — ${ket}`
        ) as { hppBatch?: number } | undefined;
        totalHpp += res?.hppBatch || 0;
      });
      const hargaPerUnitJadi = qty > 0 ? totalHpp / qty : totalHpp;

      callOasGlobal("addJurnal", {
        tanggal: beliTanggal,
        ket,
        jenis: "Produksi",
        ref: faktur,
        kontakId: beliKontakId,
        lines: [
          { akun: "1304", ket, debit: totalHpp, kredit: 0 },
          {
            akun: "1302",
            ket: "Pemakaian bahan baku produksi",
            debit: 0,
            kredit: totalHpp,
          },
        ],
      });

      const foundJadi = findKatById(beliProdukId);
      if (foundJadi) {
        setLegacyActiveKartuStock(foundJadi.card.id, beliProdukId);
        callOasGlobal(
          "addKartuStockOnBuy",
          beliProdukId,
          qty,
          hargaPerUnitJadi,
          beliTanggal,
          ket
        );
        setLegacyKartuStockTab(readKsSaldo(foundJadi.kat).metode || "fifo");
        callOasGlobal("syncKartuStockDataFromKategori");
        callOasGlobal("renderKartuStock");
        callOasGlobal("renderKartuStockSelector");
        setLegacyKsJustWroteDirectly(false);
      }

      if (beliKontakId) {
        callOasGlobal("updateKontakTotalTrx", beliKontakId, totalHpp, "pembelian");
      }

      setBeliFaktur("");
      setBeliKet("");
      setBeliQty("1");
      setBeliKontakId("");
      setBeliKontakLabel("");
      setBeliProdukId("");
      setBeliProdukLabel("");
      setBeliBahanBakuRows([
        { rowId: `bb${bbSeqRef.current++}`, katId: "", katLabel: "", qty: "1" },
      ]);
      setBeliPreview(null);
      callOasGlobal("renderDashboard");
      callOasGlobal(
        "showAlert",
        '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produksi Barang Jadi berhasil disimpan & kartu stock diperbarui!'
      );
      return;
    }

    // Mode Normal
    const hargaPerUnit = parseFloat(beliJumlah) || 0;
    if (beliIsPersediaan && !beliProdukId) {
      callOasGlobal("showAlert", "Pilih produk terlebih dahulu!");
      return;
    }
    if (!hargaPerUnit) {
      callOasGlobal("showAlert", "Isi harga per unit terlebih dahulu!");
      return;
    }

    const totalBeli = beliProdukId ? hargaPerUnit * qty : hargaPerUnit;
    const lines = buildBeliLines(beliAkun, totalBeli, beliMetode, ket);
    const jrnEntry: JurnalEntry = {
      tanggal: beliTanggal,
      ket,
      jenis: "Pembelian",
      ref: faktur,
      kontakId: beliKontakId,
      lines,
    };
    callOasGlobal("addJurnal", jrnEntry);

    if (beliMetode === "kredit") {
      const kontak = beliKontakId
        ? readKontakList().find((k) => k.id === beliKontakId)
        : null;
      const supplierNama = kontak?.nama || "Supplier Umum";
      const noBillBaru =
        faktur ||
        String(
          callOasGlobal("nomorBillBerikut") ||
            `BILL-${beliTanggal.slice(0, 4)}-001`
        );
      const due = new Date(new Date(beliTanggal).getTime() + 30 * 86400000)
        .toISOString()
        .split("T")[0];
      callOasGlobal("tambahBill", {
        id: "bill_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        noBill: noBillBaru,
        supplier: supplierNama,
        tanggal: beliTanggal,
        jatuhTempo: due,
        deskripsi: ket,
        total: totalBeli,
        sisaTagihan: totalBeli,
        status: "diterima",
        jurnalNo: jrnEntry.no || null,
        items: [
          {
            nama: ket || "Pembelian Produk",
            qty,
            harga: totalBeli,
            akun: beliAkun || "1301",
          },
        ],
        ppnAktif: false,
        ppnTarif: 0,
        akunUtang: "2101",
        createdAt: new Date().toISOString(),
      });
      callOasGlobal("simpanBillState");
    }

    if (beliProdukId) {
      const ppnProd = readProdukList().find((p) => p.ksId === beliProdukId);
      if (ppnProd?.ppn != null && ppnProd.ppn > 0) {
        const ppnNom = Math.round((totalBeli * ppnProd.ppn) / 100);
        const currentAkuns = readAkuns();
        const akunPpnIn = currentAkuns.some((a) => a.kode === "1502")
          ? "1502"
          : currentAkuns.find((a) =>
              a.nama.toLowerCase().includes("ppn masukan")
            )?.kode || "1502";
        const akunKasHutang = beliMetode === "tunai" ? "1101" : "2101";
        callOasGlobal("addJurnal", {
          tanggal: beliTanggal,
          ket: `PPN Masukan ${ppnProd.ppn}% — ${ket}`,
          jenis: "PPN",
          ref: faktur,
          kontakId: beliKontakId,
          _ppnTarif: ppnProd.ppn,
          _ksId: beliProdukId,
          lines: [
            {
              akun: akunPpnIn,
              ket: `PPN Masukan ${ppnProd.ppn}%`,
              debit: ppnNom,
              kredit: 0,
            },
            {
              akun: akunKasHutang,
              ket: "Kas/Utang PPN Masukan",
              debit: 0,
              kredit: ppnNom,
            },
          ],
        });
      }

      const found = findKatById(beliProdukId);
      if (found) {
        setLegacyActiveKartuStock(found.card.id, beliProdukId);
        callOasGlobal(
          "addKartuStockOnBuy",
          beliProdukId,
          qty,
          hargaPerUnit,
          beliTanggal,
          ket
        );
        setLegacyKartuStockTab(readKsSaldo(found.kat).metode || "fifo");
        callOasGlobal("syncKartuStockDataFromKategori");
        callOasGlobal("renderKartuStock");
        callOasGlobal("renderKartuStockSelector");
        setLegacyKsJustWroteDirectly(false);
      }
    }

    if (beliKontakId) {
      callOasGlobal("updateKontakTotalTrx", beliKontakId, totalBeli, "pembelian");
    }
    callOasGlobal(
      "auditLog",
      "create",
      "jurnal",
      `Pembelian${faktur ? " " + faktur : ""} — ${fmtRp(totalBeli)}`,
      { ref: faktur }
    );

    const hadProduk = Boolean(beliProdukId);
    setBeliFaktur("");
    setBeliJumlah("");
    setBeliKet("");
    setBeliQty("1");
    setBeliKontakId("");
    setBeliKontakLabel("");
    setBeliProdukId("");
    setBeliProdukLabel("");
    setBeliAkun("1301");
    setBeliBahanBakuRows([]);
    setBeliPreview(null);
    callOasGlobal("renderDashboard");
    callOasGlobal(
      "showAlert",
      `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Jurnal Pembelian berhasil disimpan${hadProduk ? " & kartu stock diperbarui!" : "!"}`
    );
  }, [
    beliTanggal,
    beliFaktur,
    beliQty,
    beliKet,
    beliIsBarangJadi,
    beliBahanBakuRows,
    beliProdukId,
    beliKontakId,
    beliJumlah,
    beliIsPersediaan,
    beliAkun,
    beliMetode,
    buildBeliLines,
  ]);

  // ── Manual Actions ──
  const addManualLine = useCallback(() => {
    const firstKode = readAkuns()[0]?.kode || "1101";
    setManualLines((prev) => [
      ...prev,
      {
        id: manualSeqRef.current++,
        akun: firstKode,
        ket: "",
        debit: "",
        kredit: "",
      },
    ]);
  }, []);

  const handleSimpanManual = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "Jurnal")) return;
    if (!manTanggal) {
      callOasGlobal("showAlert", "Pilih tanggal terlebih dahulu!");
      return;
    }
    if (!callOasGlobal("guardPeriode", manTanggal, "diposting")) return;

    const lines: JurnalLine[] = [];
    manualLines.forEach((row) => {
      const d = parseFloat(row.debit) || 0;
      const k = parseFloat(row.kredit) || 0;
      if (d || k) {
        lines.push({ akun: row.akun, ket: row.ket, debit: d, kredit: k });
      }
    });
    if (lines.length < 2) {
      callOasGlobal("showAlert", "Lengkapi data jurnal!");
      return;
    }
    const td = lines.reduce((s, l) => s + l.debit, 0);
    const tk = lines.reduce((s, l) => s + l.kredit, 0);
    if (Math.abs(td - tk) > 0.01) {
      callOasGlobal("showAlert", "Jurnal tidak balance!");
      return;
    }

    const ket = manKet.trim() || "Jurnal Manual";
    callOasGlobal("addJurnal", {
      tanggal: manTanggal,
      ket,
      jenis: "Manual",
      lines,
    });
    callOasGlobal("auditLog", "create", "jurnal", `Jurnal Manual — ${ket}`);
    setManKet("");
    setManNo("");
    resetManualLines();
    callOasGlobal("showAlert", "✓ Jurnal Manual berhasil disimpan!");
  }, [manTanggal, manKet, manualLines, resetManualLines]);

  // ── Window Bridges for navigation & legacy hooks ──
  useEffect(() => {
    setOasWindowFn("initTransaksiForm", () => {
      syncAkuns();
      setBeliAkun((prev) =>
        ["1301", "1302", "1303", "1304"].includes(prev) ? prev : "1301"
      );
      resetManualLines();
    });
    setOasWindowFn("initManualLines", resetManualLines);
    setOasWindowFn("initJualAkunPendapatan", initJualDefault);
    setOasWindowFn(
      "switchTab",
      ((group: string, tab: string) => {
        if (group === "trx") {
          const valid: TrxTab[] = [
            "simpel",
            "kas",
            "penjualan",
            "pembelian",
            "umum",
          ];
          if (valid.includes(tab as TrxTab)) {
            setActiveTab(tab as TrxTab);
            if (tab === "umum") resetManualLines();
            if (tab === "penjualan") initJualDefault();
          }
        }
      }) as (...args: never[]) => unknown
    );
    setOasWindowFn("simpanSimpel", handleSimpanSimpel);
    setOasWindowFn("simpanKas", handleSimpanKas);
    setOasWindowFn("simpanPenjualan", handleSimpanPenjualan);
    setOasWindowFn("simpanPembelian", handleSimpanPembelian);
    setOasWindowFn("simpanManual", handleSimpanManual);
  }, [
    syncAkuns,
    resetManualLines,
    initJualDefault,
    handleSimpanSimpel,
    handleSimpanKas,
    handleSimpanPenjualan,
    handleSimpanPembelian,
    handleSimpanManual,
  ]);

  const kasAkunObj = useMemo(
    () => akuns.find((a) => a.kode === kasAkunLawan) || null,
    [akuns, kasAkunLawan]
  );

  const jualAkunLabel =
    JUAL_AKUN_OPTIONS.find((o) => o.value === jualAkunPend)?.label ||
    "Penjualan Barang";
  const beliAkunLabel =
    BELI_AKUN_OPTIONS.find((o) => o.value === beliAkun)?.label ||
    "Persediaan Barang Dagangan";
  const simpelTipeLabel =
    SIMPEL_TIPE_OPTIONS.find((o) => o.value === simpelTipe)?.label ||
    "Uang Masuk";

  const kasAkunFilter = useCallback(
    (a: Akun) => !["1101", "1102", "1103", "1104"].includes(a.kode),
    []
  );

  return (
    <div className="page" id="page-transaksi" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Input Transaksi</div>
          <div className="section-sub">
            Masukkan transaksi — jurnal dibuat otomatis
          </div>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            { id: "simpel", label: "⚡ Mode Cepat", highlight: true },
            { id: "kas", label: "Penerimaan/Pengeluaran Kas" },
            { id: "penjualan", label: "Penjualan" },
            { id: "pembelian", label: "Pembelian" },
            { id: "umum", label: "Jurnal Manual" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "umum" && manualLines.length === 0) {
                resetManualLines();
              }
              if (tab.id === "penjualan") initJualDefault();
            }}
            style={
              "highlight" in tab && tab.highlight
                ? { color: "var(--accent)", fontWeight: 700, background: "transparent", border: "none" }
                : { background: "transparent", border: "none" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: MODE CEPAT ═══ */}
      {activeTab === "simpel" ? (
        <div id="trx-simpel" className="trx-tab">
          <div className="table-card">
            <div className="table-header">
              <div>
                <div
                  className="table-title"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Zap size={16} style={{ color: "var(--accent)" }} /> Mode Cepat
                </div>
                <div className="table-subtitle">
                  Input transaksi tanpa perlu tahu jurnal · Otomatis dijurnalkan
                </div>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-row full" style={{ marginBottom: "4px" }}>
                <div className="form-group">
                  <label>Jenis Transaksi</label>
                  <button
                    className="opt-picker-btn"
                    type="button"
                    id="simpel-tipe-btn"
                    onClick={openSimpelTipePicker}
                  >
                    <span className="opt-picker-label" id="simpel-tipe-label">
                      {simpelTipeLabel}
                    </span>
                    <span className="opt-picker-arrow">▾</span>
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="simpel-tanggal">Tanggal</label>
                  <input
                    type="date"
                    id="simpel-tanggal"
                    value={simpelTanggal}
                    onChange={(e) => setSimpelTanggal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="simpel-jumlah">Jumlah (Rp)</label>
                  <input
                    type="number"
                    id="simpel-jumlah"
                    placeholder="0"
                    inputMode="numeric"
                    value={simpelJumlah}
                    onChange={(e) => setSimpelJumlah(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="simpel-ket">Keterangan</label>
                  <input
                    type="text"
                    id="simpel-ket"
                    placeholder={
                      simpelTipe === "masuk"
                        ? "Contoh: Terima modal, Penerimaan piutang..."
                        : "Contoh: Bayar listrik, Gaji karyawan..."
                    }
                    value={simpelKet}
                    onChange={(e) => setSimpelKet(e.target.value)}
                  />
                </div>
              </div>

              {simpelPreviewLines ? (
                <div
                  id="simpel-jurnal-preview"
                  style={{
                    marginBottom: "12px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "12px",
                    fontFamily: "var(--mono)",
                    color: "var(--muted)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--accent2)",
                      fontWeight: 700,
                      marginBottom: "8px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    JURNAL YANG AKAN DIBUAT:
                  </div>
                  {simpelPreviewLines.map((l, i) => {
                    const a = akuns.find((x) => x.kode === l.akun);
                    return (
                      <div
                        key={i}
                        style={{ display: "flex", gap: "8px", marginBottom: "4px" }}
                      >
                        <span style={{ color: "var(--muted)", minWidth: "80px" }}>
                          {l.akun}
                        </span>
                        <span style={{ flex: 1, color: "var(--text)" }}>
                          {a?.nama || l.akun}
                        </span>
                        <span
                          style={{
                            color: "var(--accent)",
                            minWidth: "80px",
                            textAlign: "right",
                          }}
                        >
                          {l.debit ? `Dr ${fmtRp(l.debit)}` : ""}
                        </span>
                        <span
                          style={{
                            color: "var(--red)",
                            minWidth: "80px",
                            textAlign: "right",
                          }}
                        >
                          {l.kredit ? `Kr ${fmtRp(l.kredit)}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePreviewSimpel}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Eye size={14} /> Preview Jurnal
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={handleSimpanSimpel}
                >
                  Simpan Transaksi
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ TAB 2: KAS ═══ */}
      {activeTab === "kas" ? (
        <div id="trx-kas" className="trx-tab">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Penerimaan / Pengeluaran Kas</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="kas-tanggal">Tanggal</label>
                  <input
                    type="date"
                    id="kas-tanggal"
                    value={kasTanggal}
                    onChange={(e) => setKasTanggal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="kas-jenis">Jenis</label>
                  <select
                    id="kas-jenis"
                    value={kasJenis}
                    onChange={(e) =>
                      setKasJenis(e.target.value === "keluar" ? "keluar" : "masuk")
                    }
                  >
                    <option value="masuk">Penerimaan Kas</option>
                    <option value="keluar">Pengeluaran Kas</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Akun Lawan</label>
                  <input type="hidden" id="kas-akun-lawan" value={kasAkunLawan} readOnly />
                  <button
                    className={`form-picker-btn${kasAkunObj ? " has-value" : ""}`}
                    type="button"
                    id="kas-akun-lawan-btn"
                    onClick={() => {
                      syncAkuns();
                      setAkunPickerTarget({ mode: "kas" });
                    }}
                  >
                    {kasAkunObj ? (
                      <>
                        <span className="picker-kode-badge">{kasAkunObj.kode}</span>
                        <span
                          style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign: "left",
                          }}
                        >
                          {kasAkunObj.nama}
                        </span>
                      </>
                    ) : (
                      "Pilih Akun..."
                    )}
                  </button>
                </div>
                <div className="form-group">
                  <label htmlFor="kas-jumlah">Jumlah (Rp)</label>
                  <input
                    type="number"
                    id="kas-jumlah"
                    placeholder="0"
                    inputMode="numeric"
                    value={kasJumlah}
                    onChange={(e) => setKasJumlah(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="kas-ket">Keterangan</label>
                  <input
                    type="text"
                    id="kas-ket"
                    placeholder="Keterangan transaksi..."
                    value={kasKet}
                    onChange={(e) => setKasKet(e.target.value)}
                  />
                </div>
              </div>

              {kasPreviewLines ? (
                <div
                  id="kas-preview"
                  style={{
                    marginBottom: "12px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    fontSize: "12.5px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "var(--accent2)",
                    }}
                  >
                    Preview Jurnal
                  </div>
                  {kasPreviewLines.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      <span style={l.d ? undefined : { paddingLeft: "24px" }}>
                        {l.akun}
                      </span>
                      <span style={{ color: "var(--accent)" }}>
                        {l.d ? fmtRp(l.d) : ""}
                      </span>
                      <span style={{ color: "var(--red)" }}>
                        {l.k ? fmtRp(l.k) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePreviewKas}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Eye size={14} /> Preview Jurnal
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={handleSimpanKas}
                >
                  Simpan &amp; Buat Jurnal
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ TAB 3: PENJUALAN ═══ */}
      {activeTab === "penjualan" ? (
        <div id="trx-penjualan" className="trx-tab">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Transaksi Penjualan</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="jual-tanggal">Tanggal</label>
                  <input
                    type="date"
                    id="jual-tanggal"
                    value={jualTanggal}
                    onChange={(e) => setJualTanggal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="jual-inv">No. Invoice</label>
                  <input
                    type="text"
                    id="jual-inv"
                    placeholder="INV-001"
                    value={jualInv}
                    onChange={(e) => setJualInv(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="jual-metode">Metode Pembayaran</label>
                  <select
                    id="jual-metode"
                    value={jualMetode}
                    onChange={(e) =>
                      setJualMetode(e.target.value === "kredit" ? "kredit" : "tunai")
                    }
                  >
                    <option value="tunai">Tunai (Kas)</option>
                    <option value="kredit">Kredit (Piutang)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Jenis Penjualan</label>
                  <input
                    type="hidden"
                    id="jual-akun-pendapatan"
                    value={jualAkunPend}
                    readOnly
                  />
                  <button
                    className="opt-picker-btn"
                    type="button"
                    id="jual-akun-pendapatan-btn"
                    onClick={openJualAkunPicker}
                    data-value={jualAkunPend}
                  >
                    <span
                      className="opt-picker-label"
                      id="jual-akun-pendapatan-label"
                    >
                      {jualAkunLabel}
                    </span>
                    <span className="opt-picker-arrow">▾</span>
                  </button>
                </div>
              </div>

              {jualIsProduk ? (
                <div className="form-row" id="jual-produk-row">
                  <div className="form-group">
                    <label>Produk</label>
                    <input
                      type="hidden"
                      id="jual-produk-id"
                      value={jualProdukId}
                      readOnly
                    />
                    <button
                      className="opt-picker-btn"
                      type="button"
                      id="jual-produk-btn"
                      onClick={openProdukPickerJual}
                    >
                      <span
                        className="opt-picker-label"
                        id="jual-produk-label"
                        style={{
                          color: jualProdukLabel ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        {jualProdukLabel || "Pilih produk..."}
                      </span>
                      <span className="opt-picker-arrow">▾</span>
                    </button>
                  </div>
                  <div className="form-group">
                    <label htmlFor="jual-produk-qty">Qty</label>
                    <input
                      type="number"
                      id="jual-produk-qty"
                      placeholder="1"
                      inputMode="numeric"
                      value={jualQty}
                      onChange={(e) => setJualQty(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="form-row" id="jual-jumlah-row">
                <div className="form-group" id="jual-jumlah-group">
                  <label>
                    {jualIsProduk ? "Harga Jual" : "Jumlah Penjualan (Rp)"}
                  </label>
                  {jualIsProduk ? (
                    <div
                      id="jual-harga-display"
                      style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        fontSize: "13px",
                        color: "var(--text)",
                        cursor: "not-allowed",
                        userSelect: "none",
                        height: "38px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        id="jual-harga-display-text"
                        style={{
                          color:
                            jualCalc.totalHarga > 0
                              ? "var(--text)"
                              : "var(--muted)",
                        }}
                      >
                        {jualCalc.totalHarga > 0
                          ? fmtRp(jualCalc.totalHarga)
                          : "—"}
                      </span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      id="jual-jumlah-manual"
                      placeholder="0"
                      inputMode="numeric"
                      value={jualManualJumlah}
                      onChange={(e) => setJualManualJumlah(e.target.value)}
                    />
                  )}
                  <input
                    type="hidden"
                    id="jual-jumlah"
                    value={jualCalc.totalHarga}
                    readOnly
                  />
                  <input
                    type="hidden"
                    id="jual-hpp"
                    value={jualCalc.hppTotal}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Users size={13} /> Kontak{" "}
                    <span
                      style={{
                        color: "var(--muted)",
                        fontWeight: 400,
                        fontSize: "11px",
                      }}
                    >
                      (opsional)
                    </span>
                  </label>
                  <button
                    className={`form-picker-btn${jualKontakId ? " has-value" : ""}`}
                    type="button"
                    id="jual-kontak-btn"
                    onClick={() => openKontakSelectPicker("jual")}
                  >
                    {jualKontakLabel || "Pilih kontak..."}
                  </button>
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="jual-ket">Keterangan</label>
                  <input
                    type="text"
                    id="jual-ket"
                    placeholder="Penjualan barang/jasa..."
                    value={jualKet}
                    onChange={(e) => setJualKet(e.target.value)}
                  />
                </div>
              </div>

              {jualPreviewLines ? (
                <div
                  id="jual-preview"
                  style={{
                    marginTop: "10px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    fontSize: "12.5px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "var(--accent2)",
                    }}
                  >
                    Preview Jurnal
                  </div>
                  {jualPreviewLines.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      <span style={l.d ? undefined : { paddingLeft: "24px" }}>
                        {l.akun}
                      </span>
                      <span style={{ color: "var(--accent)" }}>
                        {l.d ? fmtRp(l.d) : ""}
                      </span>
                      <span style={{ color: "var(--red)" }}>
                        {l.k ? fmtRp(l.k) : ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePreviewJual}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Eye size={14} /> Preview Jurnal
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={handleSimpanPenjualan}
                >
                  Simpan &amp; Buat Jurnal
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ TAB 4: PEMBELIAN ═══ */}
      {activeTab === "pembelian" ? (
        <div id="trx-pembelian" className="trx-tab">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Transaksi Pembelian</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="beli-tanggal">Tanggal</label>
                  <input
                    type="date"
                    id="beli-tanggal"
                    value={beliTanggal}
                    onChange={(e) => setBeliTanggal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="beli-faktur">No. Faktur</label>
                  <input
                    type="text"
                    id="beli-faktur"
                    placeholder="PO-001"
                    value={beliFaktur}
                    onChange={(e) => setBeliFaktur(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="beli-metode">Metode Pembayaran</label>
                  <select
                    id="beli-metode"
                    value={beliMetode}
                    onChange={(e) =>
                      setBeliMetode(e.target.value === "kredit" ? "kredit" : "tunai")
                    }
                  >
                    <option value="tunai">Tunai (Kas)</option>
                    <option value="kredit">Kredit (Utang)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Jenis Pembelian</label>
                  <input type="hidden" id="beli-akun" value={beliAkun} readOnly />
                  <button
                    className="opt-picker-btn"
                    type="button"
                    id="beli-akun-btn"
                    onClick={openBeliAkunPicker}
                  >
                    <span className="opt-picker-label" id="beli-akun-label">
                      {beliAkunLabel}
                    </span>
                    <span className="opt-picker-arrow">▾</span>
                  </button>
                </div>
              </div>

              {beliIsPersediaan ? (
                <div className="form-row" id="beli-produk-row">
                  <div className="form-group">
                    <label id="beli-produk-label-text">
                      {beliIsBarangJadi
                        ? "Produk Barang Jadi (Hasil Produksi)"
                        : "Produk"}
                    </label>
                    <button
                      className="opt-picker-btn"
                      type="button"
                      id="beli-produk-btn"
                      onClick={openBeliProdukPicker}
                    >
                      <span
                        className="opt-picker-label"
                        id="beli-produk-label"
                        style={{
                          color: beliProdukLabel ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        {beliProdukLabel || "Pilih produk..."}
                      </span>
                      <span className="opt-picker-arrow">▾</span>
                    </button>
                  </div>
                  <div className="form-group">
                    <label htmlFor="beli-produk-qty">Qty</label>
                    <input
                      type="number"
                      id="beli-produk-qty"
                      placeholder="1"
                      min="1"
                      inputMode="numeric"
                      value={beliQty}
                      onChange={(e) => setBeliQty(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {beliIsBarangJadi ? (
                <div className="form-row full" id="beli-bahanbaku-wrap">
                  <div className="form-group">
                    <label>Bahan Baku yang Digunakan</label>
                    <div id="beli-bahanbaku-list">
                      {beliBahanBakuSummary.details.map((row) => (
                        <div
                          key={row.rowId}
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "flex-start",
                            marginBottom: "8px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <button
                              className="opt-picker-btn"
                              type="button"
                              onClick={() => openBahanBakuPicker(row.rowId)}
                            >
                              <span
                                className="opt-picker-label"
                                style={{
                                  color: row.katId
                                    ? "var(--text)"
                                    : "var(--muted)",
                                }}
                              >
                                {row.katLabel || "Pilih bahan baku..."}
                              </span>
                              <span className="opt-picker-arrow">▾</span>
                            </button>
                            {row.saldo ? (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "var(--muted)",
                                  marginTop: "2px",
                                }}
                              >
                                Stok: {row.saldo.totalQty} · HPP:{" "}
                                {fmtRp(row.saldo.hppNext)}/unit
                              </div>
                            ) : null}
                          </div>
                          <div style={{ width: "90px" }}>
                            <input
                              type="number"
                              placeholder="Qty"
                              min="0"
                              inputMode="numeric"
                              value={row.qty}
                              onChange={(e) =>
                                setBeliBahanBakuRows((prev) =>
                                  prev.map((r) =>
                                    r.rowId === row.rowId
                                      ? { ...r, qty: e.target.value }
                                      : r
                                  )
                                )
                              }
                              style={{ width: "100%" }}
                            />
                          </div>
                          <button
                            type="button"
                            aria-label="Hapus bahan baku"
                            onClick={() =>
                              setBeliBahanBakuRows((prev) => {
                                const next = prev.filter(
                                  (r) => r.rowId !== row.rowId
                                );
                                return next.length
                                  ? next
                                  : [
                                      {
                                        rowId: `bb${bbSeqRef.current++}`,
                                        katId: "",
                                        katLabel: "",
                                        qty: "1",
                                      },
                                    ];
                              })
                            }
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "8px 4px",
                              marginTop: "2px",
                              color: "var(--red)",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={addBeliBahanBakuRow}
                      style={{
                        marginTop: "4px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        alignSelf: "flex-start",
                      }}
                    >
                      <Plus size={13} /> Tambah Bahan Baku
                    </button>
                    {beliBahanBakuSummary.total > 0 ? (
                      <div
                        id="beli-bahanbaku-total-hint"
                        style={{
                          fontSize: "11.5px",
                          color: "var(--accent)",
                          marginTop: "8px",
                          padding: "8px 10px",
                          background: "rgba(74,222,128,0.06)",
                          borderRadius: "6px",
                        }}
                      >
                        Total HPP Bahan Baku:{" "}
                        <b>{fmtRp(beliBahanBakuSummary.total)}</b> &nbsp;→&nbsp;
                        HPP per unit Barang Jadi:{" "}
                        <b>{fmtRp(beliBahanBakuSummary.perUnit)}</b>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="form-row">
                {!beliIsBarangJadi ? (
                  <div className="form-group" id="beli-harga-group">
                    <label htmlFor="beli-jumlah" id="beli-jumlah-label">
                      {beliIsPersediaan
                        ? "Harga per Unit (Rp)"
                        : "Jumlah Pembelian (Rp) *"}
                    </label>
                    <input
                      type="number"
                      id="beli-jumlah"
                      placeholder="0"
                      inputMode="numeric"
                      value={beliJumlah}
                      onChange={(e) => setBeliJumlah(e.target.value)}
                    />
                    {beliTotalHint > 0 ? (
                      <div
                        id="beli-total-hint"
                        style={{
                          fontSize: "11px",
                          color: "var(--accent)",
                          marginTop: "3px",
                        }}
                      >
                        = Total: {fmtRp(beliTotalHint)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div className="form-group">
                  <label
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Users size={13} /> Kontak{" "}
                    <span
                      style={{
                        color: "var(--muted)",
                        fontWeight: 400,
                        fontSize: "11px",
                      }}
                    >
                      (opsional)
                    </span>
                  </label>
                  <button
                    className={`form-picker-btn${beliKontakId ? " has-value" : ""}`}
                    type="button"
                    id="beli-kontak-btn"
                    onClick={() => openKontakSelectPicker("beli")}
                  >
                    {beliKontakLabel || "Pilih kontak..."}
                  </button>
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="beli-ket">Keterangan</label>
                  <input
                    type="text"
                    id="beli-ket"
                    placeholder="Pembelian persediaan/aset..."
                    value={beliKet}
                    onChange={(e) => setBeliKet(e.target.value)}
                  />
                </div>
              </div>

              {beliPreview ? (
                <div
                  id="beli-preview"
                  style={{
                    marginTop: "10px",
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    fontSize: "12.5px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "var(--accent2)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Package size={14} /> {beliPreview.title}
                  </div>
                  {beliPreview.lines.map((l, i) => {
                    const a = akuns.find((x) => x.kode === l.akun);
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginBottom: "4px",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        <span style={{ color: "var(--muted)", minWidth: "50px" }}>
                          {l.akun}
                        </span>
                        <span style={{ flex: 1 }}>{a?.nama || l.akun}</span>
                        <span
                          style={{
                            color: "var(--accent)",
                            minWidth: "80px",
                            textAlign: "right",
                          }}
                        >
                          {l.debit ? `Dr ${fmtRp(l.debit)}` : ""}
                        </span>
                        <span
                          style={{
                            color: "var(--red)",
                            minWidth: "80px",
                            textAlign: "right",
                          }}
                        >
                          {l.kredit ? `Kr ${fmtRp(l.kredit)}` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div style={{ marginTop: "10px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handlePreviewBeli}
                  style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                >
                  <Eye size={14} /> Preview Jurnal
                </button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={handleSimpanPembelian}
                >
                  Simpan &amp; Buat Jurnal
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ═══ TAB 5: JURNAL MANUAL ═══ */}
      {activeTab === "umum" ? (
        <div id="trx-umum" className="trx-tab">
          <div className="table-card">
            <div className="table-header">
              <div
                className="table-title"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Pencil size={15} /> Jurnal Manual
              </div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="man-tanggal">Tanggal</label>
                  <input
                    type="date"
                    id="man-tanggal"
                    value={manTanggal}
                    onChange={(e) => setManTanggal(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="man-no">No. Jurnal</label>
                  <input
                    type="text"
                    id="man-no"
                    placeholder="JU-001"
                    value={manNo}
                    onChange={(e) => setManNo(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="man-ket">Keterangan</label>
                  <input
                    type="text"
                    id="man-ket"
                    placeholder="Keterangan jurnal..."
                    value={manKet}
                    onChange={(e) => setManKet(e.target.value)}
                  />
                </div>
              </div>

              <div className="jurnal-lines">
                <div className="jurnal-lines-head">
                  <span>Akun</span>
                  <span>Keterangan</span>
                  <span>Debit</span>
                  <span>Kredit</span>
                  <span />
                </div>
                <div id="manual-lines">
                  {manualLines.map((row) => {
                    const akunObj = akuns.find((a) => a.kode === row.akun);
                    return (
                      <div key={row.id} className="jurnal-line-row">
                        <button
                          className="akun-trigger-btn"
                          type="button"
                          onClick={() => {
                            syncAkuns();
                            setAkunPickerTarget({
                              mode: "manual",
                              lineId: row.id,
                            });
                          }}
                          style={{ display: "block" }}
                        >
                          {akunObj
                            ? `${akunObj.kode} — ${akunObj.nama}`
                            : row.akun || "Pilih Akun..."}
                        </button>
                        <input
                          type="text"
                          placeholder="Keterangan"
                          value={row.ket}
                          onChange={(e) =>
                            setManualLines((prev) =>
                              prev.map((l) =>
                                l.id === row.id
                                  ? { ...l, ket: e.target.value }
                                  : l
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          placeholder="0"
                          value={row.debit}
                          onChange={(e) =>
                            setManualLines((prev) =>
                              prev.map((l) =>
                                l.id === row.id
                                  ? { ...l, debit: e.target.value }
                                  : l
                              )
                            )
                          }
                        />
                        <input
                          type="number"
                          placeholder="0"
                          value={row.kredit}
                          onChange={(e) =>
                            setManualLines((prev) =>
                              prev.map((l) =>
                                l.id === row.id
                                  ? { ...l, kredit: e.target.value }
                                  : l
                              )
                            )
                          }
                        />
                        <button
                          type="button"
                          className="remove-line"
                          aria-label="Hapus baris"
                          onClick={() =>
                            setManualLines((prev) =>
                              prev.filter((l) => l.id !== row.id)
                            )
                          }
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={addManualLine}
                style={{ marginTop: "10px" }}
              >
                + Tambah Baris
              </button>

              <div
                id="manual-balance"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginTop: "10px",
                }}
              >
                Total Debit:{" "}
                <span style={{ color: "var(--accent)" }}>
                  {fmtRp(manualTotals.td)}
                </span>{" "}
                &nbsp;|&nbsp; Total Kredit:{" "}
                <span style={{ color: "var(--red)" }}>
                  {fmtRp(manualTotals.tk)}
                </span>{" "}
                &nbsp;|&nbsp;{" "}
                <span
                  style={{
                    color: manualTotals.balanced ? "var(--accent)" : "var(--red)",
                  }}
                >
                  {manualTotals.balanced ? "✓ Balance" : "✗ Tidak Balance"}
                </span>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                className="btn btn-primary"
                onClick={handleSimpanManual}
                style={{ marginTop: "10px" }}
              >
                Simpan Jurnal
              </motion.button>
            </div>
          </div>
        </div>
      ) : null}

      <AkunPickerModal
        open={akunPickerTarget !== null}
        onClose={() => setAkunPickerTarget(null)}
        akuns={akuns}
        selectedKode={
          akunPickerTarget?.mode === "kas"
            ? kasAkunLawan
            : akunPickerTarget?.mode === "manual"
              ? manualLines.find((l) => l.id === akunPickerTarget.lineId)
                  ?.akun || ""
              : ""
        }
        filterFn={akunPickerTarget?.mode === "kas" ? kasAkunFilter : undefined}
        title={
          akunPickerTarget?.mode === "kas"
            ? "Pilih Akun Lawan"
            : "Pilih Akun Jurnal"
        }
        onSelect={(akun) => {
          if (akunPickerTarget?.mode === "kas") {
            setKasAkunLawan(akun.kode);
          } else if (akunPickerTarget?.mode === "manual") {
            const targetId = akunPickerTarget.lineId;
            setManualLines((prev) =>
              prev.map((l) =>
                l.id === targetId ? { ...l, akun: akun.kode } : l
              )
            );
          }
        }}
      />
    </div>
  );
}
