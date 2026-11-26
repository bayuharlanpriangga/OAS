import { setCompanyLogo } from "@/lib/cloud/profil";
import { escapeHtml } from "@/lib/shared/format";
import {
  callOasGlobal,
  getWin,
  readCurrentCompany,
  readCurrentUser,
  readDbAdapter,
} from "@/lib/shared/legacy-store";
import { showPage } from "./navigation-theme";
import { getCurrentPage } from "./runtime-store";

// ── OVERLAY CALLBACK REGISTRY (diisi oleh ShellOverlays.tsx) ────────────

export interface OptPickerOption {
  value: string;
  label: string;
  icon?: string;
  sub?: string;
}

export interface OptPickerConfig {
  title?: string;
  options: OptPickerOption[];
  currentValue?: string;
  onSelect?: (value: string, label: string) => void;
  btnEl?: HTMLElement | null;
  selectEl?: HTMLSelectElement | null;
}

export interface CropModalConfig {
  imgSrc: string;
  shape?: "circle" | "rounded" | string;
  outputSize?: number;
  title?: string;
  onConfirm?: (croppedDataURL: string) => void;
}

export interface ShellOverlayCallbacks {
  openOptPicker: (config: OptPickerConfig) => void;
  closeOptPicker: () => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  openPhotoViewer: (src: string, shape?: string) => void;
  closePhotoViewer: () => void;
  openCropModal: (config: CropModalConfig) => void;
}

let shellCbs: ShellOverlayCallbacks | null = null;

export function registerShellOverlayCallbacks(
  cbs: ShellOverlayCallbacks | null
): void {
  shellCbs = cbs;
}

// ── NUMBER INPUT FORMATTING ─────────────────────────────────────────────

export function formatRibuan(n: number | string | null | undefined): string {
  if (!n && n !== 0) return "";
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("id-ID");
}

function updateFormatDisplay(inp: HTMLInputElement): void {
  const val = parseFloat(inp.value);
  if (!Number.isNaN(val) && val >= 1000) {
    let disp = inp.nextElementSibling as HTMLElement | null;
    if (!disp || !disp.classList.contains("num-display")) {
      disp = document.createElement("div");
      disp.className = "num-display";
      disp.style.cssText =
        "font-size:10px;color:var(--accent2);font-family:var(--mono);margin-top:2px;";
      inp.parentNode?.insertBefore(disp, inp.nextSibling);
    }
    disp.textContent = "= Rp " + val.toLocaleString("id-ID");
    disp.style.display = "block";
  } else {
    const disp = inp.nextElementSibling as HTMLElement | null;
    if (disp && disp.classList.contains("num-display")) {
      disp.style.display = "none";
    }
  }
}

export function setupNumberInputs(): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll<HTMLInputElement>("input[type=number]")
    .forEach((inp) => {
      if (inp.dataset.formatted) return;
      inp.dataset.formatted = "1";
      inp.addEventListener("input", () => updateFormatDisplay(inp));
      inp.addEventListener("focus", () => {
        const disp = inp.nextElementSibling as HTMLElement | null;
        if (disp?.classList.contains("num-display")) disp.style.display = "none";
      });
      inp.addEventListener("blur", () => updateFormatDisplay(inp));
    });
}

// ── OPERATION SPINNER + ALERT / SUCCESS MORPH ───────────────────────────

let alertTimer: ReturnType<typeof setTimeout> | null = null;
let opSpinnerDepth = 0;
let opSpinnerTimer: ReturnType<typeof setTimeout> | null = null;
let successLock = false;
let successTimer: ReturnType<typeof setTimeout> | null = null;

