import { saveFiturBaru } from "@/lib/fitur-baru/fitur-tambahan";
import { resetCounterJenisState } from "@/lib/lainnya/audit-tim";
import {
  callOasGlobal,
  readAkuns,
  readAkunsTrash,
  readCurrentCompany,
  readJurnalCounter,
  readJurnalEntries,
  readPeriodeKunciSampai,
  readProdukList,
  readTransaksiAkunSettings,
  writeAkuns,
  writeAkunsTrash,
  writeJurnalCounter,
  writeJurnalEntries,
  writePeriodeKunciSampai,
  writeProdukList,
  writeTransaksiAkunSettings,
} from "@/lib/shared/legacy-store";
import { cloudDeleteRecords } from "./cloud-records";
import { getDB } from "./db-adapter";

const STORAGE_KEY_LEGACY = "oas_data_v2";
const META_KEY_LEGACY = "oas_meta_v2";
const STORAGE_SLOTS_KEY = "oas_slots_v2";
const AUTOSAVE_KEY = "oas_autosave_enabled";

let autoSaveEnabled = true;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let hasUnsavedChanges = false;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

export interface StorageSlotEntry {
  name: string;
  savedAt: string;
  data: ReturnType<typeof serializeData>;
  jurnalCount: number;
}

export function getStorageKey(): string {
  return `oas_data_v2_${readCurrentCompany()?.id || "guest"}`;
}

export function getMetaKey(): string {
  return `oas_meta_v2_${readCurrentCompany()?.id || "guest"}`;
}

export function getAutoSaveEnabled(): boolean {
  if (typeof window !== "undefined") {
    autoSaveEnabled = localStorage.getItem(AUTOSAVE_KEY) !== "false";
  }
  return autoSaveEnabled;
}

export function setHasUnsavedChanges(val: boolean): void {
  hasUnsavedChanges = val;
}

export function serializeData() {
  return {
    version: "2.0",
    savedAt: new Date().toISOString(),
    jurnalEntries: readJurnalEntries(),
    jurnalCounter: readJurnalCounter(),
    akuns: readAkuns(),
    akunsTrash: readAkunsTrash(),
    transaksiAkunSettings: readTransaksiAkunSettings(),
    periodeKunciSampai: readPeriodeKunciSampai(),
    produkList: readProdukList(),
    appName: "Bayu Harlan Priangga",
  };
}

export function updateSaveIndicator(
  state: "saving" | "saved" | "unsaved" | "error"
): void {
  if (typeof document === "undefined") return;
  const dot = document.getElementById("save-dot");
  const txt = document.getElementById("save-text");
  if (!dot || !txt) return;
  if (state === "saving") {
    dot.style.background = "var(--accent3)";
    dot.classList.add("saving-anim");
    txt.textContent = "Menyimpan...";
    txt.style.color = "var(--accent3)";
  } else if (state === "saved") {
    dot.style.background = "var(--accent)";
    dot.classList.remove("saving-anim");
    txt.textContent = "Tersimpan";
    txt.style.color = "var(--accent)";
  } else if (state === "unsaved") {
    dot.style.background = "var(--accent3)";
    dot.classList.remove("saving-anim");
    txt.textContent = "● Belum disimpan";
    txt.style.color = "var(--accent3)";
  } else if (state === "error") {
    dot.style.background = "var(--red)";
    dot.classList.remove("saving-anim");
    txt.textContent = "✕ Error";
    txt.style.color = "var(--red)";
  }
}

export function showAutoSaveToast(msg: string, subtle = true): void {
  if (typeof document === "undefined") return;
  const toast = document.getElementById("autosave-toast");
  const msgEl = document.getElementById("autosave-toast-msg");
  if (!toast || !msgEl) return;
  if (subtle) {
    toast.style.opacity = "0";
    return;
  }
  msgEl.innerHTML = msg;
  toast.style.transform = "translateY(0)";
  toast.style.opacity = "1";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.transform = "translateY(40px)";
    toast.style.opacity = "0";
  }, 2000);
}

export function scheduleAutoSave(): void {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (hasUnsavedChanges) {
      callOasGlobal("saveToStorage", false);
    }
  }, 3000);
}

