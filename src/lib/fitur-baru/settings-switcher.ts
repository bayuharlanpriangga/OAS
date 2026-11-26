import { escapeForJsAttr, escapeHtml } from "@/lib/shared/format";
import {
  callOasGlobal,
  readCurrentUser,
  readDbAdapter,
} from "@/lib/shared/legacy-store";

export const ACCOUNT_SWITCHER_KEY = "oas_saved_accounts";
export const ACCOUNT_SWITCHER_MAX = 5;

export interface SavedAccountEntry {
  uid: string;
  email: string;
  nama: string;
  avatarUrl: string;
  access_token: string;
  refresh_token: string;
  savedAt: string;
}

export const JUAL_AKUN_SETTINGS_OPTIONS = [
  { kodeDefault: "4101", label: "Penjualan Barang" },
  { kodeDefault: "4102", label: "Penjualan Jasa" },
  { kodeDefault: "4105", label: "Manufaktur" },
  { kodeDefault: "4106", label: "Properti" },
  { kodeDefault: "4107", label: "Bahan Baku" },
  { kodeDefault: "4202", label: "Pendapatan Sewa" },
  { kodeDefault: "4205", label: "Pendapatan Lainnya" },
] as const;

export const BELI_AKUN_SETTINGS_OPTIONS = [
  { kodeDefault: "1301", label: "Persediaan Barang Dagangan" },
  { kodeDefault: "1302", label: "Persediaan Bahan Baku" },
  { kodeDefault: "1303", label: "Barang Dalam Proses" },
  { kodeDefault: "1304", label: "Persediaan Barang Jadi" },
  { kodeDefault: "1401", label: "Perlengkapan Kantor" },
  { kodeDefault: "5101", label: "HPP / Beban Pembelian" },
] as const;

export function getSavedAccounts(): SavedAccountEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNT_SWITCHER_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function setSavedAccounts(list: SavedAccountEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACCOUNT_SWITCHER_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function saveCurrentAccountToSwitcher(session: {
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };
  access_token?: string;
  refresh_token?: string;
}): void {
  if (!session?.user || !session.access_token || !session.refresh_token) return;
  const list = getSavedAccounts();
  const idx = list.findIndex((a) => a.uid === session.user!.id);
  const entry: SavedAccountEntry = {
    uid: session.user.id,
    email: session.user.email || "",
    nama:
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.email ||
      "Akun",
    avatarUrl:
      session.user.user_metadata?.avatar_url ||
      session.user.user_metadata?.picture ||
      "",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    savedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    list[idx] = entry;
  } else {
    if (list.length >= ACCOUNT_SWITCHER_MAX) {
      list.sort(
        (a, b) => new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime()
      );
      list.shift();
    }
    list.push(entry);
  }
  setSavedAccounts(list);
}

function handleOutsideClick(e: MouseEvent): void {
  const panel = document.getElementById("account-switcher-panel");
  const chip = document.getElementById("user-company-chip");
  const target = e.target as Node | null;
  if (
    panel &&
    target &&
    !panel.contains(target) &&
    chip &&
    !chip.contains(target)
  ) {
    closeAccountSwitcher();
  }
}

export function closeAccountSwitcher(): void {
  if (typeof document === "undefined") return;
  document.getElementById("account-switcher-panel")?.classList.remove("open");
  document.getElementById("acc-switch-wrap")?.classList.remove("open");
  document.removeEventListener("click", handleOutsideClick);
}

export function toggleAccountSwitcher(): void {
  if (typeof document === "undefined") return;
  const panel = document.getElementById("account-switcher-panel");
  if (!panel) return;
  if (panel.classList.contains("open")) {
    closeAccountSwitcher();
    return;
  }
  renderAccountSwitcher();
  panel.classList.add("open");
  document.getElementById("acc-switch-wrap")?.classList.add("open");
  window.setTimeout(
    () => document.addEventListener("click", handleOutsideClick),
    0
  );
}

