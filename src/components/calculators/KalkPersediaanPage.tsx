"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  ClipboardList,
  Plus,
  RefreshCw,
  Settings,
  X,
} from "lucide-react";
import KartuStockPanel from "@/components/persediaan/KartuStockPanel";
import { hitungPersediaanPure } from "@/lib/kalkulator";
import { callOasGlobal } from "@/lib/legacy-actions";
import { setOasWindowFn } from "@/lib/legacy-store";
import type {
  PersediaanKartuRow,
  PersediaanMetode,
  PersediaanResult,
} from "@/types";
import { KalkActionBar, fmtRp } from "./CalcPrimitives";

interface InvInputRow {
  id: number;
  tgl: string;
  jenis: "masuk" | "keluar";
  qty: string;
  harga: string;
  ket: string;
}

const METODE_OPTIONS: ReadonlyArray<{
  value: PersediaanMetode;
  label: string;
  sub: string;
  shortLabel: string;
}> = [
  {
    value: "fifo",
    label: "FIFO",
    sub: "First In First Out",
    shortLabel: "FIFO",
  },
  {
    value: "lifo",
    label: "LIFO",
    sub: "Last In First Out",
    shortLabel: "LIFO",
  },
  {
    value: "wa",
    label: "Weighted Average",
    sub: "Rata-rata Tertimbang",
    shortLabel: "Weighted Average",
  },
  {
    value: "mwa",
    label: "Moving Weighted Average",
    sub: "Rata-rata Bergerak",
    shortLabel: "Moving WA",
  },
];

function todayYmd(): string {
  return new Date().toISOString().split("T")[0];
}

function createInitialRows(nextId: () => number): InvInputRow[] {
  const tgl = todayYmd();
  return [
    { id: nextId(), tgl, jenis: "masuk", qty: "", harga: "", ket: "" },
    { id: nextId(), tgl, jenis: "masuk", qty: "", harga: "", ket: "" },
    { id: nextId(), tgl, jenis: "keluar", qty: "", harga: "", ket: "" },
  ];
}

// Kartu Stock migrated to src/components/persediaan/KartuStockPanel.tsx

