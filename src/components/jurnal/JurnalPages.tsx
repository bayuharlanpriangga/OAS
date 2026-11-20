"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Paperclip,
  RotateCcw,
  Settings,
} from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import {
  getReversalOf,
  getReversedMap,
  isJurnalPembalik,
  JENIS_PENUTUP,
  jurnalPembelianAktif,
  ketTanpaPrefixPembalik,
  ringkasJurnalPembelian,
} from "@/lib/accounting";
import { fmtDate, fmtRp } from "@/lib/format";
import { getPpnSubBadge, jeninsBadge } from "@/lib/laporan";
import { callOasGlobal } from "@/lib/legacy-actions";
import {
  readAkuns,
  readAkunsTrash,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/legacy-store";
import {
  createInitialUrutState,
  getSortIndicator,
  nextUrutJurnalState,
  urutkanJurnalUmum,
  type UrutJurnalState,
  type UrutKolom,
} from "@/lib/urut-jurnal";
import type { Akun, AkunTrashItem, JurnalEntry } from "@/types";

function AkunNamaLabel({
  kode,
  akuns,
  akunsTrash,
}: {
  kode: string;
  akuns: readonly Akun[];
  akunsTrash: readonly AkunTrashItem[];
}) {
  const found = akuns.find((a) => a.kode === kode);
  if (found) return <>{found.nama}</>;
  const inTrash = akunsTrash.some((a) => a.kode === kode);
  const label = inTrash
    ? `Akun tidak ditemukan (${kode} — di Sampah COA)`
    : `Akun tidak ditemukan (${kode})`;
  return (
    <span
      style={{
        color: "var(--red)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
      title={label}
    >
      <AlertTriangle size={12} /> {label}
    </span>
  );
}

function SortableTh({
  id,
  label,
  title,
  state,
  kolom,
  onToggle,
}: {
  id: string;
  label: string;
  title: string;
  state: UrutJurnalState;
  kolom: UrutKolom;
  onToggle: (kolom: UrutKolom) => void;
}) {
  const { arrow, active, ariaSort } = getSortIndicator(state, kolom);
  return (
    <th
      id={id}
      className={`th-sort${active ? " sort-aktif" : ""}`}
      aria-sort={ariaSort}
      title={title}
      onClick={() => onToggle(kolom)}
      style={{ cursor: "pointer" }}
    >
      {label} <span className="sort-ind">{arrow}</span>
    </th>
  );
}

function EmptyTableRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)" }}
      >
        {text}
      </td>
    </tr>
  );
}

function readAttachmentsMap(): Record<string, unknown[]> {
  const res = callOasGlobal("getAttachments");
  if (res && typeof res === "object") return res as Record<string, unknown[]>;
  return {};
}

// ═══════════════════════════════════════════════════════════════════
// 1. JURNAL UMUM
// ═══════════════════════════════════════════════════════════════════
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
                                  background: "rgba(245,158,11,0.1)",
                                  border: "1px solid rgba(245,158,11,0.3)",
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