export function renderAccountSwitcher(): void {
  if (typeof document === "undefined") return;
  const panel = document.getElementById("account-switcher-panel");
  if (!panel) return;
  const list = getSavedAccounts();
  const currentUid = readCurrentUser()?.id ?? null;

  const rows =
    list
      .map((a) => {
        const active = a.uid === currentUid;
        const initial = (a.nama || "?").charAt(0).toUpperCase();
        return `<div class="acc-switch-row ${active ? "active" : ""}" ${
          active ? "" : `onclick="switchToAccount('${escapeForJsAttr(a.uid)}')"`
        }>
      <div class="acc-switch-avatar">${
        a.avatarUrl
          ? `<img src="${escapeHtml(a.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
          : escapeHtml(initial)
      }</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.nama)}</div>
        <div style="font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.email)}</div>
      </div>
      ${
        active
          ? '<i class="ti ti-check" style="font-size:15px;color:var(--accent);flex-shrink:0;"></i>'
          : `<button type="button" onclick="event.stopPropagation();removeAccountFromSwitcher('${escapeForJsAttr(a.uid)}')" title="Hapus dari daftar" class="acc-switch-remove"><i class="ti ti-x" style="font-size:12px;"></i></button>`
      }
    </div>`;
      })
      .join("") ||
    `<div style="padding:14px;text-align:center;font-size:12px;color:var(--muted);">Belum ada akun tersimpan</div>`;

  panel.innerHTML = `
    ${rows}
    <div class="acc-switch-divider"></div>
    <div class="acc-switch-menuitem" onclick="closeAccountSwitcher();openAccountSettings();"><i class="ti ti-settings" style="font-size:14px;vertical-align:-2px;margin-right:6px;"></i> Pengaturan Akun</div>
    ${
      list.length < ACCOUNT_SWITCHER_MAX
        ? `<div class="acc-switch-menuitem" onclick="addAccountFlow()"><i class="ti ti-plus" style="font-size:14px;vertical-align:-2px;margin-right:6px;"></i> Tambah Akun</div>`
        : `<div style="padding:10px 14px;font-size:11px;color:var(--muted);text-align:center;">Maks 5 akun tersimpan</div>`
    }
  `;
}

export async function switchToAccount(uid: string): Promise<void> {
  const list = getSavedAccounts();
  const acc = list.find((a) => a.uid === uid);
  if (!acc) return;
  closeAccountSwitcher();
  callOasGlobal("showOpSpinner", "Mengganti akun...", acc.nama);
  try {
    const db = readDbAdapter();
    if (!db) throw new Error("Koneksi autentikasi belum siap.");
    const { error } = await db.auth.setSession({
      access_token: acc.access_token,
      refresh_token: acc.refresh_token,
    });
    if (error) throw error;
    window.location.reload();
  } catch (e) {
    callOasGlobal("hideOpSpinner");
    const msg = e instanceof Error ? e.message : String(e || "");
    callOasGlobal(
      "showAlert",
      "Sesi akun ini sudah kedaluwarsa, silakan login ulang.\n" + msg
    );
    setSavedAccounts(list.filter((a) => a.uid !== uid));
    renderAccountSwitcher();
  }
}

export async function addAccountFlow(): Promise<void> {
  closeAccountSwitcher();
  if (
    !window.confirm(
      "Kamu akan keluar sementara dari akun ini untuk login akun lain.\nAkun saat ini tetap tersimpan di daftar switch akun · lanjutkan?"
    )
  ) {
    return;
  }
  try {
    await readDbAdapter()?.auth.signOut({ scope: "local" });
  } catch {
    // ignore
  }
  window.location.reload();
}

export function removeAccountFromSwitcher(uid: string): void {
  setSavedAccounts(getSavedAccounts().filter((a) => a.uid !== uid));
  renderAccountSwitcher();
}

function pwCacheKey(uid: string): string {
  return "oas_pw_cache_" + uid;
}

export function cachePasswordLocally(uid: string, plaintext: string): void {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(pwCacheKey(uid), plaintext);
  } catch {
    // ignore
  }
}

export function getCachedPassword(uid: string): string | null {
  if (typeof window === "undefined" || !uid) return null;
  try {
    return localStorage.getItem(pwCacheKey(uid));
  } catch {
    return null;
  }
}