function renderKartuRows(kartu: PersediaanKartuRow[], metode: PersediaanMetode) {
  const isLayered = metode === "fifo" || metode === "lifo";

  return kartu.flatMap((k, rowIdx) => {
    const collapseSaldo = (layers: PersediaanKartuRow["saldoLayers"]) => {
      if (isLayered) return layers;
      const totalQty = layers.reduce((s, x) => s + x.qty, 0);
      const totalVal = layers.reduce((s, x) => s + x.qty * x.harga, 0);
      return [{ qty: totalQty, harga: totalQty ? totalVal / totalQty : 0 }];
    };

    const saldoRows = collapseSaldo(k.saldoLayers);

    if (k.mQty !== "") {
      const rowspan = saldoRows.length || 1;
      const first = saldoRows[0];
      return [
        <tr key={`m-${rowIdx}-0`}>
          <td rowSpan={rowspan} style={{ fontSize: "11px" }}>
            {k.tgl}
          </td>
          <td rowSpan={rowspan} style={{ fontSize: "12px" }}>
            {k.ket}
          </td>
          <td
            rowSpan={rowspan}
            style={{ borderLeft: "1px solid var(--border)" }}
            className="num"
          >
            {k.mQty}
          </td>
          <td rowSpan={rowspan} className="num">
            {fmtRp(Number(k.mHarga) || 0)}
          </td>
          <td rowSpan={rowspan} className="debit">
            {fmtRp(Number(k.mJml) || 0)}
          </td>
          <td
            rowSpan={rowspan}
            style={{ borderLeft: "1px solid var(--border)" }}
            className="num"
          />
          <td rowSpan={rowspan} className="num" />
          <td style={{ borderLeft: "1px solid var(--border)" }} className="num">
            {first?.qty || 0}
          </td>
          <td className="num">{fmtRp(first?.harga || 0)}</td>
          <td className="num">{fmtRp((first?.qty || 0) * (first?.harga || 0))}</td>
        </tr>,
        ...saldoRows.slice(1).map((sr, i) => (
          <tr key={`m-${rowIdx}-${i + 1}`}>
            <td
              style={{ borderLeft: "1px solid var(--border)" }}
              className="num"
            >
              {sr.qty}
            </td>
            <td className="num">{fmtRp(sr.harga)}</td>
            <td className="num">{fmtRp(sr.qty * sr.harga)}</td>
          </tr>
        )),
      ];
    }

    const keluarRows =
      isLayered && k.keluarLayers && k.keluarLayers.length > 1
        ? k.keluarLayers
        : null;

    if (!keluarRows) {
      const rowspan = saldoRows.length || 1;
      const first = saldoRows[0];
      return [
        <tr key={`k-${rowIdx}-0`}>
          <td rowSpan={rowspan} style={{ fontSize: "11px" }}>
            {k.tgl}
          </td>
          <td rowSpan={rowspan} style={{ fontSize: "12px" }}>
            {k.ket}
          </td>
          <td
            rowSpan={rowspan}
            style={{ borderLeft: "1px solid var(--border)" }}
            className="num"
          />
          <td rowSpan={rowspan} className="num" />
          <td rowSpan={rowspan} className="num" />
          <td
            rowSpan={rowspan}
            style={{ borderLeft: "1px solid var(--border)" }}
            className="num"
          >
            {k.kQty}
          </td>
          <td rowSpan={rowspan} className="num kredit">
            {fmtRp(Number(k.kHarga) || 0)}
          </td>
          <td style={{ borderLeft: "1px solid var(--border)" }} className="num">
            {first?.qty || 0}
          </td>
          <td className="num">{fmtRp(first?.harga || 0)}</td>
          <td className="num">{fmtRp((first?.qty || 0) * (first?.harga || 0))}</td>
        </tr>,
        ...saldoRows.slice(1).map((sr, i) => (
          <tr key={`k-${rowIdx}-${i + 1}`}>
            <td
              style={{ borderLeft: "1px solid var(--border)" }}
              className="num"
            >
              {sr.qty}
            </td>
            <td className="num">{fmtRp(sr.harga)}</td>
            <td className="num">{fmtRp(sr.qty * sr.harga)}</td>
          </tr>
        )),
      ];
    }

    const maxRows = Math.max(keluarRows.length, saldoRows.length || 1);
    const firstSaldo = saldoRows[0];
    return [
      <tr key={`km-${rowIdx}-0`}>
        <td rowSpan={maxRows} style={{ fontSize: "11px" }}>
          {k.tgl}
        </td>
        <td rowSpan={maxRows} style={{ fontSize: "12px" }}>
          {k.ket}
        </td>
        <td
          rowSpan={maxRows}
          style={{ borderLeft: "1px solid var(--border)" }}
          className="num"
        />
        <td rowSpan={maxRows} className="num" />
        <td rowSpan={maxRows} className="num" />
        <td style={{ borderLeft: "1px solid var(--border)" }} className="num">
          {keluarRows[0].qty}
        </td>
        <td className="num kredit">{fmtRp(keluarRows[0].harga)}</td>
        <td style={{ borderLeft: "1px solid var(--border)" }} className="num">
          {firstSaldo?.qty || ""}
        </td>
        <td className="num">
          {firstSaldo?.harga ? fmtRp(firstSaldo.harga) : ""}
        </td>
        <td className="num">
          {firstSaldo?.qty ? fmtRp(firstSaldo.qty * firstSaldo.harga) : ""}
        </td>
      </tr>,
      ...Array.from({ length: maxRows - 1 }, (_, i) => {
        const kr = keluarRows[i + 1] || null;
        const sr = saldoRows[i + 1] || null;
        return (
          <tr key={`km-${rowIdx}-${i + 1}`}>
            <td
              style={{ borderLeft: "1px solid var(--border)" }}
              className="num"
            >
              {kr ? kr.qty : ""}
            </td>
            <td className="num kredit">{kr ? fmtRp(kr.harga) : ""}</td>
            <td
              style={{ borderLeft: "1px solid var(--border)" }}
              className="num"
            >
              {sr ? sr.qty : ""}
            </td>
            <td className="num">{sr ? fmtRp(sr.harga) : ""}</td>
            <td className="num">{sr ? fmtRp(sr.qty * sr.harga) : ""}</td>
          </tr>
        );
      }),
    ];
  });
}