function isSuccessMsg(msg: unknown): boolean {
  if (typeof msg !== "string") return false;
  if (/^\s*(❌|⛔|⚠️)/.test(msg)) return false;
  if (
    /\b(gagal|salah|ditolak|tidak bisa|tidak valid|penuh|kedaluwarsa|habis|terlalu besar|belum|kosong|minimal|tidak cocok|wajib|masukkan|tidak balance|tidak ditemukan|hanya pemilik|hanya admin|tidak ada lampiran|tidak ada baris|bukan format|error)\b/i.test(
      msg
    )
  ) {
    return false;
  }
  return /(✓|✅|ti-circle-check)/i.test(msg) || /\bberhasil\b/i.test(msg);
}

export function showSuccessMorph(msg: string): void {
  if (typeof document === "undefined") return;
  const overlay = document.getElementById("op-spinner-overlay");
  const card = document.getElementById("op-spinner-card");
  const labelEl = document.getElementById("op-spinner-label");
  const subEl = document.getElementById("op-spinner-sub");
  if (!overlay || !card || !labelEl) return;

  if (opSpinnerTimer) {
    clearTimeout(opSpinnerTimer);
    opSpinnerTimer = null;
  }
  if (successTimer) clearTimeout(successTimer);
  opSpinnerDepth = 0;
  successLock = true;

  const wasOpen = overlay.classList.contains("active");
  overlay.classList.add("active");
  card.style.animation = wasOpen
    ? ""
    : "opSpinnerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both";

  const cleanMsg = String(msg).replace(
    /^\s*(✓|✅|<i class="ti ti-circle-check"[^>]*>\s*<\/i>)\s*/i,
    ""
  );
  labelEl.innerHTML = cleanMsg || "Berhasil!";
  if (subEl) subEl.textContent = "";

  card.classList.remove("success");
  void card.offsetWidth;
  requestAnimationFrame(() => card.classList.add("success"));

  successTimer = setTimeout(() => {
    card.style.animation = "opSpinnerIn 0.15s ease reverse both";
    setTimeout(() => {
      overlay.classList.remove("active");
      card.classList.remove("success");
      card.style.animation = "";
      successLock = false;
    }, 150);
  }, 1700);
}

