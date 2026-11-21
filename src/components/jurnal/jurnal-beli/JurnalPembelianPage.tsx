"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  jurnalPembelianAktif,
  ringkasJurnalPembelian,
} from "@/lib/shared/accounting";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import {
  readAkuns,
  readAkunsTrash,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import {
  createInitialUrutState,
  nextUrutJurnalState,
  urutkanJurnalUmum,
  type UrutJurnalState,
  type UrutKolom,
} from "@/lib/jurnal/urut-jurnal";
import { SortableTh } from "@/components/ui/SortableTh";
import type { Akun, AkunTrashItem, JurnalEntry } from "@/types";
import { AkunNamaLabel } from "../shared/AkunNamaLabel";
import { EmptyTableRow } from "../shared/EmptyTableRow";

export function JurnalPembelianPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [akunsTrash, setAkunsTrash] = useState<AkunTrashItem[]>([]);
  const [search, setSearch] = useState("");
  const [urut, setUrut] = useState<UrutJurnalState>(() =>
    createInitialUrutState("asc")
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
    setAkunsTrash([...readAkunsTrash()]);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderJurnalPembelian", syncFromStore);
  }, [syncFromStore]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = jurnalPembelianAktif(entries)
      .map((j, idx) => {
        const rs = ringkasJurnalPembelian(j);
        const ket = j.ket || j.keterangan || "";
        return {
          key: `${rs.no || idx}-${j.tanggal}`,
          tanggal: j.tanggal,
          no: rs.no,
          ket,
          tunai: rs.tunai,
          debit: rs.debit,
          kredit: rs.kredit,
        };
      })
      .filter((r) => {
        if (!r.debit.length) return false;
        if (
          q &&
          !r.ket.toLowerCase().includes(q) &&
          !(r.no || "").toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });

    return urutkanJurnalUmum(list, urut);
  }, [entries, search, urut]);

  const handleSort = useCallback((kolom: UrutKolom) => {
    setUrut((prev) => nextUrutJurnalState(prev, kolom));
  }, []);

  return (
    <div className="page" id="page-jurnal-pembelian" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Jurnal Pembelian</div>
          <div className="section-sub">Semua transaksi pembelian</div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          id="filter-jb"
          placeholder="Cari keterangan, no. faktur..."
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
                  id="urut-beli-tgl"
                  label="Tanggal"
                  title="Klik untuk mengubah urutan tanggal"
                  state={urut}
                  kolom="tgl"
                  onToggle={handleSort}
                />
                <SortableTh
                  id="urut-beli-no"
                  label="No. Faktur"
                  title="Klik untuk mengurutkan nomor faktur"
                  state={urut}
                  kolom="no"
                  onToggle={handleSort}
                />
                <th>Keterangan</th>
                <th>Metode</th>
                <th>Akun Debit</th>
                <th>Kas/Utang Kr</th>
              </tr>
            </thead>
            <tbody id="jurnal-pembelian-body">
              {rows.length === 0 ? (
                <EmptyTableRow
                  colSpan={6}
                  text={
                    search.trim()
                      ? "Tidak ada pembelian sesuai pencarian"
                      : "Belum ada pembelian"
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
                        className={`badge ${r.tunai ? "badge-green" : "badge-yellow"}`}
                      >
                        {r.tunai ? "Tunai" : "Kredit"}
                      </span>
                    </td>
                    <td>
                      {r.debit.map((l, i) => (
                        <Fragment key={`${l.akun}-${i}`}>
                          {i > 0 ? <br /> : null}
                          <AkunNamaLabel
                            kode={l.akun}
                            akuns={akuns}
                            akunsTrash={akunsTrash}
                          />{" "}
                          — <span className="debit">{fmtRp(l.debit)}</span>
                        </Fragment>
                      ))}
                    </td>
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