export default function KalkPersediaanPage() {
  const rowIdRef = useRef(0);
  const nextRowId = useCallback(() => {
    rowIdRef.current += 1;
    return rowIdRef.current;
  }, []);

  const [metode, setMetode] = useState<PersediaanMetode>("fifo");
  const [rows, setRows] = useState<InvInputRow[]>([]);
  const [result, setResult] = useState<PersediaanResult | null>(null);
  const [resultMetode, setResultMetode] = useState<PersediaanMetode>("fifo");

  const resetRows = useCallback(() => {
    rowIdRef.current = 0;
    setRows(createInitialRows(nextRowId));
    setResult(null);
    if (typeof window !== "undefined") {
      const win = window as unknown as Record<string, unknown>;
      win._invHpp = 0;
      win._invPendapatan = 0;
      win._invLaba = 0;
      win._invAdaHargaJual = false;
      win._invKartu = [];
      win._invStockLayers = [];
    }
  }, [nextRowId]);

  useEffect(() => {
    resetRows();
  }, [resetRows]);

  const addRow = useCallback(
    (jenis: "masuk" | "keluar") => {
      setRows((prev) => [
        ...prev,
        {
          id: nextRowId(),
          tgl: todayYmd(),
          jenis,
          qty: "",
          harga: "",
          ket: "",
        },
      ]);
    },
    [nextRowId]
  );

  const updateRow = useCallback(
    (id: number, field: keyof Omit<InvInputRow, "id" | "jenis">, val: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
      );
    },
    []
  );

  const removeRow = useCallback((id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleCalculate = useCallback(() => {
    const parsed = rows
      .map((r) => ({
        tgl: r.tgl,
        jenis: r.jenis,
        qty: parseFloat(r.qty) || 0,
        harga: parseFloat(r.harga) || 0,
        ket: r.ket,
      }))
      .filter((r) => r.qty > 0);

    if (!parsed.length) {
      callOasGlobal("showAlert", "Tambah data transaksi dulu!");
      return;
    }

    const res = hitungPersediaanPure(parsed, metode);
    setResult(res);
    setResultMetode(metode);

    if (typeof window !== "undefined") {
      const win = window as unknown as Record<string, unknown>;
      win._invHpp = res.hpp;
      win._invKartu = res.kartu;
      win._invMetode = metode;
      win._invStockLayers = res.stock.map((x) => ({ ...x }));
    }
  }, [rows, metode]);

  const openMetodePicker = useCallback(() => {
    callOasGlobal("openOptPicker", {
      title: "Pilih Metode Persediaan",
      options: METODE_OPTIONS.filter((m) => m.value !== "lifo").map((m) => ({
        value: m.value,
        label: m.label,
        sub: m.sub,
      })),
      currentValue: metode,
      onSelect: (val: string) => {
        const next = val as PersediaanMetode;
        if (METODE_OPTIONS.some((m) => m.value === next)) {
          setMetode(next);
        }
      },
    });
  }, [metode]);

  useEffect(() => {
    setOasWindowFn("openInvMetodeSheet", openMetodePicker);
    setOasWindowFn(
      "selectInvMetode",
      ((val: string) => {
        const next = val as PersediaanMetode;
        if (METODE_OPTIONS.some((m) => m.value === next)) {
          setMetode(next);
        }
        callOasGlobal("closeOptPicker");
      }) as (...args: never[]) => unknown
    );

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ kind?: string; tab?: string }>).detail;
      if (detail?.kind === "persediaan-calc") handleCalculate();
      else if (detail?.kind === "persediaan-reset") resetRows();
      else if (detail?.kind === "persediaan-add") {
        addRow(detail.tab === "keluar" ? "keluar" : "masuk");
      }
    };
    window.addEventListener("oas:kalk-sync", onSync);
    return () => window.removeEventListener("oas:kalk-sync", onSync);
  }, [openMetodePicker, handleCalculate, resetRows, addRow]);

  const currentMetodeMeta =
    METODE_OPTIONS.find((m) => m.value === metode) || METODE_OPTIONS[0];
  const resultMetodeMeta =
    METODE_OPTIONS.find((m) => m.value === resultMetode) || METODE_OPTIONS[0];

  return (
    <div className="page" id="page-kalk-persediaan" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Kalkulator Persediaan</div>
          <div className="section-sub">
            FIFO · LIFO · Weighted Average · Moving Average
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div
            className="table-title"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Settings size={16} strokeWidth={2} /> Metode &amp; Transaksi
          </div>
          <button
            id="inv-metode-btn"
            type="button"
            className="opt-picker-btn"
            onClick={openMetodePicker}
            style={{
              minWidth: "220px",
              maxWidth: "300px",
              padding: "8px 12px",
            }}
          >
            <span className="opt-picker-label" id="inv-metode-label-btn">
              {currentMetodeMeta.label} ({currentMetodeMeta.sub})
            </span>
            <span className="opt-picker-arrow">▾</span>
          </button>
          <input type="hidden" id="inv-metode" value={metode} />
        </div>

        <div className="modal-body">
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => addRow("masuk")}
            >
              + Pembelian/Masuk
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => addRow("keluar")}
            >
              + Penjualan/Keluar
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              className="btn btn-ghost btn-sm"
              onClick={handleCalculate}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <RefreshCw size={14} /> Hitung
            </motion.button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={resetRows}
            >
              Reset
            </button>
            <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => callOasGlobal("openModalTambahKS")}
                className="btn btn-sm"
                style={{
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  color: "var(--accent)",
                  fontSize: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus size={13} /> Kartu Stock
              </button>
              <button
                type="button"
                onClick={() => callOasGlobal("openModalKelolaSemuaKartuStock")}
                className="btn btn-sm"
                id="hapus-extra-card-btn"
                style={{
                  fontSize: "12px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Settings size={13} /> Kelola Kartu Stock
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Qty</th>
                  <th>Harga/Unit (Rp)</th>
                  <th>Keterangan</th>
                  <th />
                </tr>
              </thead>
              <tbody id="inv-input-body">
                {rows.map((row, idx) => (
                  <tr key={row.id} id={`invr-${row.id}`}>
                    <td>{idx + 1}</td>
                    <td>
                      <input
                        type="date"
                        value={row.tgl}
                        onChange={(e) => updateRow(row.id, "tgl", e.target.value)}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "5px",
                          padding: "5px",
                          color: "var(--text)",
                          fontSize: "12px",
                          width: "120px",
                        }}
                      />
                    </td>
                    <td>
                      <span
                        className={`badge ${row.jenis === "masuk" ? "badge-green" : "badge-red"}`}
                      >
                        {row.jenis === "masuk" ? "Masuk" : "Keluar"}
                      </span>
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={row.qty}
                        onChange={(e) => updateRow(row.id, "qty", e.target.value)}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "5px",
                          padding: "5px",
                          color: "var(--text)",
                          fontSize: "12px",
                          width: "80px",
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder={
                          row.jenis === "keluar" ? "(auto-HPP)" : "0"
                        }
                        min="0"
                        readOnly={row.jenis === "keluar"}
                        value={row.harga}
                        onChange={(e) =>
                          updateRow(row.id, "harga", e.target.value)
                        }
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "5px",
                          padding: "5px",
                          color: "var(--text)",
                          fontSize: "12px",
                          width: "100px",
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Keterangan"
                        value={row.ket}
                        onChange={(e) => updateRow(row.id, "ket", e.target.value)}
                        style={{
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          borderRadius: "5px",
                          padding: "5px",
                          color: "var(--text)",
                          fontSize: "12px",
                          width: "120px",
                        }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-label="Hapus baris"
                        onClick={() => removeRow(row.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--red)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <X size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {result ? (
        <motion.div
          id="inv-result"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="table-card">
            <div className="table-header">
              <div
                className="table-title"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <BarChart3 size={16} strokeWidth={2} /> Kartu Persediaan
              </div>
              <div
                id="inv-metode-label"
                style={{ fontSize: "12px", color: "var(--accent)" }}
              >
                Metode: {resultMetodeMeta.shortLabel}
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Tgl</th>
                    <th>Ket</th>
                    <th
                      colSpan={3}
                      style={{
                        textAlign: "center",
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      MASUK
                    </th>
                    <th
                      colSpan={2}
                      style={{
                        textAlign: "center",
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      KELUAR
                    </th>
                    <th
                      colSpan={3}
                      style={{
                        textAlign: "center",
                        borderLeft: "1px solid var(--border)",
                      }}
                    >
                      SALDO
                    </th>
                  </tr>
                  <tr>
                    <th />
                    <th />
                    <th style={{ borderLeft: "1px solid var(--border)" }}>
                      Qty
                    </th>
                    <th>Hrg Beli</th>
                    <th>Jumlah</th>
                    <th style={{ borderLeft: "1px solid var(--border)" }}>
                      Qty
                    </th>
                    <th>HPP/Unit</th>
                    <th style={{ borderLeft: "1px solid var(--border)" }}>
                      Qty
                    </th>
                    <th>Hrg</th>
                    <th>Jumlah</th>
                  </tr>
                </thead>
                <tbody id="inv-kartu-body">
                  {renderKartuRows(result.kartu, resultMetode)}
                </tbody>
              </table>
            </div>
            <KalkActionBar
              id="inv-input-btn-bar"
              label="Input ke Kartu Stock"
              onAction={() => callOasGlobal("inputKeKartuStock")}
            />
          </div>

          <div
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
            className="kalk-grid"
          >
            <div className="stat-card green">
              <div className="stat-label">Nilai Persediaan Akhir</div>
              <div className="stat-value" id="inv-akhir">
                {fmtRp(result.akhirVal)}
              </div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">Total HPP</div>
              <div className="stat-value" id="inv-hpp">
                {fmtRp(result.hpp)}
              </div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-label">Qty Akhir</div>
              <div className="stat-value" id="inv-qty">
                {result.akhirQty.toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      <KartuStockPanel />
    </div>
  );
}