export function showAlert(msg: string): void {
  if (typeof document === "undefined") return;
  if (isSuccessMsg(msg)) {
    showSuccessMorph(msg);
    return;
  }
  const el = document.getElementById("alert-box");
  if (!el) return;
  el.innerHTML = msg;
  el.classList.add("show");
  if (alertTimer) clearTimeout(alertTimer);
  alertTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

export function showOpSpinner(label?: string, sub?: string): void {
  if (typeof document === "undefined" || successLock) return;
  opSpinnerDepth++;
  if (opSpinnerTimer) {
    clearTimeout(opSpinnerTimer);
    opSpinnerTimer = null;
  }
  const overlay = document.getElementById("op-spinner-overlay");
  const card = document.getElementById("op-spinner-card");
  const labelEl = document.getElementById("op-spinner-label");
  const subEl = document.getElementById("op-spinner-sub");
  if (card) card.classList.remove("success");
  if (labelEl) labelEl.textContent = label || "Memproses...";
  if (subEl) subEl.textContent = sub || "";
  if (overlay) overlay.classList.add("active");
}

export function hideOpSpinner(): void {
  if (typeof document === "undefined" || successLock) return;
  opSpinnerDepth = Math.max(0, opSpinnerDepth - 1);
  if (opSpinnerDepth > 0) return;
  const overlay = document.getElementById("op-spinner-overlay");
  if (overlay) {
    const card = document.getElementById("op-spinner-card");
    if (card) card.style.animation = "opSpinnerIn 0.15s ease reverse both";
    opSpinnerTimer = setTimeout(() => {
      overlay.classList.remove("active");
      if (card) {
        card.style.animation = "";
        card.classList.remove("success");
      }
      opSpinnerTimer = null;
    }, 150);
  }
}

// ── PROMISE DIALOGS: CONFIRM, INPUT, SELECT ─────────────────────────────

export interface CustomConfirmRow {
  label: string;
  value: string;
  color?: string;
}

export interface CustomConfirmOptions {
  icon?: string;
  iconColor?: string;
  iconBorder?: string;
  title?: string;
  subtitle?: string;
  rows?: CustomConfirmRow[];
  warning?: string | null;
  btnLabel?: string;
  btnGradient?: string;
}

export function showCustomConfirmGeneral(
  opts: CustomConfirmOptions
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }
    const {
      icon,
      iconColor,
      iconBorder,
      title,
      subtitle,
      rows,
      warning,
      btnLabel,
      btnGradient,
    } = opts || {};

    const modal = document.createElement("div");
    modal.id = "gcm-backdrop";
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;
        width:100%;max-width:400px;box-shadow:0 24px 64px rgba(0,0,0,0.55);
        overflow:hidden;animation:confirmPop 0.2s cubic-bezier(0.16,1,0.3,1);
      ">
        <div style="
          background:var(--surface2);
          border-bottom:1px solid var(--border);padding:18px 20px 16px;
          display:flex;align-items:center;gap:13px;
        ">
          <div style="width:40px;height:40px;border-radius:8px;background:${
            iconColor || "var(--surface)"
          };border:1px solid ${
      iconBorder || "var(--border-strong)"
    };color:var(--text);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${
      icon || '<i class="ti ti-target" style="font-size:20px;"></i>'
    }</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(
              title || ""
            )}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;line-height:1.5;">${escapeHtml(
              subtitle || ""
            )}</div>
          </div>
        </div>
        <div style="padding:16px 20px;">
          ${
            rows && rows.length
              ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:12px;">
            ${rows
              .map(
                (r) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);">
                <span style="font-size:12.5px;color:var(--muted);">${r.label}</span>
                <span style="font-size:13px;font-weight:700;color:${
                  r.color || "var(--text)"
                };font-family:var(--mono);">${r.value}</span>
              </div>`
              )
              .join("")}
          </div>`
              : ""
          }
          ${
            warning
              ? `<div style="background:rgba(217,119,43,0.08);border:1px solid rgba(217,119,43,0.28);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--accent3);">${warning}</div>`
              : ""
          }
        </div>
        <div style="padding:0 20px 20px;display:flex;gap:10px;">
          <button id="gcm-cancel" style="
            flex:1;padding:12px;border-radius:8px;
            background:var(--surface2);border:1px solid var(--border-strong);
            color:var(--muted);font-size:13.5px;font-weight:600;
            cursor:pointer;font-family:var(--sans);transition:all 0.15s;
          ">Batal</button>
          <button id="gcm-ok" style="
            flex:2;padding:12px;border-radius:8px;
            background:${
              btnGradient && !btnGradient.includes("linear-gradient")
                ? btnGradient
                : "var(--accent)"
            };
            border:none;color:${
              btnGradient && btnGradient.includes("red")
                ? "#fff"
                : "var(--accent-fg)"
            };font-size:13.5px;font-weight:700;
            cursor:pointer;font-family:var(--sans);transition:opacity 0.15s;
          ">${btnLabel || "Ya, Lanjutkan"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cleanup = () => {
      modal.style.animation = "gcmFadeOut 0.12s ease forwards";
      setTimeout(() => modal.remove(), 120);
    };
    const okBtn = modal.querySelector<HTMLButtonElement>("#gcm-ok");
    const cancelBtn = modal.querySelector<HTMLButtonElement>("#gcm-cancel");
    if (okBtn)
      okBtn.onclick = () => {
        cleanup();
        resolve(true);
      };
    if (cancelBtn)
      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(false);
      }
    });
  });
}

export interface CustomInputOptions {
  icon?: string;
  iconColor?: string;
  iconBorder?: string;
  title?: string;
  subtitle?: string;
  rows?: CustomConfirmRow[];
  inputLabel?: string;
  inputDefault?: string | number;
  btnLabel?: string;
}

