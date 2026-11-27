"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  File as FileIcon,
  FolderOpen,
  Image as ImageIcon,
  Paperclip,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  getReversalOf,
  getReversedMap,
  isJurnalPembalik,
  ketTanpaPrefixPembalik,
} from "@/lib/shared/accounting";
import { fmtDate, fmtRp as rp } from "@/lib/shared/format";
import { tipeBadgeClass } from "@/lib/master/chart-of-accounts";
import { nextKode } from "@/lib/kalkulator/shared";
import {
  buatJurnalPembalikRuntime,
  cekNotifikasi,
  deteksiPenyesuaianItems,
  downloadAllAttachmentsZip,
  downloadAttachmentFile,
  getAttachmentsMap,
  saveAttachmentsMap,
  type AttachmentItem,
  type AutoPenyesuaianItem,
} from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readCurrentCompany,
  readJurnalEntries,
  readPeriodeKunciSampai,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";

export default function OperationalModals() {
  // ── 1. Modal Balik Jurnal ──
  const [balikOpen, setBalikOpen] = useState(false);
  const [balikTarget, setBalikTarget] = useState<JurnalEntry | null>(null);
  const [balikTargetIdx, setBalikTargetIdx] = useState(-1);
  const [balikTgl, setBalikTgl] = useState("");
  const [balikAlasan, setBalikAlasan] = useState("");
  const [balikKunciInfo, setBalikKunciInfo] = useState("");

  // ── 2. Modal Setting Saldo Awal ──
  const [saldoOpen, setSaldoOpen] = useState(false);
  const [saldoTgl, setSaldoTgl] = useState("");
  const [saldoKet, setSaldoKet] = useState("Saldo awal pembukaan");
  const [saldoAkuns, setSaldoAkuns] = useState<Akun[]>([]);
  const [saldoValues, setSaldoValues] = useState<Record<string, string>>({});

  // ── 3. Modal Lampiran Jurnal ──
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachJurnalIdx, setAttachJurnalIdx] = useState(-1);
  const [attachJurnalNo, setAttachJurnalNo] = useState("");
  const [attachJurnalKet, setAttachJurnalKet] = useState("");
  const [attachItems, setAttachItems] = useState<AttachmentItem[]>([]);
  const [lightboxItem, setLightboxItem] = useState<AttachmentItem | null>(null);
  const attachFileRef = useRef<HTMLInputElement | null>(null);

  // ── 4. Modal Deteksi Penyesuaian Otomatis ──
  const [autoPenyOpen, setAutoPenyOpen] = useState(false);
  const [autoPenyItems, setAutoPenyItems] = useState<AutoPenyesuaianItem[]>([]);
  const [autoPenyAkuns, setAutoPenyAkuns] = useState<Akun[]>([]);
  const [previewOpenMap, setPreviewOpenMap] = useState<Record<string, boolean>>(
    {}
  );

  // ═══ Handlers: Balik Jurnal ═══
  const openBalikJurnal = useCallback((idx: number) => {
    const entries = readJurnalEntries();
    const j = entries[idx];
    if (!j) return;
    if (isJurnalPembalik(j)) {
      callOasGlobal(
        "showAlert",
        `Jurnal ini adalah jurnal pembalik dari ${getReversalOf(j)} dan tidak bisa dibalik lagi.`
      );
      return;
    }
    const sudah = j.no ? getReversedMap(entries).get(j.no) : undefined;
    if (sudah) {
      callOasGlobal(
        "showAlert",
        `Jurnal ${j.no} sudah dibalik oleh ${sudah}.`
      );
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const kunci = readPeriodeKunciSampai();
    const terkunci =
      Boolean(kunci) && Boolean(j.tanggal) && j.tanggal.slice(0, 10) <= kunci;
    setBalikTarget(j);
    setBalikTargetIdx(idx);
    setBalikTgl(today);
    setBalikAlasan("");
    setBalikKunciInfo(
      terkunci
        ? `Periode jurnal ini sudah dikunci (sampai ${fmtDate(kunci)}). Jurnal pembalik harus bertanggal setelah tanggal kunci.`
        : ""
    );
    setBalikOpen(true);
  }, []);

  const handleConfirmBalik = useCallback(() => {
    if (!balikTarget) return;
    const tgl = balikTgl.trim();
    const alasan = balikAlasan.trim();
    if (!tgl) {
      callOasGlobal("showAlert", "Pilih tanggal jurnal pembalik.");
      return;
    }
    if (alasan.length < 3) {
      callOasGlobal(
        "showAlert",
        "Isi alasan pembalikan (minimal 3 karakter) untuk jejak audit."
      );
      return;
    }
    const entries = readJurnalEntries();
    const asal =
      entries.find((x) => x === balikTarget || (x.no && x.no === balikTarget.no)) ||
      entries[balikTargetIdx];
    const hasil = buatJurnalPembalikRuntime(asal, { tanggal: tgl, alasan });
    if (!hasil) return;
    const totalDebit = (asal?.lines || []).reduce(
      (s, l) => s + (l.debit || 0),
      0
    );
    callOasGlobal(
      "auditLog",
      "delete",
      "jurnal",
      `Balik jurnal ${asal?.jenis || "Manual"}: "${asal?.ket || asal?.keterangan || "-"}" — ${rp(totalDebit)}`,
      { ref: asal?.no || String(balikTargetIdx), jenis: asal?.jenis || "Manual" }
    );
    setBalikOpen(false);
    callOasGlobal("renderJurnalUmum");
    callOasGlobal("renderDashboard");
    callOasGlobal(
      "showAlert",
      `Jurnal pembalik ${String(hasil.no || "")} dibuat untuk ${asal?.no || ""}. Jurnal asli tetap tercatat.`
    );
  }, [balikAlasan, balikTarget, balikTargetIdx, balikTgl]);

  // ═══ Handlers: Saldo Awal ═══
  const openSaldoAwal = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "mengatur saldo awal") === true) return;
    if (readJurnalEntries().length > 0) {
      callOasGlobal(
        "showAlert",
        "Saldo awal hanya bisa diatur sebelum ada transaksi. Hapus semua jurnal dulu kalau perlu mengubah saldo awal."
      );
      return;
    }
    setSaldoTgl(new Date().toISOString().split("T")[0]);
    setSaldoKet("Saldo awal pembukaan");
    setSaldoAkuns(readAkuns().filter((a) => a.kode !== "1502"));
    setSaldoValues({});
    setSaldoOpen(true);
  }, []);

  const saldoTotals = useMemo(() => {
    let totalD = 0;
    let totalK = 0;
    saldoAkuns.forEach((a) => {
      const val = parseFloat(saldoValues[a.kode] || "") || 0;
      if (!val) return;
      if (a.normal === "D") totalD += val;
      else totalK += val;
    });
    return { totalD, totalK, diff: totalD - totalK };
  }, [saldoAkuns, saldoValues]);

  const handleSimpanSaldoAwal = useCallback(() => {
    if (!saldoTgl) {
      callOasGlobal("showAlert", "Isi tanggal saldo awal dulu!");
      return;
    }
    const lines = saldoAkuns
      .map((a) => {
        const val = parseFloat(saldoValues[a.kode] || "") || 0;
        if (!val) return null;
        return {
          akun: a.kode,
          ket: a.nama,
          debit: a.normal === "D" ? val : 0,
          kredit: a.normal === "K" ? val : 0,
        };
      })
      .filter(Boolean) as Array<{
      akun: string;
      ket: string;
      debit: number;
      kredit: number;
    }>;

    if (!lines.length) {
      callOasGlobal("showAlert", "Isi minimal satu akun!");
      return;
    }
    const td = lines.reduce((s, l) => s + l.debit, 0);
    const tk = lines.reduce((s, l) => s + l.kredit, 0);
    if (Math.abs(td - tk) > 1) {
      callOasGlobal(
        "showAlert",
        "Jurnal tidak balance! Seimbangkan debit dan kredit."
      );
      return;
    }
    if (callOasGlobal("guardPeriode", saldoTgl, "diposting") === false) return;
    callOasGlobal("addJurnal", {
      tanggal: saldoTgl,
      ket: saldoKet.trim() || "Saldo awal pembukaan",
      jenis: "Saldo Awal",
      lines,
    });
    callOasGlobal("auditLog", "edit", "akun", "Simpan / update Saldo Awal", {
      ref: "SALDO-AWAL",
    });
    setSaldoOpen(false);
    callOasGlobal("renderDashboard");
    callOasGlobal("renderJurnalUmum");
    callOasGlobal("showAlert", "Saldo awal berhasil disimpan!");
  }, [saldoAkuns, saldoKet, saldoTgl, saldoValues]);

  // ═══ Handlers: Lampiran Jurnal ═══
  const refreshAttachList = useCallback((jurnalNo: string) => {
    const all = getAttachmentsMap();
    setAttachItems([...(all[jurnalNo] || [])]);
  }, []);

  const openAttach = useCallback(
    (jurnalIdx: number) => {
      const j = readJurnalEntries()[jurnalIdx];
      if (!j || !j.no) return;
      setAttachJurnalIdx(jurnalIdx);
      setAttachJurnalNo(j.no);
      setAttachJurnalKet(j.ket || j.keterangan || "");
      refreshAttachList(j.no);
      setAttachOpen(true);
    },
    [refreshAttachList]
  );

  const handleUploadAttach = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const entries = readJurnalEntries();
      const j = entries[attachJurnalIdx];
      if (!j || !j.no) return;
      if (file.size > 5 * 1024 * 1024) {
        callOasGlobal("showAlert", "File terlalu besar (max 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const nextItem: AttachmentItem = {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          date: new Date().toLocaleDateString("id-ID"),
          data: String(ev.target?.result || ""),
        };
        const all = getAttachmentsMap();
        const existing = [...(all[j.no!] || []), nextItem];
        all[j.no!] = existing;
        saveAttachmentsMap(all);
        (j as unknown as { attachments?: AttachmentItem[] }).attachments =
          existing;
        if (readCurrentCompany() && (j as unknown as { _id?: string })._id) {
          await callOasGlobal("saveAttachmentToSupabase", j, existing);
        }
        setAttachItems(existing);
        callOasGlobal("renderJurnalUmum");
        callOasGlobal("showAlert", "Lampiran berhasil ditambahkan!");
      };
      reader.readAsDataURL(file);
    },
    [attachJurnalIdx]
  );

  const handleDeleteAttach = useCallback(
    (idx: number) => {
      if (!attachJurnalNo) return;
      if (!window.confirm("Hapus lampiran ini secara permanen?")) return;
      const all = getAttachmentsMap();
      const list = [...(all[attachJurnalNo] || [])];
      list.splice(idx, 1);
      if (list.length) all[attachJurnalNo] = list;
      else delete all[attachJurnalNo];
      saveAttachmentsMap(all);
      const j = readJurnalEntries().find((x) => x.no === attachJurnalNo);
      if (j) {
        (j as unknown as { attachments?: AttachmentItem[] }).attachments = list;
      }
      setAttachItems(list);
      callOasGlobal("renderJurnalUmum");
      callOasGlobal("showAlert", "Lampiran dihapus");
    },
    [attachJurnalNo]
  );

  // ═══ Handlers: Auto Penyesuaian ═══
  const openAutoPenyesuaian = useCallback(() => {
    const entries = readJurnalEntries();
    if (!entries.length) {
      callOasGlobal(
        "showAlert",
        "Belum ada jurnal yang tercatat. Input transaksi dulu!"
      );
      return;
    }
    const items = deteksiPenyesuaianItems(entries);
    setAutoPenyItems(items);
    setAutoPenyAkuns([...readAkuns()]);
    setPreviewOpenMap({});
    setAutoPenyOpen(true);
    callOasGlobal(
      "auditLog",
      "auto",
      "jurnal",
      "Deteksi otomatis Jurnal Penyesuaian",
      { ref: "AUTO-PENYESUAIAN", jenis: "Penyesuaian" }
    );
  }, []);

  const postAutoPenyesuaianBatch = useCallback(
    (items: AutoPenyesuaianItem[]) => {
      const today = new Date().toISOString().split("T")[0];
      items.forEach((r) => {
        const kode = nextKode("ADJ");
        const nominal = r.nilaiSuggested || 0;
        const lines = r.lines.map((l) => ({
          akun: l.akun,
          ket: l.ket,
          debit: l.debit > 0 ? nominal : 0,
          kredit: l.kredit > 0 ? nominal : 0,
        }));
        callOasGlobal("postJurnalLegacy", {
          no: kode,
          tanggal: today,
          ket: `J. Penyesuaian · ${r.judul.slice(0, 60)}`,
          jenis: "Penyesuaian",
          lines,
        });
      });
      callOasGlobal("saveToStorage", false);
      cekNotifikasi();
      callOasGlobal("renderJurnalUmum");
      callOasGlobal("renderDashboard");
    },
    []
  );

  const handleInputSatuAuto = useCallback(
    (idx: number) => {
      const r = autoPenyItems[idx];
      if (!r) return;
      if (r.done) {
        callOasGlobal("showAlert", "Item ini sudah diinput sebelumnya");
        return;
      }
      if (!r.nilaiSuggested || r.nilaiSuggested <= 0) {
        callOasGlobal("showAlert", "Isi nilai yang valid (lebih dari 0)");
        return;
      }
      postAutoPenyesuaianBatch([r]);
      setAutoPenyItems((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, done: true } : item))
      );
      callOasGlobal("showAlert", "Jurnal penyesuaian berhasil dibuat!");
    },
    [autoPenyItems, postAutoPenyesuaianBatch]
  );

  const handleInputSemuaAuto = useCallback(() => {
    const terpilih = autoPenyItems.filter(
      (r) => r.checked && !r.done && (r.nilaiSuggested || 0) > 0
    );
    if (!terpilih.length) {
      callOasGlobal(
        "showAlert",
        "Pilih minimal 1 penyesuaian dan pastikan nilainya terisi (lebih dari 0)"
      );
      return;
    }
    postAutoPenyesuaianBatch(terpilih);
    setAutoPenyItems((prev) =>
      prev.map((r) =>
        r.checked && !r.done && (r.nilaiSuggested || 0) > 0
          ? { ...r, done: true }
          : r
      )
    );
    setAutoPenyOpen(false);
    callOasGlobal(
      "showAlert",
      `${terpilih.length} jurnal penyesuaian berhasil dibuat dan disimpan ke Jurnal Umum!`
    );
  }, [autoPenyItems, postAutoPenyesuaianBatch]);

  useEffect(() => {
    setOasWindowFn(
      "konfirmasiBalikJurnal",
      openBalikJurnal as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "konfirmasiHapusJurnal",
      openBalikJurnal as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openModalSaldoAwal",
      openSaldoAwal as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openAttachModal",
      openAttach as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderAttachList",
      refreshAttachList as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "deteksiPenyesuaianOtomatis",
      openAutoPenyesuaian as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openModalPenyesuaian",
      openAutoPenyesuaian as (...args: never[]) => unknown
    );
  }, [
    openAttach,
    openAutoPenyesuaian,
    openBalikJurnal,
    openSaldoAwal,
    refreshAttachList,
  ]);

  const balikTotalDebit = useMemo(
    () =>
      (balikTarget?.lines || []).reduce((s, l) => s + (l.debit || 0), 0),
    [balikTarget]
  );

  return (
    <>
      {/* ═══ 1. MODAL BALIK JURNAL ═══ */}
      <OasModalDialog
        id="modal-hapus-jurnal"
        open={balikOpen}
        onClose={() => setBalikOpen(false)}
        maxWidth="420px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <RotateCcw size={15} /> Balik Jurnal
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBalikOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              id="hapus-jurnal-confirm-btn"
              className="btn btn-danger"
              onClick={handleConfirmBalik}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <RotateCcw size={14} /> Buat Jurnal Pembalik
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
          <div
            style={{
              marginBottom: "10px",
              display: "flex",
              justifyContent: "center",
              color: "var(--accent3)",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "8px" }}>
            Buat jurnal pembalik untuk jurnal ini?
          </div>
          {balikTarget ? (
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                background: "var(--surface2)",
                borderRadius: "8px",
                padding: "12px",
                textAlign: "left",
                lineHeight: 1.7,
              }}
            >
              <div>
                <b>No:</b> {balikTarget.no}
              </div>
              <div>
                <b>Tanggal:</b> {fmtDate(balikTarget.tanggal)}
              </div>
              <div>
                <b>Keterangan:</b>{" "}
                {ketTanpaPrefixPembalik(
                  balikTarget.ket || balikTarget.keterangan || ""
                )}
              </div>
              <div>
                <b>Jenis:</b> {balikTarget.jenis}
              </div>
              <div>
                <b>Jumlah Baris:</b> {(balikTarget.lines || []).length} baris
              </div>
              <div>
                <b>Total:</b> {rp(balikTotalDebit)}
              </div>
            </div>
          ) : null}
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              marginTop: "12px",
              textAlign: "left",
              lineHeight: 1.6,
            }}
          >
            Jurnal yang sudah diposting tidak dihapus. Sistem membuat jurnal
            baru dengan debit dan kredit ditukar, sehingga saldo kembali netral
            dan jurnal asli tetap tercatat untuk audit.
          </div>
          {balikKunciInfo ? (
            <div
              style={{
                fontSize: "12px",
                color: "var(--accent3)",
                marginTop: "10px",
                textAlign: "left",
                lineHeight: 1.6,
              }}
            >
              {balikKunciInfo}
            </div>
          ) : null}
          <div style={{ textAlign: "left", marginTop: "14px" }}>
            <label
              htmlFor="balik-jurnal-tgl"
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              Tanggal jurnal pembalik
            </label>
            <input
              type="date"
              id="balik-jurnal-tgl"
              style={{ width: "100%" }}
              value={balikTgl}
              onChange={(e) => setBalikTgl(e.target.value)}
            />
            <label
              htmlFor="balik-jurnal-alasan"
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                display: "block",
                margin: "10px 0 4px",
              }}
            >
              Alasan pembalikan
            </label>
            <input
              type="text"
              id="balik-jurnal-alasan"
              placeholder="cth: salah akun, transaksi dibatalkan"
              style={{ width: "100%" }}
              value={balikAlasan}
              onChange={(e) => setBalikAlasan(e.target.value)}
            />
          </div>
        </div>
      </OasModalDialog>

      {/* ═══ 2. MODAL SETTING SALDO AWAL ═══ */}
      <OasModalDialog
        id="modal-saldo-awal"
        open={saldoOpen}
        onClose={() => setSaldoOpen(false)}
        maxWidth="540px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Settings size={15} /> Setting Saldo Awal
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSaldoOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSimpanSaldoAwal}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <CheckCircle2 size={14} /> Simpan Saldo Awal
            </button>
          </>
        }
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--accent-text)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "10px",
          }}
        >
          Pilih tanggal pembukaan:
        </div>
        <div className="form-row" style={{ marginBottom: "16px" }}>
          <div className="form-group">
            <label htmlFor="saldo-awal-tgl">Tanggal Saldo Awal</label>
            <input
              type="date"
              id="saldo-awal-tgl"
              value={saldoTgl}
              onChange={(e) => setSaldoTgl(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="saldo-awal-ket">Keterangan</label>
            <input
              type="text"
              id="saldo-awal-ket"
              value={saldoKet}
              onChange={(e) => setSaldoKet(e.target.value)}
            />
          </div>
        </div>
        <div
          style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--accent-text)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "10px",
          }}
        >
          Isi saldo awal per akun (kosongkan jika 0):
        </div>
        <div className="table-scroll" style={{ maxHeight: "42vh", overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Akun</th>
                <th>Tipe</th>
                <th style={{ textAlign: "right" }}>Saldo Awal (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {saldoAkuns.map((a) => (
                <tr key={a.kode}>
                  <td>
                    <div style={{ fontSize: "12px", fontWeight: 600 }}>
                      {a.nama}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--muted)",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {a.kode}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${tipeBadgeClass(a.tipe)}`}>
                      {a.tipe}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={saldoValues[a.kode] || ""}
                      onChange={(e) =>
                        setSaldoValues((prev) => ({
                          ...prev,
                          [a.kode]: e.target.value,
                        }))
                      }
                      style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "5px",
                        padding: "5px 8px",
                        color: "var(--text)",
                        fontSize: "12px",
                        width: "140px",
                        textAlign: "right",
                        fontFamily: "var(--mono)",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            marginTop: "12px",
            padding: "10px",
            background: "var(--surface2)",
            borderRadius: "8px",
            fontSize: "12.5px",
            fontFamily: "var(--mono)",
          }}
        >
          Debit:{" "}
          <span style={{ color: "var(--accent)" }}>
            {rp(saldoTotals.totalD)}
          </span>{" "}
          | Kredit:{" "}
          <span style={{ color: "var(--red)" }}>{rp(saldoTotals.totalK)}</span>{" "}
          |{" "}
          {Math.abs(saldoTotals.diff) < 1 ? (
            <span style={{ color: "var(--accent)" }}>Balance</span>
          ) : (
            <span style={{ color: "var(--accent3)" }}>
              Selisih: {rp(Math.abs(saldoTotals.diff))} · perlu akun penyeimbang
              (misal Modal)
            </span>
          )}
        </div>
      </OasModalDialog>

      {/* ═══ 3. MODAL LAMPIRAN JURNAL ═══ */}
      <OasModalDialog
        id="modal-attach"
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        maxWidth="480px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Paperclip size={15} /> Lampiran · {attachJurnalNo}
          </span>
        }
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAttachOpen(false)}
              >
                Tutup
              </button>
              {attachItems.length > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void downloadAllAttachmentsZip(attachJurnalNo)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Download size={14} /> Unduh
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => attachFileRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Plus size={14} /> Tambah File
            </button>
          </div>
        }
      >
        <div
          style={{
            fontSize: "12px",
            color: "var(--muted)",
            marginBottom: "12px",
            padding: "8px 12px",
            background: "var(--surface2)",
            borderRadius: "6px",
          }}
        >
          {attachJurnalKet || "-"}
        </div>

        <div style={{ marginBottom: "16px" }}>
          {attachItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "var(--muted)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <FolderOpen size={15} /> Belum ada lampiran
            </div>
          ) : (
            attachItems.map((a, i) => (
              <div
                key={`${a.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "var(--accent2)", flexShrink: 0 }}>
                  {a.type?.startsWith("image") ? (
                    <ImageIcon size={20} />
                  ) : (
                    <FileIcon size={20} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {a.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    {a.size} · {a.date}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="slot-btn primary"
                    title="Lihat"
                    onClick={() => setLightboxItem(a)}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="slot-btn primary"
                    title="Unduh"
                    onClick={() => downloadAttachmentFile(attachJurnalNo, i)}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    type="button"
                    className="slot-btn danger"
                    title="Hapus"
                    onClick={() => handleDeleteAttach(i)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => attachFileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              attachFileRef.current?.click();
            }
          }}
          style={{
            border: "2px dashed var(--border)",
            borderRadius: "10px",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              marginBottom: "4px",
            }}
          >
            Tambah Lampiran
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>
            Foto nota, invoice, kuitansi, PDF · Max 5MB
          </div>
          <input
            ref={attachFileRef}
            type="file"
            accept="image/*,.pdf"
            style={{ display: "none" }}
            onChange={handleUploadAttach}
          />
        </div>
      </OasModalDialog>

      {/* Lightbox lampiran */}
      {lightboxItem ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxItem(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.94)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            aria-label="Tutup pratinjau"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "14px",
              right: "60px",
              color: "rgba(255,255,255,0.7)",
              fontSize: "12px",
              fontFamily: "var(--mono)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {lightboxItem.name}
          </div>
          {lightboxItem.type?.startsWith("image") ? (
            <div
              style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "52px 16px 16px",
                boxSizing: "border-box",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxItem.data}
                alt={lightboxItem.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            </div>
          ) : (
            <iframe
              src={lightboxItem.data}
              title={lightboxItem.name}
              style={{
                width: "100vw",
                height: "calc(100vh - 48px)",
                border: "none",
                marginTop: "48px",
              }}
            />
          )}
        </div>
      ) : null}

      {/* ═══ 4. MODAL DETEKSI PENYESUAIAN OTOMATIS ═══ */}
      <OasModalDialog
        id="modal-auto-penyesuaian"
        open={autoPenyOpen}
        onClose={() => setAutoPenyOpen(false)}
        maxWidth="620px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Search size={15} /> Hasil Deteksi Jurnal Penyesuaian
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setAutoPenyOpen(false)}
            >
              Tutup
            </button>
            {autoPenyItems.length > 0 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleInputSemuaAuto}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <CheckCircle2 size={14} /> Input Semua yang Dipilih
              </button>
            ) : null}
          </>
        }
      >
        {autoPenyItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px" }}>
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <CheckCircle2 size={42} />
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              Tidak Ada Penyesuaian Terdeteksi
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              Semua akun sudah tercatat dengan baik untuk periode ini. Tidak ada
              beban dibayar dimuka, penyusutan, pendapatan dimuka, atau akrual
              yang tertinggal.
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                paddingBottom: "14px",
                lineHeight: 1.6,
              }}
            >
              Ditemukan <b style={{ color: "var(--text)" }}>{autoPenyItems.length} item</b>{" "}
              yang perlu disesuaikan. Centang item yang ingin diinput, edit
              nilainya jika perlu, lalu klik <b>Input Semua yang Dipilih</b>.
            </div>
            {autoPenyItems.map((r, i) => {
              const bg =
                r.level === "warning"
                  ? "rgba(245,158,11,0.08)"
                  : r.level === "danger"
                    ? "rgba(248,113,113,0.08)"
                    : "rgba(34,211,238,0.06)";
              const border =
                r.level === "warning"
                  ? "rgba(245,158,11,0.3)"
                  : r.level === "danger"
                    ? "rgba(248,113,113,0.25)"
                    : "rgba(34,211,238,0.2)";
              const showPrev = Boolean(previewOpenMap[r.id]);
              return (
                <div
                  key={r.id}
                  style={{
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: "12px",
                    padding: "14px 16px",
                    marginBottom: "10px",
                    opacity: r.done ? 0.5 : 1,
                    pointerEvents: r.done ? "none" : undefined,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <input
                      type="checkbox"
                      checked={r.checked}
                      onChange={(e) =>
                        setAutoPenyItems((prev) =>
                          prev.map((item, idx) =>
                            idx === i
                              ? { ...item, checked: e.target.checked }
                              : item
                          )
                        )
                      }
                      style={{
                        width: "17px",
                        height: "17px",
                        accentColor: "var(--accent)",
                        flexShrink: 0,
                        marginTop: "3px",
                        cursor: "pointer",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: "5px",
                        }}
                      >
                        {r.judul}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          lineHeight: 1.6,
                          marginBottom: "8px",
                        }}
                      >
                        {r.deskripsi}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          padding: "6px 10px",
                          background: "rgba(0,0,0,0.15)",
                          borderRadius: "6px",
                          color: "var(--muted)",
                          marginBottom: "10px",
                          fontStyle: "italic",
                        }}
                      >
                        {r.alasan}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Nilai:
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={r.nilaiSuggested}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setAutoPenyItems((prev) =>
                                prev.map((item, idx) =>
                                  idx === i
                                    ? { ...item, nilaiSuggested: val }
                                    : item
                                )
                              );
                            }}
                            style={{
                              background: "var(--surface2)",
                              border: "1px solid var(--border)",
                              borderRadius: "6px",
                              padding: "5px 9px",
                              color: "var(--text)",
                              fontSize: "12px",
                              fontFamily: "var(--mono)",
                              width: "150px",
                              outline: "none",
                            }}
                          />
                          {r.perluInput ? (
                            <span
                              style={{
                                color: "var(--accent3)",
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                            >
                              ← Edit nilai aktual
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewOpenMap((prev) => ({
                              ...prev,
                              [r.id]: !prev[r.id],
                            }))
                          }
                          style={{
                            background: "none",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            padding: "4px 9px",
                            fontSize: "11px",
                            color: "var(--muted)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Eye size={13} /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputSatuAuto(i)}
                          style={{
                            background: "rgba(74,222,128,0.1)",
                            border: "1px solid rgba(74,222,128,0.3)",
                            borderRadius: "6px",
                            padding: "4px 12px",
                            fontSize: "11px",
                            color: "var(--accent)",
                            cursor: "pointer",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Play size={11} /> Input Ini
                        </button>
                      </div>

                      {showPrev ? (
                        <div
                          style={{
                            marginTop: "10px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              fontSize: "11px",
                              borderCollapse: "collapse",
                            }}
                          >
                            <thead>
                              <tr style={{ background: "var(--surface2)" }}>
                                <th
                                  style={{
                                    padding: "5px 9px",
                                    textAlign: "left",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                >
                                  Akun
                                </th>
                                <th
                                  style={{
                                    padding: "5px 9px",
                                    textAlign: "right",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                >
                                  Debit
                                </th>
                                <th
                                  style={{
                                    padding: "5px 9px",
                                    textAlign: "right",
                                    color: "var(--muted)",
                                    fontWeight: 600,
                                    borderBottom: "1px solid var(--border)",
                                  }}
                                >
                                  Kredit
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.lines.map((l, li) => {
                                const nama =
                                  autoPenyAkuns.find((a) => a.kode === l.akun)
                                    ?.nama || l.akun;
                                const d = l.debit > 0 ? r.nilaiSuggested : 0;
                                const k = l.kredit > 0 ? r.nilaiSuggested : 0;
                                return (
                                  <tr key={`${l.akun}-${li}`}>
                                    <td style={{ padding: "5px 9px" }}>
                                      {l.akun} · {nama}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 9px",
                                        textAlign: "right",
                                        fontFamily: "var(--mono)",
                                        color: d
                                          ? "var(--accent3)"
                                          : "var(--muted)",
                                      }}
                                    >
                                      {d ? rp(d) : "-"}
                                    </td>
                                    <td
                                      style={{
                                        padding: "5px 9px",
                                        textAlign: "right",
                                        fontFamily: "var(--mono)",
                                        color: k
                                          ? "var(--accent)"
                                          : "var(--muted)",
                                      }}
                                    >
                                      {k ? rp(k) : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {r.done ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "6px",
                            fontSize: "12px",
                            color: "var(--accent)",
                            fontWeight: 700,
                            marginTop: "6px",
                          }}
                        >
                          Sudah diinput ke Jurnal Umum
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </OasModalDialog>
    </>
  );
}
