"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Plus,
  Save,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { fmtRp as rp } from "@/lib/shared/format";
import { saveFiturBaru } from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readAnggaranList,
  readJurnalEntries,
  setOasWindowFn,
  writeAnggaranList,
  type AnggaranRecord,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";

function fmtShort(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}M`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}jt`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)}rb`;
  return String(Math.round(v));
}

function AnggaranBarChartSvg({
  items,
}: {
  items: Array<{ label: string; anggaran: number; aktual: number }>;
}) {
  if (!items.length) {
    return (
      <div
        style={{
          color: "var(--muted)",
          textAlign: "center",
          padding: "40px 16px",
          fontSize: "13px",
        }}
      >
        Belum ada data chart anggaran bulan ini.
      </div>
    );
  }
  const maxVal = Math.max(
    1,
    ...items.map((x) => Math.max(x.anggaran, x.aktual))
  );
  const w = Math.max(420, items.length * 76 + 56);
  const h = 200;
  const padL = 48;
  const padB = 34;
  const padT = 18;
  const plotH = h - padT - padB;
  const slotW = (w - padL - 12) / Math.max(1, items.length);
  const barW = Math.min(20, slotW * 0.34);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "14px",
          fontSize: "11px",
          color: "var(--muted)",
          marginBottom: "8px",
          justifyContent: "flex-end",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "var(--accent2)",
              display: "inline-block",
            }}
          />
          Anggaran
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "var(--accent)",
              display: "inline-block",
            }}
          />
          Aktual
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", minWidth: `${w}px`, height: `${h}px` }}
      >
        {[0, 0.5, 1].map((t, i) => {
          const y = padT + plotH * (1 - t);
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={w - 8}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--muted)"
                fontSize="9.5"
              >
                {fmtShort(maxVal * t)}
              </text>
            </g>
          );
        })}
        {items.map((item, i) => {
          const cx = padL + i * slotW + slotW / 2;
          const hAng = (Math.max(0, item.anggaran) / maxVal) * plotH;
          const hAkt = (Math.max(0, item.aktual) / maxVal) * plotH;
          const over = item.aktual > item.anggaran;
          return (
            <g key={`${item.label}-${i}`}>
              <rect
                x={cx - barW - 1.5}
                y={padT + plotH - hAng}
                width={barW}
                height={hAng}
                rx={3}
                fill="var(--accent2)"
              />
              <rect
                x={cx + 1.5}
                y={padT + plotH - hAkt}
                width={barW}
                height={hAkt}
                rx={3}
                fill={over ? "var(--red)" : "var(--accent)"}
              />
              <text
                x={cx}
                y={h - 10}
                textAnchor="middle"
                fill="var(--muted)"
                fontSize="9.5"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AnggaranPage() {
  const [anggaranList, setAnggaranList] = useState<AnggaranRecord[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [jurnalEntries, setJurnalEntries] = useState<JurnalEntry[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [akunKode, setAkunKode] = useState("");
  const [periode, setPeriode] = useState("");
  const [nominal, setNominal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const syncFromStore = useCallback(() => {
    setAnggaranList([...readAnggaranList()]);
    setAkuns([...readAkuns()]);
    setJurnalEntries([...readJurnalEntries()]);
  }, []);

  const openModalForm = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "mengatur anggaran") === true) return;
    setAkuns([...readAkuns()]);
    const now = new Date();
    const defaultPer = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setAkunKode("");
    setPeriode(defaultPer);
    setNominal("");
    setCatatan("");
    setModalOpen(true);
  }, []);

  const handleSimpan = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "menyimpan anggaran") === true) return;
    const numNominal = parseFloat(nominal) || 0;
    if (!akunKode || !periode || !numNominal) {
      callOasGlobal("showAlert", "Lengkapi semua field");
      return;
    }
    const current = [...readAnggaranList()];
    const existIdx = current.findIndex(
      (a) => a.akunKode === akunKode && a.periode === periode
    );
    const item: AnggaranRecord = {
      id: existIdx >= 0 ? current[existIdx].id : `ang_${Date.now()}`,
      akunKode,
      periode,
      nominal: numNominal,
      catatan: catatan.trim(),
    };
    if (existIdx >= 0) current[existIdx] = item;
    else current.push(item);

    writeAnggaranList(current);
    saveFiturBaru();
    callOasGlobal(
      "auditLog",
      "edit",
      "anggaran",
      `Simpan anggaran periode ${periode}`,
      { ref: periode }
    );
    setModalOpen(false);
    syncFromStore();
    callOasGlobal("showAlert", "Anggaran berhasil disimpan!");
  }, [akunKode, catatan, nominal, periode, syncFromStore]);

  const handleHapus = useCallback(
    (id: string) => {
      if (callOasGlobal("guardHanyaBaca", "menghapus anggaran") === true) return;
      const target = readAnggaranList().find((a) => a.id === id);
      writeAnggaranList(readAnggaranList().filter((a) => a.id !== id));
      saveFiturBaru();
      callOasGlobal(
        "auditLog",
        "delete",
        "anggaran",
        `Hapus anggaran: ${target?.periode || id}`,
        { ref: id }
      );
      syncFromStore();
      callOasGlobal("showAlert", "Anggaran dihapus");
    },
    [syncFromStore]
  );

  useEffect(() => {
    syncFromStore();
    setOasWindowFn(
      "renderAnggaranPage",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openModalAnggaran",
      openModalForm as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "hapusAnggaran",
      handleHapus as (...args: never[]) => unknown
    );
  }, [handleHapus, openModalForm, syncFromStore]);

  const periodeAktif = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const getAktual = useCallback(
    (kode: string, per: string) => {
      return jurnalEntries
        .filter((j) => j.tanggal?.startsWith(per))
        .reduce(
          (s, j) =>
            s +
            (j.lines || [])
              .filter((l) => l.akun === kode)
              .reduce((ss, l) => ss + Math.max(l.debit || 0, l.kredit || 0), 0),
          0
        );
    },
    [jurnalEntries]
  );

  const angBulanIni = useMemo(
    () => anggaranList.filter((a) => a.periode === periodeAktif),
    [anggaranList, periodeAktif]
  );

  const kpi = useMemo(() => {
    const totAng = angBulanIni.reduce((s, a) => s + a.nominal, 0);
    const totAkt = angBulanIni.reduce(
      (s, a) => s + getAktual(a.akunKode, periodeAktif),
      0
    );
    return {
      totAng,
      totAkt,
      variance: totAng - totAkt,
      count: angBulanIni.length,
    };
  }, [angBulanIni, getAktual, periodeAktif]);

  const chartItems = useMemo(
    () =>
      angBulanIni.map((a) => ({
        label:
          akuns.find((x) => x.kode === a.akunKode)?.nama?.slice(0, 12) ||
          a.akunKode,
        anggaran: a.nominal,
        aktual: getAktual(a.akunKode, periodeAktif),
      })),
    [akuns, angBulanIni, getAktual, periodeAktif]
  );

  const selectedAkunObj = akuns.find((a) => a.kode === akunKode);

  return (
    <div className="page" id="page-anggaran" data-react-managed="1">
      <div className="section-header page-actions-only">
        <button
          type="button"
          className="btn btn-primary"
          onClick={openModalForm}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={15} /> Set Anggaran
        </button>
      </div>

      <div className="oas-kpi-strip" id="ang-kpi">
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">Total anggaran</span>
          <span className="oas-kpi-val" style={{ color: "var(--text)" }}>
            {rp(kpi.totAng)}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">Total aktual</span>
          <span className="oas-kpi-val" style={{ color: "var(--text)" }}>
            {rp(kpi.totAkt)}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">Selisih (variance)</span>
          <span
            className="oas-kpi-val"
            style={{ color: kpi.variance >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {rp(kpi.variance)}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">Akun dianggarkan</span>
          <span className="oas-kpi-val" style={{ color: "var(--accent-text)" }}>
            {kpi.count}
          </span>
        </div>
      </div>

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <BarChart3 size={15} /> Progress Anggaran Bulan Ini
            </div>
          </div>
          <div style={{ padding: "12px" }} id="ang-progress-list">
            {angBulanIni.length === 0 ? (
              <div
                style={{
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "32px",
                  fontSize: "13px",
                }}
              >
                Belum ada anggaran bulan ini. Klik <b>+ Set Anggaran</b>.
              </div>
            ) : (
              angBulanIni.map((a) => {
                const aktual = getAktual(a.akunKode, periodeAktif);
                const pct = a.nominal
                  ? Math.min((aktual / a.nominal) * 100, 100)
                  : 0;
                const over = aktual > a.nominal;
                const nama =
                  akuns.find((x) => x.kode === a.akunKode)?.nama || a.akunKode;
                return (
                  <div key={a.id} style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        {nama}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: over ? "var(--red)" : "var(--muted)",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {rp(aktual)} / {rp(a.nominal)}
                      </span>
                    </div>
                    <div
                      style={{
                        background: "var(--surface2)",
                        borderRadius: "999px",
                        height: "8px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: over
                            ? "var(--red)"
                            : pct > 80
                              ? "var(--accent3)"
                              : "var(--accent)",
                          borderRadius: "999px",
                          transition:
                            "width 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: over ? "var(--red)" : "var(--muted)",
                        marginTop: "2px",
                      }}
                    >
                      {pct.toFixed(1)}% terpakai
                      {over ? " · MELEBIHI ANGGARAN" : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <TrendingUp size={15} /> Chart Anggaran vs Aktual
            </div>
          </div>
          <div
            style={{ padding: "12px", overflowX: "auto" }}
            className="chart-scroll-wrap"
          >
            <AnggaranBarChartSvg items={chartItems} />
          </div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div
            className="table-title"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <ClipboardList size={15} /> Detail Anggaran Semua Akun
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Akun</th>
                <th>Periode</th>
                <th>Tipe</th>
                <th>Anggaran</th>
                <th>Aktual</th>
                <th>Variance</th>
                <th>% Terpakai</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="ang-tbody">
              {anggaranList.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "32px",
                    }}
                  >
                    Belum ada data anggaran
                  </td>
                </tr>
              ) : (
                anggaranList.map((a) => {
                  const aktual = getAktual(a.akunKode, a.periode || periodeAktif);
                  const variance = a.nominal - aktual;
                  const pct = a.nominal ? (aktual / a.nominal) * 100 : 0;
                  const over = aktual > a.nominal;
                  const akunObj = akuns.find((x) => x.kode === a.akunKode);
                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>
                        {akunObj?.nama || a.akunKode}
                      </td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {a.periode}
                      </td>
                      <td style={{ fontSize: "12px" }}>{akunObj?.tipe || "-"}</td>
                      <td style={{ fontFamily: "var(--mono)" }}>
                        {rp(a.nominal)}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{rp(aktual)}</td>
                      <td
                        style={{
                          fontFamily: "var(--mono)",
                          color: variance >= 0 ? "var(--accent)" : "var(--red)",
                        }}
                      >
                        {rp(Math.abs(variance))}{" "}
                        {variance >= 0 ? "↑ Sisa" : "↓ Lebih"}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--mono)",
                          color: over
                            ? "var(--red)"
                            : pct > 80
                              ? "var(--accent3)"
                              : "var(--accent)",
                        }}
                      >
                        {pct.toFixed(1)}%
                      </td>
                      <td>
                        <span
                          style={{
                            background: over
                              ? "rgba(248,113,113,0.12)"
                              : "rgba(74,222,128,0.1)",
                            color: over ? "var(--red)" : "var(--accent)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {over ? (
                            <>
                              <AlertTriangle size={12} /> Melebihi
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} /> On Track
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleHapus(a.id)}
                          title="Hapus anggaran"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OasModalDialog
        id="modal-anggaran"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="480px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Target size={15} /> Set Anggaran
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimpan}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Save size={14} /> Simpan Anggaran
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Akun</label>
            <button
              type="button"
              className={`form-picker-btn${selectedAkunObj ? " has-value" : ""}`}
              onClick={() => setPickerOpen(true)}
            >
              {selectedAkunObj ? (
                <>
                  <span className="picker-kode-badge">
                    {selectedAkunObj.kode}
                  </span>{" "}
                  {selectedAkunObj.nama}
                </>
              ) : (
                "Pilih Akun..."
              )}
            </button>
          </div>
          <div className="form-group">
            <label htmlFor="ang-periode">Periode (YYYY-MM)</label>
            <input
              type="month"
              id="ang-periode"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="ang-nominal">Nominal Anggaran (Rp)</label>
          <input
            type="number"
            id="ang-nominal"
            placeholder="10000000"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="ang-catatan">Catatan</label>
          <input
            type="text"
            id="ang-catatan"
            placeholder="Anggaran gaji tim engineering"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
        </div>
      </OasModalDialog>

      <AkunPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        akuns={akuns}
        selectedKode={akunKode}
        title="Pilih Akun Anggaran"
        onSelect={(a) => setAkunKode(a.kode)}
      />
    </div>
  );
}