export function markDirty(): void {
  hasUnsavedChanges = true;
  updateSaveIndicator("unsaved");
  if (autoSaveEnabled) scheduleAutoSave();
}

export function saveToLocalStorage(showToast = true): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = serializeData();
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    const meta = {
      lastSave: new Date().toISOString(),
      jurnalCount: data.jurnalEntries.length,
      akunCount: data.akuns.length,
      version: "2.0",
    };
    localStorage.setItem(getMetaKey(), JSON.stringify(meta));
    hasUnsavedChanges = false;
    updateSaveIndicator("saved");
    if (showToast) showAutoSaveToast("Tersimpan!", false);
    else showAutoSaveToast("Auto-saved", true);
    return true;
  } catch (e) {
    updateSaveIndicator("error");
    if (e instanceof Error && e.name === "QuotaExceededError") {
      callOasGlobal(
        "showAlert",
        "Storage penuh! Hapus beberapa data atau export backup dulu."
      );
    }
    return false;
  }
}

export function loadFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw =
      localStorage.getItem(getStorageKey()) ||
      localStorage.getItem(STORAGE_KEY_LEGACY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (Array.isArray(data.jurnalEntries)) {
      const beforeCount = data.jurnalEntries.length;
      const filtered = data.jurnalEntries.filter(
        (j: { id?: string }) => !j?.id?.startsWith("JRN_AT_")
      );
      writeJurnalEntries(filtered);
      writeJurnalCounter(data.jurnalCounter || filtered.length + 1);
      if (Array.isArray(data.produkList)) writeProdukList(data.produkList);
      if (filtered.length < beforeCount) {
        setTimeout(() => callOasGlobal("saveToStorage", false), 600);
      }
    }
    if (Array.isArray(data.akuns) && data.akuns.length > 0) {
      writeAkuns(data.akuns);
    }
    if (Array.isArray(data.akunsTrash)) writeAkunsTrash(data.akunsTrash);
    if (data.transaksiAkunSettings) {
      writeTransaksiAkunSettings({
        ...readTransaksiAkunSettings(),
        ...data.transaksiAkunSettings,
      });
    }
    if (typeof data.periodeKunciSampai === "string") {
      writePeriodeKunciSampai(data.periodeKunciSampai);
    }
    callOasGlobal("purgeExpiredAkunTrash");
    callOasGlobal("renderDashboard");
    return true;
  } catch (e) {
    console.error("Load error:", e);
    return false;
  }
}

export function initLocalStorageFull(): void {
  autoSaveEnabled = localStorage.getItem(AUTOSAVE_KEY) !== "false";
  loadFromStorage();
  if (autoSaveEnabled) scheduleAutoSave();
  updateSaveIndicator("saved");
  bindStorageLifecycleListeners();
}

export function initStorageLight(): void {
  if (typeof window === "undefined") return;
  autoSaveEnabled = localStorage.getItem(AUTOSAVE_KEY) !== "false";
  updateSaveIndicator("saved");
  bindStorageLifecycleListeners();
}

function bindStorageLifecycleListeners(): void {
  if (typeof window === "undefined" || listenersBound) return;
  listenersBound = true;
  window.addEventListener("beforeunload", () => {
    if (hasUnsavedChanges) callOasGlobal("saveToStorage", false);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && hasUnsavedChanges) {
      callOasGlobal("saveToStorage", false);
    }
  });
}

export function getSlots(): Record<string, StorageSlotEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SLOTS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveToSlot(slotId: number): boolean {
  const slots = getSlots();
  const name = window.prompt(
    `Nama simpanan slot ${slotId}:`,
    slots[slotId]?.name || `Simpanan ${slotId}`
  );
  if (name === null) return false;
  slots[slotId] = {
    name: name || `Simpanan ${slotId}`,
    savedAt: new Date().toISOString(),
    data: serializeData(),
    jurnalCount: readJurnalEntries().length,
  };
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
  callOasGlobal(
    "showAlert",
    `Data disimpan ke Slot ${slotId}: "${slots[slotId].name}"`
  );
  return true;
}

