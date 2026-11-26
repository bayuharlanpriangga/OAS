"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import { fmtDate, fmtRp } from "@/lib/shared/format";
import {
  readAkuns,
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
import type { Akun, JurnalEntry } from "@/types";

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
              &nbsp;|&nbsp; Tipe: {selectedAkun?.tipe || "-"} &nbsp;|&nbsp;
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
