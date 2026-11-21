"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import { readJurnalEntries, setOasWindowFn } from "@/lib/shared/legacy-store";
import {
  createInitialUrutState,
  nextUrutJurnalState,
  urutkanJurnalUmum,
  type UrutJurnalState,
  type UrutKolom,
} from "@/lib/jurnal/urut-jurnal";
import { SortableTh } from "@/components/ui/SortableTh";
import type { JurnalEntry } from "@/types";
import { EmptyTableRow } from "../shared/EmptyTableRow";

export function JurnalKasPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [search, setSearch] = useState("");
  const [urut, setUrut] = useState<UrutJurnalState>(() =>
    createInitialUrutState("desc")
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderJurnalKas", syncFromStore);
  }, [syncFromStore]);

  const { rows, totalIn, totalOut, saldoAkhir } = useMemo(() => {
    const q = search.trim().toLowerCase();
    let saldo = 0;
    let tIn = 0;
    let tOut = 0;
    const list: Array<{
      key: string;
      tanggal: string;
      no: string;
      ket: string;
      masuk: number;
      keluar: number;
      saldo: number;
    }> = [];

    entries.forEach((j, ji) => {
      const ket = j.ket || j.keterangan || "";
      const match =
        !q ||
        ket.toLowerCase().includes(q) ||
        (j.no || "").toLowerCase().includes(q);

      (j.lines || []).forEach((l, li) => {
        if (l.akun === "1101") {
          const masuk = l.debit || 0;
          const keluar = l.kredit || 0;
          saldo += masuk - keluar;
          tIn += masuk;
          tOut += keluar;
          if ((masuk || keluar) && match) {
            list.push({
              key: `${j.no || ji}-${li}`,
              tanggal: j.tanggal,
              no: j.no || "",
              ket,
              masuk,
              keluar,
              saldo,
            });
          }
        }
      });
    });

    return {
      rows: urutkanJurnalUmum(list, urut),
      totalIn: tIn,
      totalOut: tOut,
      saldoAkhir: saldo,
    };
  }, [entries, search, urut]);

  const handleSort = useCallback((kolom: UrutKolom) => {
    setUrut((prev) => nextUrutJurnalState(prev, kolom));
  }, []);

  return (
    <div className="page" id="page-jurnal-kas" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Jurnal Kas</div>
          <div className="section-sub">Penerimaan dan pengeluaran kas</div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          id="filter-jk"
          placeholder="Cari keterangan, no. jurnal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <SortableTh
                  id="urut-kas-tgl"
                  label="Tanggal"
                  title="Klik untuk mengubah urutan tanggal"
                  state={urut}
                  kolom="tgl"
                  onToggle={handleSort}
                />
                <SortableTh
                  id="urut-kas-no"
                  label="No. Jurnal"
                  title="Klik untuk mengurutkan nomor jurnal"
                  state={urut}
                  kolom="no"
                  onToggle={handleSort}
                />
                <th>Keterangan</th>
                <th>Penerimaan</th>
                <th>Pengeluaran</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody id="jurnal-kas-body">
              {rows.length === 0 ? (
                <EmptyTableRow
                  colSpan={6}
                  text={
                    search.trim()
                      ? "Tidak ada transaksi kas sesuai pencarian"
                      : "Belum ada transaksi kas"
                  }
                />
              ) : (
                rows.map((r) => (
                  <tr key={r.key}>
                    <td>{fmtDate(r.tanggal)}</td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                      {r.no}
                    </td>
                    <td>{r.ket}</td>
                    <td className="debit">{r.masuk ? fmtRp(r.masuk) : ""}</td>
                    <td className="kredit">{r.keluar ? fmtRp(r.keluar) : ""}</td>
                    <td
                      className="num"
                      style={{
                        color: r.saldo >= 0 ? "var(--accent)" : "var(--red)",
                      }}
                    >
                      {fmtRp(r.saldo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div
          id="jurnal-kas-total"
          style={{
            padding: "12px 16px",
            background: "var(--surface2)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
            Total Penerimaan:{" "}
            <b style={{ color: "var(--accent)", fontFamily: "var(--mono)" }}>
              {fmtRp(totalIn)}
            </b>{" "}
            &nbsp;|&nbsp; Total Pengeluaran:{" "}
            <b style={{ color: "var(--red)", fontFamily: "var(--mono)" }}>
              {fmtRp(totalOut)}
            </b>{" "}
            &nbsp;|&nbsp; Saldo Akhir Kas:{" "}
            <b style={{ color: "var(--accent2)", fontFamily: "var(--mono)" }}>
              {fmtRp(saldoAkhir)}
            </b>
          </span>
        </div>
      </div>
    </div>
  );
}