export function showCustomInputModal(
  opts: CustomInputOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const {
      icon,
      iconColor,
      iconBorder,
      title,
      subtitle,
      rows,
      inputLabel,
      inputDefault,
      btnLabel,
    } = opts || {};

    const modal = document.createElement("div");
    modal.id = "cim-backdrop";
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;
    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;
        width:100%;max-width:400px;box-shadow:0 24px 64px rgba(0,0,0,0.55);
        overflow:hidden;animation:confirmPop 0.2s cubic-bezier(0.16,1,0.3,1);
      ">
        <div style="background:var(--surface2);border-bottom:1px solid var(--border);padding:18px 20px 16px;display:flex;align-items:center;gap:13px;">
          <div style="width:40px;height:40px;border-radius:8px;background:${
            iconColor || "var(--surface)"
          };border:1px solid ${
      iconBorder || "var(--border-strong)"
    };color:var(--text);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${
      icon || '<i class="ti ti-book" style="font-size:20px;"></i>'
    }</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(
              title || ""
            )}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(
              subtitle || ""
            )}</div>
          </div>
        </div>
        <div style="padding:16px 20px;">
          ${
            rows && rows.length
              ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:16px;">
            ${rows
              .map(
                (r) => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);">
                <span style="font-size:12.5px;color:var(--muted);">${r.label}</span>
                <span style="font-size:13px;font-weight:700;color:${
                  r.color || "var(--text)"
                };font-family:var(--mono);">${r.value}</span>
              </div>`
              )
              .join("")}
          </div>`
              : ""
          }
          <div style="margin-bottom:4px;">
            <label style="font-size:11.5px;font-weight:700;color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;display:block;margin-bottom:7px;">${
              inputLabel || "Masukkan nilai:"
            }</label>
            <input id="cim-input" type="number" value="${
              inputDefault ?? ""
            }" style="width:100%;background:var(--surface2);border:1px solid var(--border-strong);border-radius:8px;padding:11px 14px;color:var(--text);font-size:15px;font-family:var(--mono);font-weight:600;outline:none;">
          </div>
        </div>
        <div style="padding:0 20px 20px;display:flex;gap:10px;">
          <button id="cim-cancel" style="flex:1;padding:12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border-strong);color:var(--muted);font-size:13.5px;font-weight:600;cursor:pointer;font-family:var(--sans);">Batal</button>
          <button id="cim-ok" style="flex:2;padding:12px;border-radius:8px;background:var(--accent);border:none;color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer;font-family:var(--sans);">${
            btnLabel || "Konfirmasi"
          }</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const inputEl = modal.querySelector<HTMLInputElement>("#cim-input");
    setTimeout(() => {
      inputEl?.focus();
      inputEl?.select();
    }, 100);

    const cleanup = () => {
      modal.style.animation = "gcmFadeOut 0.12s ease forwards";
      setTimeout(() => modal.remove(), 120);
    };
    const okBtn = modal.querySelector<HTMLButtonElement>("#cim-ok");
    const cancelBtn = modal.querySelector<HTMLButtonElement>("#cim-cancel");
    if (okBtn)
      okBtn.onclick = () => {
        cleanup();
        resolve(inputEl?.value ?? null);
      };
    if (cancelBtn)
      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(null);
      }
    });
    inputEl?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        cleanup();
        resolve(inputEl.value);
      }
      if (e.key === "Escape") {
        cleanup();
        resolve(null);
      }
    });
  });
}

export interface CustomSelectOptions {
  icon?: string;
  iconColor?: string;
  iconBorder?: string;
  title?: string;
  subtitle?: string;
  options?: Array<{ value: string; label: string; sub?: string }>;
  btnLabel?: string;
}

