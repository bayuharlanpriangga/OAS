"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  Folder,
  FolderOpen,
  Lightbulb,
  Package,
  RefreshCw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { registerReactModal } from "@/lib/cloud/profil";
import {
  deleteSlot,
  executeResetData,
  exportBackupJSON,
  getAutoSaveEnabled,
  getSlots,
  getStorageMeta,
  getStorageSizeKB,
  importBackupFromFile,
  loadFromSlot,
  saveToSlot,
  toggleAutoSave,
  type StorageSlotEntry,
} from "@/lib/cloud/local-storage";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";

const RESET_OPTIONS = [
  { key: "jurnal", label: "Jurnal Umum" },
  { key: "invoice", label: "Invoice" },
  { key: "bill", label: "Tagihan Pembelian" },
  { key: "pembayaran", label: "Pembayaran" },
  { key: "dok", label: "Dokumen (penawaran, pesanan, dll.)" },
  { key: "kontak", label: "Kontak" },
  { key: "aset_tetap", label: "Aset Tetap" },
  { key: "produk", label: "Produk" },
  { key: "jurnal_berulang", label: "Jurnal Berulang" },
  { key: "anggaran", label: "Anggaran" },
  { key: "alert", label: "Alert Notifikasi" },
  { key: "kurs", label: "Kurs" },
] as const;