export function loadFromSlot(slotId: number): boolean {
  const slots = getSlots();
  const slot = slots[slotId];
  if (!slot) return false;
  if (
    !window.confirm(
      `Muat data dari "${slot.name}"?\nData saat ini akan diganti.`
    )
  ) {
    return false;
  }
  try {
    if (Array.isArray(slot.data.jurnalEntries)) {
      writeJurnalEntries(slot.data.jurnalEntries);
      writeJurnalCounter(
        slot.data.jurnalCounter || slot.data.jurnalEntries.length + 1
      );
    }
    if (Array.isArray(slot.data.akuns) && slot.data.akuns.length > 0) {
      writeAkuns(slot.data.akuns);
    }
    if (Array.isArray(slot.data.akunsTrash)) {
      writeAkunsTrash(slot.data.akunsTrash);
    }
    if (slot.data.transaksiAkunSettings) {
      writeTransaksiAkunSettings({
        ...readTransaksiAkunSettings(),
        ...slot.data.transaksiAkunSettings,
      });
    }
    if (typeof slot.data.periodeKunciSampai === "string") {
      writePeriodeKunciSampai(slot.data.periodeKunciSampai);
    }
    callOasGlobal("saveToStorage", false);
    callOasGlobal("renderDashboard");
    callOasGlobal("showAlert", `Data "${slot.name}" berhasil dimuat!`);
    return true;
  } catch (e) {
    callOasGlobal(
      "showAlert",
      "Gagal memuat: " + (e instanceof Error ? e.message : String(e))
    );
    return false;
  }
}

export function deleteSlot(slotId: number): boolean {
  const slots = getSlots();
  if (!slots[slotId]) return false;
  if (!window.confirm(`Hapus simpanan "${slots[slotId].name}"?`)) return false;
  delete slots[slotId];
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
  callOasGlobal("showAlert", "Slot dihapus");
  return true;
}

export function getStorageSizeKB(): string {
  if (typeof window === "undefined") return "0.0";
  const raw = localStorage.getItem(getStorageKey()) || "";
  return (new Blob([raw]).size / 1024).toFixed(1);
}

export function getStorageMeta(): { lastSave?: string } {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      localStorage.getItem(getMetaKey()) ||
        localStorage.getItem(META_KEY_LEGACY) ||
        "{}"
    );
  } catch {
    return {};
  }
}

export function toggleAutoSave(): boolean {
  autoSaveEnabled = !getAutoSaveEnabled();
  localStorage.setItem(AUTOSAVE_KEY, String(autoSaveEnabled));
  callOasGlobal(
    "showAlert",
    autoSaveEnabled ? "Auto-save diaktifkan" : "Auto-save dinonaktifkan"
  );
  if (autoSaveEnabled && hasUnsavedChanges) scheduleAutoSave();
  return autoSaveEnabled;
}

export function exportBackupJSON(): void {
  const data = serializeData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `BHP_Backup_${date}.oas`;
  a.click();
  URL.revokeObjectURL(url);
  callOasGlobal(
    "auditLog",
    "export",
    "system",
    "Export backup data JSON",
    { ref: "BACKUP-JSON" }
  );
  callOasGlobal(
    "showAlert",
    "Backup berhasil didownload! Simpan file .oas ini dengan aman."
  );
}

