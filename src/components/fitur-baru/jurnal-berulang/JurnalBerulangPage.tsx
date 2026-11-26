"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  History,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import AkunPickerModal from "@/components/ui/AkunPickerModal";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { JENIS_JURNAL } from "@/lib/shared/accounting";
import { fmtRp as rp } from "@/lib/shared/format";
import {
  cekNotifikasi,
  hitungTanggalBerikutnya,
  saveFiturBaru,
} from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalBerulangHistory,
  readJurnalBerulangList,
  setOasWindowFn,
  writeJurnalBerulangHistory,
  writeJurnalBerulangList,
  type JurnalBerulangHistoryRecord,
  type JurnalBerulangRecord,
} from "@/lib/shared/legacy-store";
import type { Akun } from "@/types";

const FREKUENSI_OPTIONS = [
  { value: "harian", label: "Harian" },
  { value: "mingguan", label: "Mingguan" },
  { value: "bulanan", label: "Bulanan" },
  { value: "triwulan", label: "Triwulanan" },
  { value: "tahunan", label: "Tahunan" },
] as const;

export default function JurnalBerulangPage() {
  const [list, setList] = useState<JurnalBerulangRecord[]>([]);
  const [history, setHistory] = useState<JurnalBerulangHistoryRecord[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);

  // Modal Tambah/Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nama, setNama] = useState("");
  const [frekuensi, setFrekuensi] = useState("bulanan");
  const [tglMulai, setTglMulai] = useState("");
  const [tglAkhir, setTglAkhir] = useState("");
  const [akunDebit, setAkunDebit] = useState("");
  const [akunKredit, setAkunKredit] = useState("");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Akun Picker
  const [pickerTarget, setPickerTarget] = useState<"debit" | "kredit" | null>(
    null
  );

  const syncFromStore = useCallback(() => {
    setList([...readJurnalBerulangList()]);
    setHistory([...readJurnalBerulangHistory()]);
    setAkuns([...readAkuns()]);
  }, []);

  const openModalForm = useCallback((id?: string) => {
    if (callOasGlobal("guardHanyaBaca", "mengubah jurnal berulang") === true) {
      return;
    }
    setAkuns([...readAkuns()]);
    const today = new Date().toISOString().split("T")[0];
    if (id) {
      const item = readJurnalBerulangList().find((j) => j.id === id);
      if (item) {
        setEditId(item.id);
        setNama(item.nama || "");
        setFrekuensi(item.frekuensi || "bulanan");
        setTglMulai(item.tglMulai || today);
        setTglAkhir(item.tglAkhir || "");
        setAkunDebit(item.akunDebit || "");
        setAkunKredit(item.akunKredit || "");
        setNominal(String(item.nominal || ""));
        setKeterangan(item.keterangan || "");
      }
    } else {
      setEditId(null);
      setNama("");
      setFrekuensi("bulanan");
      setTglMulai(today);
      setTglAkhir("");
      setAkunDebit("");
      setAkunKredit("");
      setNominal("");
      setKeterangan("");
    }
    setModalOpen(true);
  }, []);

  const handleSimpan = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "menyimpan jurnal berulang") === true) {
      return;
    }
    const cleanNama = nama.trim();
    const numNominal = parseFloat(nominal) || 0;
    if (!cleanNama || !numNominal || !akunDebit || !akunKredit || !tglMulai) {
      callOasGlobal("showAlert", "Lengkapi semua field wajib");
      return;
    }
    const current = [...readJurnalBerulangList()];
    const item: JurnalBerulangRecord = {
      id: editId || `jb_${Date.now()}`,
      nama: cleanNama,
      frekuensi,
      akunDebit,
      akunKredit,
      nominal: numNominal,
      keterangan: keterangan.trim() || cleanNama,
      tglMulai,
      tglAkhir: tglAkhir || null,
      aktif: true,
      berikutnya: hitungTanggalBerikutnya(tglMulai, frekuensi),
      createdAt: new Date().toISOString(),
    };
    if (editId) {
      const idx = current.findIndex((j) => j.id === editId);
      if (idx >= 0) current[idx] = item;
    } else {
      current.unshift(item);
    }
    writeJurnalBerulangList(current);
    saveFiturBaru();
    callOasGlobal(
      "auditLog",
      editId ? "edit" : "create",
      "jurnal",
      `${editId ? "Edit" : "Buat"} Jurnal Berulang: ${cleanNama} (${frekuensi})`,
      { ref: cleanNama }
    );
    setModalOpen(false);
    syncFromStore();
    callOasGlobal("showAlert", "Jurnal berulang berhasil disimpan!");
  }, [
    akunDebit,
    akunKredit,
    editId,
    frekuensi,
    keterangan,
    nama,
    nominal,
    syncFromStore,
    tglAkhir,
    tglMulai,
  ]);

  const handleJalankan = useCallback(
    (id: string) => {
      if (callOasGlobal("guardHanyaBaca", "menjalankan jurnal berulang") === true) {
        return;
      }
      const current = [...readJurnalBerulangList()];
      const j = current.find((x) => x.id === id);
      if (!j) return;
      const tgl = new Date().toISOString().split("T")[0];
      const entry = {
        id: `JRN_${Date.now()}`,
        tanggal: tgl,
        jenis: JENIS_JURNAL.JURNAL_BERULANG,
        keterangan: `[Auto] ${j.nama}`,
        lines: [
          { akun: j.akunDebit, debit: j.nominal, kredit: 0 },
          { akun: j.akunKredit, debit: 0, kredit: j.nominal },
        ],
      };
      const posted = callOasGlobal("postJurnalLegacy", entry);
      if (!posted) return;

      const nextHist: JurnalBerulangHistoryRecord[] = [
        { tgl, nama: j.nama, nominal: j.nominal, jurnalId: entry.id },
        ...readJurnalBerulangHistory(),
      ];
      j.berikutnya = hitungTanggalBerikutnya(j.berikutnya, j.frekuensi);
      writeJurnalBerulangList(current);
      writeJurnalBerulangHistory(nextHist);
      saveFiturBaru();
      callOasGlobal("saveToStorage", false);
      syncFromStore();
      callOasGlobal("showAlert", `Jurnal "${j.nama}" berhasil dibuat!`);
      cekNotifikasi();
    },
    [syncFromStore]
  );

  const handleJalankanSemua = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "menjalankan jurnal berulang") === true) {
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const current = [...readJurnalBerulangList()];
    const tertunda = current.filter((j) => j.aktif && j.berikutnya <= today);
    if (!tertunda.length) {
      callOasGlobal("showAlert", "Tidak ada jurnal yang tertunda");
      return;
    }
    const nextHist = [...readJurnalBerulangHistory()];
    let executed = 0;
    tertunda.forEach((j, idx) => {
      const entry = {
        id: `JRN_${Date.now()}_${idx}`,
        tanggal: today,
        jenis: JENIS_JURNAL.JURNAL_BERULANG,
        keterangan: `[Auto] ${j.nama}`,
        lines: [
          { akun: j.akunDebit, debit: j.nominal, kredit: 0 },
          { akun: j.akunKredit, debit: 0, kredit: j.nominal },
        ],
      };
      if (callOasGlobal("postJurnalLegacy", entry)) {
        nextHist.unshift({
          tgl: today,
          nama: j.nama,
          nominal: j.nominal,
          jurnalId: entry.id,
        });
        j.berikutnya = hitungTanggalBerikutnya(j.berikutnya, j.frekuensi);
        executed++;
      }
    });
    writeJurnalBerulangList(current);
    writeJurnalBerulangHistory(nextHist);
    saveFiturBaru();
    callOasGlobal("saveToStorage", false);
    syncFromStore();
    callOasGlobal("showAlert", `${executed} jurnal berhasil dieksekusi!`);
    cekNotifikasi();
  }, [syncFromStore]);

  const handleToggleAktif = useCallback(
    (id: string) => {
      if (callOasGlobal("guardHanyaBaca", "mengubah status jurnal berulang") === true) {
        return;
      }
      const current = readJurnalBerulangList().map((j) =>
        j.id === id ? { ...j, aktif: !j.aktif } : j
      );
      writeJurnalBerulangList(current);
      saveFiturBaru();
      syncFromStore();
    },
    [syncFromStore]
  );

  const handleHapus = useCallback(
    (id: string) => {
      if (callOasGlobal("guardHanyaBaca", "menghapus jurnal berulang") === true) {
        return;
      }
      const target = readJurnalBerulangList().find((j) => j.id === id);
      if (!window.confirm("Hapus jurnal berulang ini?")) return;
      writeJurnalBerulangList(
        readJurnalBerulangList().filter((j) => j.id !== id)
      );
      saveFiturBaru();
      callOasGlobal(
        "auditLog",
        "delete",
        "jurnal",
        `Hapus Jurnal Berulang: ${target?.nama || id}`,
        { ref: id }
      );
      syncFromStore();
      callOasGlobal("showAlert", "Jurnal berulang dihapus");
    },
    [syncFromStore]
  );

  useEffect(() => {
    syncFromStore();
    setOasWindowFn(
      "renderJurnalBerulang",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openModalJurnalBerulang",
      openModalForm as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "jalankanJurnalBerulang",
      handleJalankan as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "jalankanSemuaJurnalBerulang",
      handleJalankanSemua as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "hapusJurnalBerulang",
      handleHapus as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "toggleAktifJB",
      handleToggleAktif as (...args: never[]) => unknown
    );
  }, [
    handleHapus,
    handleJalankan,
    handleJalankanSemua,
    handleToggleAktif,
    openModalForm,
    syncFromStore,
  ]);

  const today = new Date().toISOString().split("T")[0];
  const findAkun = (kode: string) => akuns.find((a) => a.kode === kode);
  const debitAkunObj = findAkun(akunDebit);
  const kreditAkunObj = findAkun(akunKredit);

  return (
    <div className="page" id="page-jurnal-berulang" data-react-managed="1">
      <div className="section-header page-actions-only">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openModalForm()}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={15} /> Tambah Berulang
        </button>
      </div>

      <div id="jb-list-container">
        <div className="table-card" style={{ marginBottom: "16px" }}>
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <ClipboardList size={15} /> Daftar Jurnal Berulang
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleJalankanSemua}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <Play size={13} /> Jalankan Semua Tertunda
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table id="jb-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Frekuensi</th>
                  <th>Berikutnya</th>
                  <th>Akun Debit</th>
                  <th>Akun Kredit</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="jb-tbody">
                {list.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        color: "var(--muted)",
                        padding: "32px",
                      }}
                    >
                      Belum ada jurnal berulang. Klik <b>+ Tambah Berulang</b>.
                    </td>
                  </tr>
                ) : (
                  list.map((j) => {
                    const aD = findAkun(j.akunDebit);
                    const aK = findAkun(j.akunKredit);
                    const terlambat = j.berikutnya < today;
                    return (
                      <tr key={j.id}>
                        <td style={{ fontWeight: 600 }}>{j.nama}</td>
                        <td style={{ textTransform: "capitalize" }}>
                          {j.frekuensi}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "12px",
                            color: terlambat ? "var(--red)" : undefined,
                          }}
                        >
                          {j.berikutnya}
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          {aD ? aD.nama : j.akunDebit}
                        </td>
                        <td style={{ fontSize: "12px" }}>
                          {aK ? aK.nama : j.akunKredit}
                        </td>
                        <td className="debit" style={{ fontFamily: "var(--mono)" }}>
                          {rp(j.nominal)}
                        </td>
                        <td>
                          {!j.aktif ? (
                            <span
                              style={{
                                background: "rgba(100,116,139,0.15)",
                                color: "var(--muted)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                              }}
                            >
                              Nonaktif
                            </span>
                          ) : terlambat ? (
                            <span
                              style={{
                                background: "rgba(248,113,113,0.15)",
                                color: "var(--red)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <AlertTriangle size={12} /> Tertunda
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "rgba(74,222,128,0.12)",
                                color: "var(--accent)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CheckCircle2 size={12} /> Aktif
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Jalankan sekarang"
                              onClick={() => handleJalankan(j.id)}
                            >
                              <Play size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title="Edit"
                              onClick={() => openModalForm(j.id)}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              title={j.aktif ? "Nonaktifkan" : "Aktifkan"}
                              onClick={() => handleToggleAktif(j.id)}
                            >
                              {j.aktif ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Hapus"
                              onClick={() => handleHapus(j.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <History size={15} /> Riwayat Eksekusi
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Template</th>
                  <th>Nominal</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="jb-history-tbody">
                {history.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        color: "var(--muted)",
                        padding: "20px",
                      }}
                    >
                      Belum ada riwayat eksekusi
                    </td>
                  </tr>
                ) : (
                  history.slice(0, 30).map((h, idx) => (
                    <tr key={`${h.jurnalId || h.tgl}-${idx}`}>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                        {h.tgl}
                      </td>
                      <td>{h.nama}</td>
                      <td className="debit" style={{ fontFamily: "var(--mono)" }}>
                        {rp(h.nominal)}
                      </td>
                      <td>
                        <span
                          style={{
                            background: "rgba(74,222,128,0.12)",
                            color: "var(--accent)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={12} /> Berhasil
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OasModalDialog
        id="modal-jb"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="520px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RefreshCw size={15} />{" "}
            {editId ? "Edit Jurnal Berulang" : "Tambah Jurnal Berulang"}
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
              <Save size={14} /> Simpan
            </button>
          </>
        }
      >
        <div className="form-group">
          <label htmlFor="jb-nama">Nama Template</label>
          <input
            type="text"
            id="jb-nama"
            placeholder="Gaji Karyawan Bulanan"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="jb-frekuensi">Frekuensi</label>
            <select
              id="jb-frekuensi"
              style={{ width: "100%" }}
              value={frekuensi}
              onChange={(e) => setFrekuensi(e.target.value)}
            >
              {FREKUENSI_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="jb-tgl-mulai">Tanggal Mulai</label>
            <input
              type="date"
              id="jb-tgl-mulai"
              value={tglMulai}
              onChange={(e) => setTglMulai(e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Akun Debit</label>
            <button
              type="button"
              className={`form-picker-btn${debitAkunObj ? " has-value" : ""}`}
              onClick={() => setPickerTarget("debit")}
            >
              {debitAkunObj ? (
                <>
                  <span className="picker-kode-badge">{debitAkunObj.kode}</span>{" "}
                  {debitAkunObj.nama}
                </>
              ) : (
                "Pilih Akun..."
              )}
            </button>
          </div>
          <div className="form-group">
            <label>Akun Kredit</label>
            <button
              type="button"
              className={`form-picker-btn${kreditAkunObj ? " has-value" : ""}`}
              onClick={() => setPickerTarget("kredit")}
            >
              {kreditAkunObj ? (
                <>
                  <span className="picker-kode-badge">{kreditAkunObj.kode}</span>{" "}
                  {kreditAkunObj.nama}
                </>
              ) : (
                "Pilih Akun..."
              )}
            </button>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="jb-nominal">Nominal (Rp)</label>
            <input
              type="number"
              id="jb-nominal"
              placeholder="5000000"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="jb-keterangan">Keterangan</label>
            <input
              type="text"
              id="jb-keterangan"
              placeholder="Otomatis oleh sistem"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="jb-tgl-akhir">Tanggal Berakhir (opsional)</label>
          <input
            type="date"
            id="jb-tgl-akhir"
            value={tglAkhir}
            onChange={(e) => setTglAkhir(e.target.value)}
          />
        </div>
      </OasModalDialog>

      <AkunPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        akuns={akuns}
        selectedKode={pickerTarget === "debit" ? akunDebit : akunKredit}
        title={pickerTarget === "debit" ? "Pilih Akun Debit" : "Pilih Akun Kredit"}
        onSelect={(a) => {
          if (pickerTarget === "debit") setAkunDebit(a.kode);
          else if (pickerTarget === "kredit") setAkunKredit(a.kode);
        }}
      />
    </div>
  );
}