export default function StorageModals() {
  // ── Modal Kelola Data ──
  const [storageOpen, setStorageOpen] = useState(false);
  const [slots, setSlots] = useState<Record<string, StorageSlotEntry>>({});
  const [jurnalCount, setJurnalCount] = useState(0);
  const [akunCount, setAkunCount] = useState(0);
  const [sizeKB, setSizeKB] = useState("0.0");
  const [lastSaveStr, setLastSaveStr] = useState("Belum ada simpanan otomatis");
  const [autoSave, setAutoSave] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(true);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  // ── Modal Reset Data ──
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedReset, setSelectedReset] = useState<Record<string, boolean>>({
    jurnal: true,
  });
  const [resetInput, setResetInput] = useState("");
  const [resetErrorBorder, setResetErrorBorder] = useState(false);

  const refreshStorageInfo = useCallback(() => {
    setSlots(getSlots());
    setJurnalCount(readJurnalEntries().length);
    setAkunCount(readAkuns().length);
    setSizeKB(getStorageSizeKB());
    const meta = getStorageMeta();
    setLastSaveStr(
      meta.lastSave
        ? new Date(meta.lastSave).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Belum pernah disimpan"
    );
    setAutoSave(getAutoSaveEnabled());
    const adminCheck = callOasGlobal("isAdmin");
    setIsAdminUser(adminCheck === undefined ? true : Boolean(adminCheck));
  }, []);

  const openStorage = useCallback(() => {
    refreshStorageInfo();
    setStorageOpen(true);
  }, [refreshStorageInfo]);

  const openReset = useCallback(() => {
    if (callOasGlobal("isAdmin") === false) {
      callOasGlobal(
        "showAlert",
        "Hanya Admin atau Pemilik bisnis yang memiliki izin untuk mereset data."
      );
      return;
    }
    callOasGlobal(
      "auditLog",
      "reset",
      "system",
      "Membuka konfirmasi Reset Semua Data"
    );
    setSelectedReset({ jurnal: true });
    setResetInput("");
    setResetErrorBorder(false);
    setResetOpen(true);
  }, []);

  const handleImportFile = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      importBackupFromFile(file, () => {
        refreshStorageInfo();
        setStorageOpen(false);
      });
    },
    [refreshStorageInfo]
  );

  const handleDoReset = useCallback(async () => {
    const picked: Record<string, string> = {};
    RESET_OPTIONS.forEach((o) => {
      if (selectedReset[o.key]) picked[o.key] = o.label;
    });
    if (!Object.keys(picked).length) {
      callOasGlobal("showAlert", "Pilih minimal satu jenis data yang mau dihapus.");
      return;
    }
    if (resetInput.trim().toUpperCase() !== "RESET") {
      setResetErrorBorder(true);
      window.setTimeout(() => setResetErrorBorder(false), 1500);
      return;
    }
    setResetOpen(false);
    await executeResetData(picked);
  }, [resetInput, selectedReset]);

  useEffect(() => {
    const unregStorage = registerReactModal(
      "modal-storage",
      openStorage,
      () => setStorageOpen(false)
    );
    const unregReset = registerReactModal(
      "modal-reset-all",
      openReset,
      () => setResetOpen(false)
    );
    setOasWindowFn(
      "openStorageModal",
      openStorage as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderStorageSlots",
      refreshStorageInfo as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "confirmResetAll",
      openReset as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "toggleAutoSave",
      (() => {
        const next = toggleAutoSave();
        setAutoSave(next);
      }) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "exportBackupJSON",
      exportBackupJSON as (...args: never[]) => unknown
    );
    return () => {
      unregStorage();
      unregReset();
    };
  }, [openReset, openStorage, refreshStorageInfo]);

  return (
    <>
      {/* ═══ MODAL KELOLA DATA TERSIMPAN ═══ */}
      <OasModalDialog
        id="modal-storage"
        open={storageOpen}
        onClose={() => setStorageOpen(false)}
        maxWidth="540px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <FolderOpen size={15} /> Kelola Data Tersimpan
          </span>
        }
        footer={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setStorageOpen(false)}
          >
            Tutup
          </button>
        }
      >
        {/* Status bar */}
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text)" }}>
              {jurnalCount} Jurnal · {akunCount} Akun · {sizeKB} KB digunakan
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginTop: "2px",
              }}
            >
              Terakhir disimpan: {lastSaveStr}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                callOasGlobal("manualSave");
                refreshStorageInfo();
              }}
              className="btn btn-primary btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Save size={13} /> Simpan Sekarang
            </button>
            <button
              type="button"
              onClick={() => setAutoSave(toggleAutoSave())}
              className="btn btn-ghost btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Clock size={13} /> Auto-save: {autoSave ? "ON" : "OFF"}
            </button>
            {isAdminUser ? (
              <button
                type="button"
                id="storage-reset-btn"
                onClick={() => {
                  setStorageOpen(false);
                  openReset();
                }}
                className="btn btn-danger btn-sm"
                title="Reset Data: pilih sendiri jenis data yang dihapus"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Trash2 size={13} /> Reset
              </button>
            ) : null}
          </div>
        </div>

        {/* 5 Slots */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Save size={13} /> Slot Penyimpanan (5 Slot)
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <div className="storage-slot active-slot">
            <span className="slot-icon">
              <RefreshCw size={16} />
            </span>
            <div className="slot-info">
              <div className="slot-name">Data Aktif (Auto-save)</div>
              <div className="slot-meta">
                Terakhir: {lastSaveStr} · {jurnalCount} jurnal · {akunCount} akun
              </div>
            </div>
            <div className="slot-actions">
              <button
                type="button"
                className="slot-btn primary"
                onClick={() => {
                  callOasGlobal("manualSave");
                  refreshStorageInfo();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Save size={13} /> Simpan
              </button>
            </div>
          </div>

          {[1, 2, 3, 4, 5].map((i) => {
            const slot = slots[i];
            if (slot) {
              const dt = new Date(slot.savedAt).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div key={i} className="storage-slot">
                  <span className="slot-icon">
                    <Folder size={18} />
                  </span>
                  <div className="slot-info">
                    <div className="slot-name">{slot.name}</div>
                    <div className="slot-meta">
                      Disimpan: {dt} · {slot.jurnalCount || 0} jurnal
                    </div>
                  </div>
                  <div className="slot-actions">
                    <button
                      type="button"
                      className="slot-btn primary"
                      onClick={() => {
                        if (loadFromSlot(i)) {
                          refreshStorageInfo();
                          setStorageOpen(false);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FolderOpen size={13} /> Muat
                    </button>
                    <button
                      type="button"
                      className="slot-btn"
                      onClick={() => {
                        if (saveToSlot(i)) refreshStorageInfo();
                      }}
                      title="Timpa slot"
                    >
                      <Save size={13} />
                    </button>
                    <button
                      type="button"
                      className="slot-btn danger"
                      onClick={() => {
                        if (deleteSlot(i)) refreshStorageInfo();
                      }}
                      title="Hapus slot"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div key={i} className="storage-slot" style={{ opacity: 0.6 }}>
                <span className="slot-icon">
                  <FolderOpen size={16} />
                </span>
                <div className="slot-info">
                  <div className="slot-name">Slot {i} · Kosong</div>
                  <div className="slot-meta">
                    Klik untuk menyimpan data saat ini ke slot ini
                  </div>
                </div>
                <div className="slot-actions">
                  <button
                    type="button"
                    className="slot-btn primary"
                    onClick={() => {
                      if (saveToSlot(i)) refreshStorageInfo();
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Save size={13} /> Simpan di sini
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Backup & Restore */}
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <Package size={13} /> Backup &amp; Restore File
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border-strong)",
              borderRadius: "10px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                marginBottom: "6px",
                display: "flex",
                justifyContent: "center",
                color: "var(--accent)",
              }}
            >
              <Upload size={22} />
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
              Export Backup
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "10px",
              }}
            >
              Simpan semua data ke file .oas
            </div>
            <button
              type="button"
              onClick={exportBackupJSON}
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
            >
              Download .oas
            </button>
          </div>
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border-strong)",
              borderRadius: "10px",
              padding: "14px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                marginBottom: "6px",
                display: "flex",
                justifyContent: "center",
                color: "var(--accent2)",
              }}
            >
              <Download size={22} />
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "4px" }}>
              Import Backup
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted)",
                marginBottom: "10px",
              }}
            >
              Muat data dari file .oas
            </div>
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="btn btn-ghost btn-sm"
              style={{
                width: "100%",
                borderColor: "var(--border-strong)",
                color: "var(--text)",
              }}
            >
              Pilih File .oas
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".oas,.json"
              style={{ display: "none" }}
              onChange={handleImportFile}
            />
          </div>
        </div>

        <div
          style={{
            background: "rgba(217,119,43,0.1)",
            border: "1px solid rgba(217,119,43,0.28)",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "11.5px",
            color: "var(--muted)",
            lineHeight: 1.7,
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
          }}
        >
          <Lightbulb
            size={14}
            style={{ color: "var(--accent3)", flexShrink: 0, marginTop: "3px" }}
          />
          <span>
            <b style={{ color: "var(--accent3)" }}>Tips:</b> Data di slot
            tersimpan di browser ini. Untuk backup ke device lain atau sebagai
            keamanan, selalu <b>Download .oas</b> secara berkala.
          </span>
        </div>
      </OasModalDialog>

      {/* ═══ MODAL RESET DATA ═══ */}
      <OasModalDialog
        id="modal-reset-all"
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        maxWidth="440px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={15} style={{ color: "var(--accent3)" }} /> Reset
            Data
          </span>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setResetOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void handleDoReset()}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Trash2 size={14} /> Reset yang Dipilih
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "4px 0 12px" }}>
          <div
            style={{
              marginBottom: "10px",
              display: "flex",
              justifyContent: "center",
              color: "var(--red)",
            }}
          >
            <Trash2 size={32} />
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "15px",
              marginBottom: "6px",
              color: "var(--red)",
            }}
          >
            Pilih data yang mau dihapus
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted)",
              lineHeight: 1.6,
              textAlign: "left",
            }}
          >
            Hanya yang dicentang yang dihapus permanen, termasuk dari cloud.
            Chart of Accounts dan pengaturan <b>tidak</b> ikut dihapus.
          </div>
          <div
            style={{
              marginTop: "12px",
              background: "var(--surface2)",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "9px 12px",
              }}
            >
              {RESET_OPTIONS.map((o) => (
                <label
                  key={o.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(selectedReset[o.key])}
                    onChange={(e) =>
                      setSelectedReset((prev) => ({
                        ...prev,
                        [o.key]: e.target.checked,
                      }))
                    }
                    style={{
                      accentColor: "var(--red)",
                      width: "15px",
                      height: "15px",
                    }}
                  />{" "}
                  {o.label}
                </label>
              ))}
            </div>
            <div style={{ marginTop: "10px", display: "flex", gap: "12px", fontSize: "11.5px" }}>
              <button
                type="button"
                onClick={() => {
                  const all: Record<string, boolean> = {};
                  RESET_OPTIONS.forEach((o) => {
                    all[o.key] = true;
                  });
                  setSelectedReset(all);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-text)",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedReset({})}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-text)",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Kosongkan
              </button>
            </div>
            <div
              style={{
                marginTop: "10px",
                fontSize: "11px",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              Catatan: menghapus Invoice juga mengulang penomoran invoice dari
              001. Kalau mau laporan kembali ke nol, centang Jurnal Umum juga.
            </div>
          </div>

          <div
            style={{
              marginTop: "14px",
              background: "var(--surface2)",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "6px",
              }}
            >
              Ketik <b>RESET</b> untuk konfirmasi:
            </div>
            <input
              type="text"
              placeholder="Ketik RESET di sini"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg)",
                border: `1px solid ${resetErrorBorder ? "var(--red)" : "var(--border)"}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: "var(--text)",
                fontFamily: "var(--mono)",
                fontSize: "14px",
                outline: "none",
                textTransform: "uppercase",
              }}
            />
          </div>
        </div>
      </OasModalDialog>
    </>
  );
}