export function showCustomSelectModal(
  opts: CustomSelectOptions
): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const {
      icon,
      iconColor,
      iconBorder,
      title,
      subtitle,
      options = [],
      btnLabel,
    } = opts || {};

    let selected: string | null = options[0]?.value ?? null;
    const modal = document.createElement("div");
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:100000;
      display:flex;align-items:center;justify-content:center;padding:20px;
      backdrop-filter:blur(4px);animation:gcmFadeIn 0.15s ease;
    `;

    const renderOptions = () =>
      options
        .map(
          (opt) => `
      <div class="csm-option ${opt.value === selected ? "csm-selected" : ""}"
        data-val="${escapeHtml(opt.value)}"
        style="display:flex;align-items:center;gap:12px;padding:11px 14px;
          border-radius:8px;border:1.5px solid ${
            opt.value === selected ? "var(--accent)" : "var(--border)"
          };
          background:${
            opt.value === selected ? "var(--accent-tint)" : "var(--surface2)"
          };
          cursor:pointer;margin-bottom:7px;transition:all 0.12s;">
        <div style="width:18px;height:18px;border-radius:4px;border:2px solid ${
          opt.value === selected ? "var(--accent)" : "var(--border-strong)"
        };background:${
            opt.value === selected ? "var(--accent)" : "transparent"
          };color:var(--accent-fg);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          ${
            opt.value === selected
              ? '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>'
              : ""
          }
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text);">${
            opt.label
          }</div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px;font-family:var(--mono);">${
            opt.sub || ""
          }</div>
        </div>
      </div>`
        )
        .join("");

    modal.innerHTML = `
      <div style="
        background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;
        width:100%;max-width:420px;box-shadow:0 24px 64px rgba(0,0,0,0.55);
        overflow:hidden;animation:confirmPop 0.2s cubic-bezier(0.16,1,0.3,1);
        max-height:90dvh;display:flex;flex-direction:column;
      ">
        <div style="background:var(--surface2);border-bottom:1px solid var(--border);padding:18px 20px 16px;display:flex;align-items:center;gap:13px;flex-shrink:0;">
          <div style="width:40px;height:40px;border-radius:8px;background:${
            iconColor || "var(--surface)"
          };border:1px solid ${
      iconBorder || "var(--border-strong)"
    };color:var(--text);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${
      icon || '<i class="ti ti-folders" style="font-size:18px;"></i>'
    }</div>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text);">${escapeHtml(
              title || ""
            )}</div>
            <div style="font-size:11.5px;color:var(--muted);margin-top:2px;">${escapeHtml(
              subtitle || ""
            )}</div>
          </div>
        </div>
        <div id="csm-options-wrap" style="padding:16px 20px;overflow-y:auto;flex:1;">
          ${renderOptions()}
        </div>
        <div style="padding:14px 20px 20px;display:flex;gap:10px;flex-shrink:0;border-top:1px solid var(--border);">
          <button id="csm-cancel" style="flex:1;padding:12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border-strong);color:var(--muted);font-size:13.5px;font-weight:600;cursor:pointer;font-family:var(--sans);">Batal</button>
          <button id="csm-ok" style="flex:2;padding:12px;border-radius:8px;background:var(--accent);border:none;color:var(--accent-fg);font-size:13.5px;font-weight:700;cursor:pointer;font-family:var(--sans);">${
            btnLabel || "Pilih"
          }</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const wrap = modal.querySelector<HTMLElement>("#csm-options-wrap");
    if (wrap) {
      wrap.onclick = (e) => {
        const opt = (e.target as HTMLElement | null)?.closest<HTMLElement>(
          "[data-val]"
        );
        if (!opt) return;
        selected = opt.dataset.val ?? null;
        wrap.innerHTML = renderOptions();
      };
    }

    const cleanup = () => {
      modal.style.animation = "gcmFadeOut 0.12s ease forwards";
      setTimeout(() => modal.remove(), 120);
    };
    const okBtn = modal.querySelector<HTMLButtonElement>("#csm-ok");
    const cancelBtn = modal.querySelector<HTMLButtonElement>("#csm-cancel");
    if (okBtn)
      okBtn.onclick = () => {
        cleanup();
        resolve(selected);
      };
    if (cancelBtn)
      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        cleanup();
        resolve(null);
      }
    });
  });
}

