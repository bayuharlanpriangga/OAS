"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getReversedMap, isJurnalPembalik } from "@/lib/accounting";
import { fmtDate, fmtRp } from "@/lib/format";
import { readJurnalEntries, setOasWindowFn } from "@/lib/legacy-store";
import {
  createInitialUrutState,
  nextUrutJurnalState,
  urutkanJurnalUmum,
  type UrutJurnalState,
  type UrutKolom,
} from "@/lib/urut-jurnal";
import type { JurnalEntry } from "@/types";
import { EmptyTableRow } from "./EmptyTableRow";
import { SortableTh } from "./SortableTh";

export function JurnalPenjualanPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [search, setSearch] = useState("");
  const [urut, setUrut] = useState<UrutJurnalState>(() =>
    createInitialUrutState("asc")
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderJurnalPenjualan", syncFromStore);
  }, [syncFromStore]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const revMap = getReversedMap(entries);
    const list: Array<{
      key: string;
      tanggal: string;
      no: string;
      ket: string;
      isTunai: boolean;
      debit: number;
      kredit: number;
    }> = [];

    entries
      .filter(
        (j) =>
          j.jenis === "Penjualan" &&
          !isJurnalPembalik(j) &&
          !(j.no && revMap.has(j.no))
      )
      .forEach((j, idx) => {
        const ket = j.ket || j.keterangan || "";
        const no = j.ref || j.no || "";
        if (
          q &&
          !ket.toLowerCase().includes(q) &&
          !no.toLowerCase().includes(q)
        ) {
          return;
        }
        const kasLine = (j.lines || []).find((l) =>
          ["1101", "1201"].includes(l.akun)
        );
        const jualLine = (j.lines || []).find((l) => l.akun === "4101");
        if (jualLine) {
          list.push({
            key: `${no || idx}-${j.tanggal}`,
            tanggal: j.tanggal,
            no,
            ket,
            isTunai: kasLine?.akun === "1101",
            debit: kasLine?.debit || 0,
            kredit: jualLine.kredit || 0,
          });
        }
      });

    return urutkanJurnalUmum(list, urut);
  }, [entries, search, urut]);

  const handleSort = useCallback((kolom: UrutKolom) => {
    setUrut((prev) => nextUrutJurnalState(prev, kolom));
  }, []);

  return (
    <div className="page" id="page-jurnal-penjualan" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Jurnal Penjualan</div>
          <div className="section-sub">Semua transaksi penjualan</div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          id="filter-jp"
          placeholder="Cari keterangan, no. invoice..."
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
                  id="urut-jual-tgl"
                  label="Tanggal"
                  title="Klik untuk mengubah urutan tanggal"
                  state={urut}
                  kolom="tgl"
                  onToggle={handleSort}
                />
                <SortableTh
                  id="urut-jual-no"
                  label="No. Invoice"
                  title="Klik untuk mengurutkan nomor invoice"
                  state={urut}
                  kolom="no"
                  onToggle={handleSort}
                />
                <th>Keterangan</th>
                <th>Metode</th>
                <th>Piutang/Kas Dr</th>
                <th>Penjualan Kr</th>
              </tr>
            </thead>
            <tbody id="jurnal-penjualan-body">
              {rows.length === 0 ? (
                <EmptyTableRow
                  colSpan={6}
                  text={
                    search.trim()
                      ? "Tidak ada penjualan sesuai pencarian"
                      : "Belum ada penjualan"
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
                    <td>
                      <span
                        className={`badge ${r.isTunai ? "badge-green" : "badge-blue"}`}
                      >
                        {r.isTunai ? "Tunai" : "Kredit"}
                      </span>
                    </td>
                    <td className="debit">{fmtRp(r.debit)}</td>
                    <td className="kredit">{fmtRp(r.kredit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