// ═══════════════════════════════════════════════════════════════════
// 2. JURNAL KAS
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 3. JURNAL PENJUALAN
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 4. JURNAL PEMBELIAN
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// 5. BUKU BESAR
// ═══════════════════════════════════════════════════════════════════
export function BukuBesarPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [selectedKode, setSelectedKode] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [urut, setUrut] = useState<UrutJurnalState>(() =>
    createInitialUrutState("asc")
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
    const domKode = (
      document.getElementById("bb-akun-filter-val") as HTMLInputElement | null
    )?.value;
    if (domKode) setSelectedKode(domKode);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderBukuBesar", syncFromStore);
    setOasWindowFn("openBukuBesarPicker", () => {
      setAkuns([...readAkuns()]);
      setPickerOpen(true);
    });
  }, [syncFromStore]);

  const selectedAkun = useMemo(
    () => akuns.find((a) => a.kode === selectedKode) || null,
    [akuns, selectedKode]
  );

  const { rows, saldoAkhir } = useMemo(() => {
    if (!selectedKode) return { rows: [], saldoAkhir: 0 };
    let saldo = 0;
    const normal = selectedAkun?.normal;
    const list: Array<{
      key: string;
      tanggal: string;
      no: string;
      ket: string;
      debit: number;
      kredit: number;
      saldo: number;
      posisi: "D" | "K";
    }> = [];

    entries.forEach((j, ji) => {
      (j.lines || []).forEach((l, li) => {
        if (l.akun === selectedKode) {
          if (normal === "D") saldo += (l.debit || 0) - (l.kredit || 0);
          else saldo += (l.kredit || 0) - (l.debit || 0);
          const posisi: "D" | "K" =
            saldo >= 0
              ? normal === "D"
                ? "D"
                : "K"
              : normal === "D"
                ? "K"
                : "D";
          list.push({
            key: `${j.no || ji}-${li}`,
            tanggal: j.tanggal,
            no: j.no || "",
            ket: j.ket || j.keterangan || "",
            debit: l.debit || 0,
            kredit: l.kredit || 0,
            saldo,
            posisi,
          });
        }
      });
    });

    return { rows: urutkanJurnalUmum(list, urut), saldoAkhir: saldo };
  }, [entries, selectedKode, selectedAkun, urut]);

  const handleSort = useCallback((kolom: UrutKolom) => {
    setUrut((prev) => nextUrutJurnalState(prev, kolom));
  }, []);

  return (
    <div className="page" id="page-buku-besar" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Buku Besar</div>
          <div className="section-sub">Mutasi per akun</div>
        </div>
      </div>

      <div className="filter-bar">
        <input type="hidden" id="bb-akun-filter-val" value={selectedKode} readOnly />
        <button
          type="button"
          id="bb-akun-filter-btn"
          className={`form-picker-btn${selectedAkun ? " has-value" : ""}`}
          onClick={() => {
            setAkuns([...readAkuns()]);
            setPickerOpen(true);
          }}
          style={{ minWidth: "220px", maxWidth: "340px" }}
        >
          {selectedAkun ? (
            <>
              <span
                className="picker-kode-badge"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "11px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                  marginRight: "6px",
                }}
              >
                {selectedAkun.kode}
              </span>
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {selectedAkun.nama}
              </span>
            </>
          ) : (
            <>
              <span className="opt-picker-label" style={{ color: "var(--muted)" }}>
                -- Pilih Akun --
              </span>
              <span className="opt-picker-arrow">▾</span>
            </>
          )}
        </button>
      </div>

      <div id="buku-besar-content">
        {!selectedKode ? (
          <div
            style={{
              color: "var(--muted)",
              padding: "32px",
              textAlign: "center",
            }}
          >
            Pilih akun untuk melihat buku besar
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                marginBottom: "12px",
              }}
            >
              Akun:{" "}
              <b style={{ color: "var(--text)" }}>
                {selectedAkun?.kode || selectedKode} -{" "}
                {selectedAkun?.nama || selectedKode}
              </b>{" "}
              &nbsp;|&nbsp; Tipe: {selectedAkun?.tipe || "—"} &nbsp;|&nbsp;
              Normal: {selectedAkun?.normal === "D" ? "Debit" : "Kredit"}
            </div>
            <div className="table-card">
              <div className="table-scroll">
                <table style={{ minWidth: "600px" }}>
                  <thead>
                    <tr>
                      <SortableTh
                        id="urut-bb-tgl"
                        label="Tanggal"
                        title="Klik untuk mengubah urutan tanggal"
                        state={urut}
                        kolom="tgl"
                        onToggle={handleSort}
                      />
                      <SortableTh
                        id="urut-bb-no"
                        label="No. Jurnal"
                        title="Klik untuk mengurutkan nomor jurnal"
                        state={urut}
                        kolom="no"
                        onToggle={handleSort}
                      />
                      <th>Keterangan</th>
                      <th style={{ textAlign: "right" }}>Debit</th>
                      <th style={{ textAlign: "right" }}>Kredit</th>
                      <th style={{ textAlign: "right" }}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "24px",
                            color: "var(--muted)",
                          }}
                        >
                          Tidak ada mutasi
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => (
                        <tr key={r.key}>
                          <td>{fmtDate(r.tanggal)}</td>
                          <td
                            style={{ fontFamily: "var(--mono)", fontSize: "12px" }}
                          >
                            {r.no}
                          </td>
                          <td>{r.ket}</td>
                          <td className="debit" style={{ textAlign: "right" }}>
                            {r.debit ? fmtRp(r.debit) : ""}
                          </td>
                          <td className="kredit" style={{ textAlign: "right" }}>
                            {r.kredit ? fmtRp(r.kredit) : ""}
                          </td>
                          <td
                            className="num"
                            style={{
                              textAlign: "right",
                              color:
                                r.saldo >= 0 ? "var(--accent)" : "var(--red)",
                            }}
                          >
                            {fmtRp(Math.abs(r.saldo))} {r.posisi}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={5} style={{ textAlign: "right" }}>
                        Saldo Akhir
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtRp(Math.abs(saldoAkhir))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AkunPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        akuns={akuns}
        selectedKode={selectedKode}
        title="Pilih Akun Buku Besar"
        onSelect={(a) => setSelectedKode(a.kode)}
      />
    </div>
  );
}