export function importBackupFromFile(
  file: File,
  onSuccess?: () => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(String(e.target?.result || "{}"));
      if (!data.jurnalEntries && !data.akuns) {
        callOasGlobal(
          "showAlert",
          "File tidak valid atau bukan format backup OAS."
        );
        return;
      }
      const jCount = data.jurnalEntries?.length || 0;
      const aCount = data.akuns?.length || 0;
      if (
        !window.confirm(
          `Import data dari file:\n• ${jCount} jurnal\n• ${aCount} akun\n\nData saat ini akan DIGANTI. Lanjutkan?`
        )
      ) {
        return;
      }
      if (Array.isArray(data.jurnalEntries)) {
        writeJurnalEntries(data.jurnalEntries);
        writeJurnalCounter(data.jurnalCounter || data.jurnalEntries.length + 1);
      }
      if (Array.isArray(data.akuns) && data.akuns.length > 0) {
        writeAkuns(data.akuns);
      }
      if (Array.isArray(data.akunsTrash)) writeAkunsTrash(data.akunsTrash);
      if (data.transaksiAkunSettings) {
        writeTransaksiAkunSettings({
          ...readTransaksiAkunSettings(),
          ...data.transaksiAkunSettings,
        });
      }
      if (typeof data.periodeKunciSampai === "string") {
        writePeriodeKunciSampai(data.periodeKunciSampai);
      }
      callOasGlobal("saveToStorage", false);
      callOasGlobal("renderDashboard");
      callOasGlobal(
        "auditLog",
        "create",
        "system",
        "Import data dari backup JSON",
        { ref: "IMPORT-JSON" }
      );
      onSuccess?.();
      callOasGlobal(
        "showAlert",
        `Import berhasil! ${jCount} jurnal dan ${aCount} akun dimuat.`
      );
    } catch (err) {
      callOasGlobal(
        "showAlert",
        "Gagal membaca file: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  };
  reader.readAsText(file);
}

export async function executeResetData(
  selectedLabels: Record<string, string>
): Promise<void> {
  if (callOasGlobal("isAdmin") === false) {
    callOasGlobal(
      "showAlert",
      "Hanya Admin atau Pemilik bisnis yang memiliki izin untuk mereset data."
    );
    return;
  }
  const resetJurnal = "jurnal" in selectedLabels;
  const kinds = Object.keys(selectedLabels).filter((k) => k !== "jurnal");
  const gagal: string[] = [];

  callOasGlobal(
    "showOpSpinner",
    "Menghapus data terpilih...",
    "Membersihkan cloud & lokal"
  );
  try {
    if (resetJurnal) {
      let ok = true;
      const company = readCurrentCompany();
      const db = getDB();
      if (company?.id && db) {
        try {
          const { error } = await db
            .table("jurnal_entries")
            .delete()
            .eq("company_id", company.id);
          if (error) throw error;
        } catch (e) {
          ok = false;
          console.error("Reset jurnal Supabase error:", e);
        }
      }
      if (ok) {
        writeJurnalEntries([]);
        writeJurnalCounter(1);
        writePeriodeKunciSampai("");
        try {
          callOasGlobal("savePeriodeKunciToCloud");
        } catch {
          // ignore
        }
      } else {
        gagal.push(selectedLabels.jurnal);
      }
    }

    if (kinds.length) {
      const hapus = kinds.includes("invoice") ? kinds.concat("counter") : kinds;
      const failedKinds = await cloudDeleteRecords(hapus);
      failedKinds.forEach((k) => {
        const l = selectedLabels[k] || selectedLabels.invoice || k;
        if (!gagal.includes(l)) gagal.push(l);
      });
      if (
        kinds.includes("bill") &&
        !kinds.includes("invoice") &&
        !failedKinds.includes("bill")
      ) {
        resetCounterJenisState("BILL");
      }
      if (
        kinds.includes("dok") &&
        !kinds.includes("invoice") &&
        !failedKinds.includes("dok")
      ) {
        ["QUO", "SO", "SJ", "PO", "GRN", "RET"].forEach((awalan) =>
          resetCounterJenisState(awalan)
        );
      }
    }
  } finally {
    callOasGlobal("hideOpSpinner");
  }

  callOasGlobal("saveToStorage", false);
  saveFiturBaru();
  hasUnsavedChanges = false;
  updateSaveIndicator("saved");

  [
    "renderDashboard",
    "renderJurnalUmum",
    "renderInvoiceList",
    "renderInvoiceKPI",
    "renderBillList",
    "renderPenawaranList",
    "renderPesananList",
    "renderKontak",
    "renderKontakKPI",
    "renderAsetTetap",
    "renderAsetTetapKPI",
    "renderProduk",
    "renderJurnalBerulang",
    "renderAnggaranPage",
  ].forEach((fn) => callOasGlobal(fn));

  const berhasil = Object.keys(selectedLabels)
    .map((k) => selectedLabels[k])
    .filter((l) => !gagal.includes(l));

  if (!gagal.length) {
    callOasGlobal(
      "showAlert",
      `Data berhasil direset: ${berhasil.join(", ")}.`
    );
  } else {
    callOasGlobal(
      "showAlert",
      `Gagal menghapus dari cloud: <b>${gagal.join(", ")}</b>. Data itu masih ada; cek koneksi lalu coba lagi.${
        berhasil.length ? `<br>Berhasil direset: ${berhasil.join(", ")}.` : ""
      }`
    );
  }
}