// ── DELEGATED OVERLAYS (handled by ShellOverlays.tsx) ───────────────────

export function openOptPicker(config: OptPickerConfig): void {
  shellCbs?.openOptPicker(config);
}

export function closeOptPicker(): void {
  shellCbs?.closeOptPicker();
}

export function openGlobalSearch(): void {
  shellCbs?.openGlobalSearch();
}

export function closeGlobalSearch(): void {
  shellCbs?.closeGlobalSearch();
}

export function openPhotoViewerShell(src: string, shape?: string): void {
  if (!src) return;
  shellCbs?.openPhotoViewer(src, shape);
}

export function closePhotoViewer(): void {
  shellCbs?.closePhotoViewer();
}

export function openCropModal(config: CropModalConfig): void {
  shellCbs?.openCropModal(config);
}

export function applyProfilePhoto(compressed: string): void {
  if (typeof window === "undefined") return;
  const msg = document.getElementById("accs-photo-msg");
  if (msg) {
    msg.textContent = "Menyimpan...";
    msg.style.color = "var(--muted)";
  }
  try {
    localStorage.setItem("oas_profile_photo", compressed);
  } catch {
    // ignore
  }
  const user = readCurrentUser();
  const db = readDbAdapter();
  if (user && db?.isConnected()) {
    db.auth
      .updateUser({ data: { avatar_url: compressed } })
      .catch((err) => console.warn("[Photo] Gagal simpan ke Supabase:", err));
  }
  window.dispatchEvent(
    new CustomEvent("oas:profile-photo-updated", {
      detail: { photo: compressed },
    })
  );
  callOasGlobal("updateUserChip");
  if (msg) {
    msg.innerHTML =
      '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;"></i> Foto profil diperbarui!';
    msg.style.color = "var(--accent)";
    setTimeout(() => {
      msg.innerHTML = "";
    }, 2500);
  }
}

export function applyCompanyLogo(compressed: string): void {
  setCompanyLogo(compressed);
}

// ── GLOBAL KEYBOARD SHORTCUTS, DATE LABEL & PULL-TO-REFRESH ─────────────

let shortcutsBound = false;
let ptrBound = false;

export function initCurrentDateLabel(): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById("current-date");
  if (el) {
    el.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

export function initGlobalShortcuts(): void {
  if (typeof document === "undefined" || shortcutsBound) return;
  shortcutsBound = true;
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openGlobalSearch();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      callOasGlobal("manualSave");
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      showPage("transaksi");
    }
  });
}

