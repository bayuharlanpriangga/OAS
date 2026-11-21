"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Paperclip, RotateCcw, Settings } from "lucide-react";
import {
  getReversalOf,
  getReversedMap,
  JENIS_PENUTUP,
  ketTanpaPrefixPembalik,
} from "@/lib/shared/accounting";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import { getPpnSubBadge, jeninsBadge } from "@/lib/laporan";
import {
  callOasGlobal,
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
import { readAttachmentsMap } from "../shared/readAttachmentsMap";

export function JurnalUmumPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [akunsTrash, setAkunsTrash] = useState<AkunTrashItem[]>([]);
  const [attachMap, setAttachMap] = useState<Record<string, unknown[]>>({});
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [urut, setUrut] = useState<UrutJurnalState>(() =>
    createInitialUrutState("desc")
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
    setAkunsTrash([...readAkunsTrash()]);
    setAttachMap(readAttachmentsMap());
    const domSearch = (
      document.getElementById("filter-ju") as HTMLInputElement | null
    )?.value;
    if (typeof domSearch === "string") setSearch(domSearch);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderJurnalUmum", syncFromStore);
    setOasWindowFn("updateSaldoAwalBtnVisibility", syncFromStore);
    setOasWindowFn("syncJurnalTypeFilter", syncFromStore);
  }, [syncFromStore]);

  const jenisOptions = useMemo(() => {
    const dasar = ["Kas", "Penjualan", "Pembelian", "Manual"];
    const lain = Array.from(
      new Set(entries.map((j) => j.jenis).filter(Boolean))
    )
      .filter((x) => !dasar.includes(x) && x !== JENIS_PENUTUP)
      .sort((a, b) => a.localeCompare(b, "id"));
    return [...dasar, ...lain, JENIS_PENUTUP];
  }, [entries]);

  const revMap = useMemo(() => getReversedMap(entries), [entries]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = entries.filter((j) => {
      if (typeFilter && j.jenis !== typeFilter) return false;
      if (
        q &&
        !(j.ket || j.keterangan || "").toLowerCase().includes(q) &&
        !(j.no || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    return urutkanJurnalUmum(filtered, urut);
  }, [entries, search, typeFilter, urut]);

  const handleSort = useCallback((kolom: UrutKolom) => {
    setUrut((prev) => nextUrutJurnalState(prev, kolom));
  }, []);

  return (
    <div className="page" id="page-jurnal-umum" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Jurnal Umum</div>
          <div className="section-sub">Semua entri jurnal</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {entries.length === 0 ? (
            <button
              type="button"
              id="btn-setting-saldo-awal"
              className="btn btn-ghost btn-sm"
              onClick={() => callOasGlobal("openModalSaldoAwal")}
              data-tooltip="Hanya bisa diatur sebelum ada transaksi apapun"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Settings size={14} /> Setting Saldo Awal
            </button>
          ) : null}
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          id="filter-ju"
          placeholder="Cari keterangan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id="filter-ju-type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Semua Jenis</option>
          {jenisOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <SortableTh
                  id="urut-umum-tgl"
                  label="Tanggal"
                  title="Klik untuk mengubah urutan tanggal"
                  state={urut}
                  kolom="tgl"
                  onToggle={handleSort}
                />
                <SortableTh
                  id="urut-umum-no"
                  label="No. Jurnal"
                  title="Klik untuk mengurutkan nomor jurnal"
                  state={urut}
                  kolom="no"
                  onToggle={handleSort}
                />
                <th>Keterangan</th>
                <th>Jenis</th>
                <th>Akun</th>
                <th>Debit</th>
                <th>Kredit</th>
                <th style={{ width: "36px" }} />
                <th style={{ width: "40px" }} />
              </tr>
            </thead>
            <tbody id="jurnal-umum-body">
              {displayed.length === 0 ? (
                <EmptyTableRow colSpan={9} text="Belum ada jurnal" />
              ) : (
                displayed.map((j, dispIdx) => {
                  const origIdx = entries.indexOf(j);
                  const lines = j.lines || [];
                  const attachCount = (j.no ? attachMap[j.no] : undefined)?.length || 0;
                  const ppnSubBadge = getPpnSubBadge(j, akuns);
                  const dibalikOleh = (j.no && revMap.get(j.no)) || "";
                  const pembalikAtas = getReversalOf(j);
                  const ketTampil = ketTanpaPrefixPembalik(
                    j.ket || j.keterangan || ""
                  );

                  return lines.map((l, i) => (
                    <tr key={`${j.no || j.id || dispIdx}-${i}`}>
                      {i === 0 ? (
                        <>
                          <td rowSpan={lines.length}>{fmtDate(j.tanggal)}</td>
                          <td
                            rowSpan={lines.length}
                            style={{ fontFamily: "var(--mono)", fontSize: "12px" }}
                          >
                            {j.no || "—"}
                          </td>
                          <td rowSpan={lines.length}>
                            {ketTampil}
                            {pembalikAtas ? (
                              <span
                                style={{
                                  fontSize: "9px",
                                  color: "var(--accent3)",
                                  display: "block",
                                  fontFamily: "var(--mono)",
                                }}
                              >
                                Pembalik {pembalikAtas}
                              </span>
                            ) : dibalikOleh ? (
                              <span
                                style={{
                                  fontSize: "9px",
                                  color: "var(--accent3)",
                                  display: "block",
                                  fontFamily: "var(--mono)",
                                }}
                              >
                                Dibalik oleh {dibalikOleh}
                              </span>
                            ) : null}
                            {j.kodeRef ? (
                              <span
                                style={{
                                  fontSize: "9px",
                                  color: "var(--muted)",
                                  display: "block",
                                  fontFamily: "var(--mono)",
                                }}
                              >
                                {j.kodeRef}
                              </span>
                            ) : null}
                          </td>
                          <td rowSpan={lines.length}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "3px",
                                alignItems: "flex-start",
                              }}
                            >
                              <span className={`badge ${jeninsBadge(j.jenis)}`}>
                                {j.jenis}
                              </span>
                              {ppnSubBadge ? (
                                <span
                                  className="badge badge-yellow"
                                  style={{ fontSize: "9px" }}
                                >
                                  {ppnSubBadge}
                                </span>
                              ) : null}
                              {j.sumber ? (
                                <span
                                  className="badge badge-blue"
                                  style={{ fontSize: "9px" }}
                                >
                                  {j.sumber}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </>
                      ) : null}
                      <td style={l.debit ? undefined : { paddingLeft: "28px" }}>
                        <AkunNamaLabel
                          kode={l.akun}
                          akuns={akuns}
                          akunsTrash={akunsTrash}
                        />
                      </td>
                      <td className="debit">{l.debit ? fmtRp(l.debit) : ""}</td>
                      <td className="kredit">{l.kredit ? fmtRp(l.kredit) : ""}</td>
                      {i === 0 ? (
                        <>
                          <td
                            rowSpan={lines.length}
                            style={{
                              textAlign: "center",
                              verticalAlign: "middle",
                              padding: "4px 2px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                callOasGlobal("openAttachModal", origIdx)
                              }
                              title="Lampiran"
                              aria-label="Lampiran jurnal"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px 5px",
                                borderRadius: "6px",
                                opacity: attachCount ? 1 : 0.35,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                color: attachCount
                                  ? "var(--accent2)"
                                  : "var(--muted)",
                              }}
                            >
                              <Paperclip size={14} />
                              {attachCount ? (
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    fontFamily: "var(--mono)",
                                  }}
                                >
                                  {attachCount}
                                </span>
                              ) : null}
                            </button>
                          </td>
                          <td
                            rowSpan={lines.length}
                            style={{ textAlign: "center", verticalAlign: "middle" }}
                          >
                            {dibalikOleh || pembalikAtas ? (
                              <span
                                title={
                                  pembalikAtas
                                    ? "Jurnal pembalik — tidak bisa dibalik lagi"
                                    : `Sudah dibalik oleh ${dibalikOleh}`
                                }
                                style={{ fontSize: "10px", color: "var(--muted)" }}
                              >
                                {pembalikAtas ? "—" : "Dibalik"}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  callOasGlobal("konfirmasiBalikJurnal", origIdx)
                                }
                                data-tooltip="Balik Jurnal"
                                aria-label="Balik jurnal"
                                style={{
                                  background: "rgba(217,119,43,0.12)",
                                  border: "1px solid var(--accent3)",
                                  borderRadius: "6px",
                                  padding: "5px 8px",
                                  cursor: "pointer",
                                  color: "var(--accent3)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