export function initPullToRefresh(): void {
  if (typeof document === "undefined" || ptrBound) return;
  ptrBound = true;

  const THRESHOLD = 72;
  const MAX_PULL = 115;
  const RESIST = 0.55;

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let isRefreshing = false;
  let touchStarted = false;

  const getScrollTop = () =>
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0;

  const getElements = () => ({
    pill: document.getElementById("ptr-pill"),
    arrow: document.getElementById("ptr-arrow"),
    label: document.getElementById("ptr-label"),
    mainEl: document.querySelector<HTMLElement>(".main"),
  });

  const hidePill = () => {
    const { pill, arrow, label } = getElements();
    if (!pill) return;
    pill.style.transition = "transform 0.25s ease, opacity 0.25s ease";
    pill.style.transform = "translateY(-64px)";
    pill.style.opacity = "0";
    pill.classList.remove("ptr-ready", "ptr-refreshing");
    if (arrow) {
      arrow.style.display = "flex";
      arrow.style.transform = "rotate(0deg)";
      arrow.textContent = "↓";
    }
    if (label) label.textContent = "Tarik untuk refresh";
  };

  const resetMain = () => {
    const { mainEl } = getElements();
    if (!mainEl) return;
    mainEl.classList.remove("ptr-pulling");
    mainEl.style.transition = "transform 0.25s ease";
    mainEl.style.transform = "";
  };

  const doRefresh = () => {
    const { pill, arrow, label } = getElements();
    if (!pill) return;
    isRefreshing = true;
    pill.classList.remove("ptr-ready");
    pill.classList.add("ptr-refreshing");
    pill.style.transition = "transform 0.2s ease";
    pill.style.transform = "translateY(14px)";
    if (arrow) arrow.style.display = "none";
    if (label) label.textContent = "Memperbarui...";

    const afterRefresh = () => {
      isRefreshing = false;
      isPulling = false;
      pill.classList.remove("ptr-refreshing");
      pill.classList.add("ptr-ready");
      if (label) label.textContent = "✓ Diperbarui!";
      if (arrow) {
        arrow.textContent = "✓";
        arrow.style.display = "flex";
      }
      setTimeout(() => {
        hidePill();
        resetMain();
      }, 700);
    };

    try {
      const win = getWin();
      if (readCurrentCompany() && typeof win?.loadDataFromSupabase === "function") {
        Promise.resolve(
          (win.loadDataFromSupabase as () => Promise<void>)()
        ).finally(afterRefresh);
      } else {
        showPage(getCurrentPage());
        setTimeout(afterRefresh, 400);
      }
    } catch {
      setTimeout(afterRefresh, 400);
    }
  };

  document.addEventListener(
    "touchstart",
    (e) => {
      if (isRefreshing || getScrollTop() > 2) return;
      let el = e.target as HTMLElement | null;
      while (el && el !== document.body) {
        if (
          (el.id &&
            (el.id.includes("picker") ||
              el.id.includes("modal") ||
              el.id.includes("sheet") ||
              el.id.includes("overlay"))) ||
          el.classList?.contains("modal") ||
          el.classList?.contains("modal-backdrop") ||
          el.classList?.contains("sidebar")
        ) {
          return;
        }
        el = el.parentElement;
      }
      const t = e.touches[0];
      if (!t) return;
      touchStarted = true;
      startY = t.clientY;
      currentY = startY;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!touchStarted || isRefreshing) return;
      if (getScrollTop() > 2) {
        touchStarted = false;
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      currentY = t.clientY;
      const dy = currentY - startY;
      if (dy <= 0) {
        if (isPulling) {
          isPulling = false;
          hidePill();
          resetMain();
        }
        return;
      }
      const pull = Math.min(dy * RESIST, MAX_PULL * RESIST);
      const { pill, arrow, label, mainEl } = getElements();
      if (!pill) return;

      if (!isPulling) {
        isPulling = true;
        mainEl?.classList.add("ptr-pulling");
      }
      pill.style.transition = "none";
      pill.style.opacity = "1";
      pill.style.transform = `translateY(${Math.min(pull - 48, 22)}px)`;
      if (mainEl) {
        mainEl.style.transition = "none";
        mainEl.style.transform = `translateY(${pull * 0.35}px)`;
      }
      const progress = Math.min(pull / (THRESHOLD * RESIST), 1);
      if (arrow) arrow.style.transform = `rotate(${progress * 180}deg)`;
      if (pull >= THRESHOLD * RESIST) {
        pill.classList.add("ptr-ready");
        if (label) label.textContent = "Lepas untuk refresh";
      } else {
        pill.classList.remove("ptr-ready");
        if (label) label.textContent = "Tarik untuk refresh";
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "touchend",
    () => {
      if (!touchStarted) return;
      touchStarted = false;
      if (!isPulling) return;
      const pull = Math.min((currentY - startY) * RESIST, MAX_PULL * RESIST);
      if (pull >= THRESHOLD * RESIST) {
        doRefresh();
      } else {
        isPulling = false;
        hidePill();
        resetMain();
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "touchcancel",
    () => {
      touchStarted = false;
      if (isPulling) {
        isPulling = false;
        hidePill();
        resetMain();
      }
    },
    { passive: true }
  );
}
