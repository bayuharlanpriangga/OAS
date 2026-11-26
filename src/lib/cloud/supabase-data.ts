import {
  adalahPemilikBisnis,
  bacaParamOAuth,
  susunDaftarBisnis,
  type CompanyLike as AuditCompanyLike,
} from "@/lib/lainnya/audit-tim";
import { getDefaultAkuns } from "@/lib/master/chart-of-accounts";
import { escapeHtml, fmtRp } from "@/lib/shared/format";
import {
  callOasGlobal,
  getJurnalSumberAktif,
  getWin,
  readAfterLoginRunning,
  readAkuns,
  readCurrentCompany,
  readCurrentUser,
  readIsGuestMode,
  readJurnalCounter,
  readJurnalEntries,
  readMultiKartuStock,
  readPeriodeKunciSampai,
  writeAfterLoginRunning,
  writeAkuns,
  writeAuthReady,
  writeCurrentCompany,
  writeCurrentUser,
  writeIsGuestMode,
  writeJurnalCounter,
  writeJurnalEntries,
  writeKartuStockData,
  writeKartuStockIdCounter,
  writeMultiKartuStock,
  writePeriodeKunciSampai,
  type CompanyLike,
  type SupabaseUserLike,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";
import {
  PENDING_JOIN_KEY,
  auditLog,
  auditLogLogin,
  auditLogLogout,
  enforcePermissions,
  guardHanyaBaca,
  isAdmin,
  isReadOnly,
  loadOrgMembers,
  processJoinCode,
  resetOrgMembersState,
} from "./audit-permission";
import {
  cloudLoadFromCache,
  cloudLoadRecords,
  cloudResetRecordsState,
  cloudSyncRecords,
} from "./cloud-records";
import {
  SUPABASE_URL,
  getAuthStorage,
  getDB,
  getSupa,
  initDbAdapter,
} from "./db-adapter";
import {
  initLocalStorageFull,
  markDirty,
  saveToLocalStorage,
  setHasUnsavedChanges,
  showAutoSaveToast,
  updateSaveIndicator,
} from "./local-storage";
import { PROFIL_KEY, loadProfilToSidebar } from "./profil";

// ── UI CALLBACK REGISTRY (diisi oleh AuthCompanyModals.tsx) ─────────────

export interface AuthUiCallbacks {
  showAuthModal: () => void;
  hideAuthModal: () => void;
  showCompanyPickerScreen: (companies: CompanyLike[]) => void;
  hideCompanyPicker: () => void;
  showDeleteCompanyConfirm: (company: CompanyLike) => void;
}

let uiCallbacks: AuthUiCallbacks | null = null;
let companyPickerLoading = false;

export function registerAuthUiCallbacks(cbs: AuthUiCallbacks | null): void {
  uiCallbacks = cbs;
}

export function showAuthModal(): void {
  if (readCurrentUser()) {
    void showCompanyPicker();
    return;
  }
  uiCallbacks?.showAuthModal();
}

export function hideAuthModal(): void {
  uiCallbacks?.hideAuthModal();
}

export function hideCompanyPicker(): void {
  uiCallbacks?.hideCompanyPicker();
}

export function showCompanyPickerScreen(companies: CompanyLike[]): void {
  const chip = document.getElementById("user-company-chip");
  if (chip) chip.style.pointerEvents = "";

  // Update chip sementara HANYA jika belum ada bisnis aktif
  if (!readCurrentCompany()) {
    const user = readCurrentUser();
    const chipAvatar = document.getElementById("chip-avatar");
    const chipName = document.getElementById("chip-company-name");
    const chipSub = document.getElementById("chip-sub");
    if (chipAvatar) {
      chipAvatar.textContent =
        user?.email?.charAt(0)?.toUpperCase() || "?";
      chipAvatar.style.background = "var(--accent)";
      chipAvatar.style.color = "var(--accent-fg)";
    }
    if (chipName) chipName.textContent = "Pilih Bisnis";
    if (chipSub) chipSub.textContent = user?.email || "";
  }

  uiCallbacks?.showCompanyPickerScreen(companies);
}

// ── INIT SUPABASE ───────────────────────────────────────────────────────

export async function initSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  const db = getDB() || initDbAdapter();
  const win = getWin();

  const chipName = document.getElementById("chip-company-name");
  const chipSub = document.getElementById("chip-sub");
  if (chipName) chipName.textContent = "Menghubungkan...";
  if (chipSub) chipSub.textContent = "Memeriksa akun";

  if (!db) {
    enterGuestMode();
    return;
  }

  // Bersihkan refresh token yang corrupt/expired dari sesi lama
  try {
    const storage = getAuthStorage();
    const stored = storage.getItem("oas_oas_auth");
    if (stored) {
      const parsed = JSON.parse(stored) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (parsed && !parsed.access_token && parsed.refresh_token) {
        storage.removeItem("oas_oas_auth");
      }
    }
  } catch {
    // ignore
  }

  const oauthUrl = bacaParamOAuth(window.location.search, window.location.hash);
  const hasOAuthCode = oauthUrl.kode;
  const hasOAuthHash = oauthUrl.token;
  const hasOAuthParams = hasOAuthCode || hasOAuthHash;

  if (hasOAuthParams && win) {
    win.__oauthRedirect = true;
    win.__initialOAuthRedirect = true;
  }

  if (oauthUrl.error) {
    console.warn("[Auth] Redirect login berisi error:", oauthUrl.error);
    window.history.replaceState(
      null,
      "",
      window.location.pathname +
        (window.location.hash.includes("error") ? "" : window.location.hash)
    );
    setTimeout(() => {
      callOasGlobal(
        "showAlert",
        "Login Google kedaluwarsa atau gagal. Silakan login lagi dan selesaikan dalam satu browser/tab."
      );
    }, 800);
  }

  if (hasOAuthCode) {
    let gagalTukar = false;
    try {
      const { error } = await db.auth.exchangeCodeForSession(
        window.location.search
      );
      if (error) {
        gagalTukar = true;
        console.error("[Auth] exchangeCodeForSession error:", error.message);
      }
    } catch (e) {
      gagalTukar = true;
      console.error("[Auth] exchangeCodeForSession exception:", e);
    }
    if (gagalTukar && win) {
      win.__oauthRedirect = false;
      win.__initialOAuthRedirect = false;
      setTimeout(() => {
        callOasGlobal(
          "showAlert",
          "Login Google gagal diproses. Silakan login lagi."
        );
      }, 800);
    }
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.hash
    );
  }

  db.auth.onAuthStateChange((event, session) => {
    if (session) {
      callOasGlobal("saveCurrentAccountToSwitcher", session);
    }

    if (event === "SIGNED_IN") {
      if (readCurrentCompany()) {
        if (session?.user) writeCurrentUser(session.user);
        return;
      }
      writeIsGuestMode(false);
      if (win) win.__oauthRedirect = false;
      writeCurrentUser(session?.user ?? null);
      document.getElementById("guest-banner")?.remove();
      hideAuthModal();
      hideCompanyPicker();
      // KRITIS: Jangan await afterLogin() di dalam callback onAuthStateChange
      // (Supabase SDK menahan internal lock selama callback berjalan).
      setTimeout(() => void afterLogin(), 0);
      setTimeout(() => {
        auditLogLogin(session?.user?.email || "-");
      }, 800);
    } else if (event === "INITIAL_SESSION") {
      if (session?.user && !readCurrentCompany()) {
        writeIsGuestMode(false);
        if (win) win.__oauthRedirect = false;
        writeCurrentUser(session.user);
        document.getElementById("guest-banner")?.remove();
        hideAuthModal();
        setTimeout(() => void afterLogin(), 0);
      } else if (!session && !win?.__oauthRedirect) {
        if (!readCurrentUser()) enterGuestMode();
      }
    } else if (event === "TOKEN_REFRESHED") {
      if (session?.user) writeCurrentUser(session.user);
    } else if (event === "SIGNED_OUT") {
      if (readCurrentCompany()) return;
      auditLogLogout(readCurrentUser()?.email || "-");
      writeCurrentUser(null);
      writeCurrentCompany(null);
      writeIsGuestMode(true);
      writeAfterLoginRunning(false);
      enterGuestMode();
    }
  });

  writeAuthReady(true);

  const fallbackMs = hasOAuthParams || win?.__oauthRedirect ? 15000 : 2500;
  setTimeout(() => {
    if (
      !readCurrentUser() &&
      !readAfterLoginRunning() &&
      !win?.__oauthRedirect
    ) {
      enterGuestMode();
    }
  }, fallbackMs);
}

// ── GUEST MODE ──────────────────────────────────────────────────────────

export function enterGuestMode(): void {
  if (typeof window === "undefined") return;
  const win = getWin();
  if (
    win?.__oauthRedirect ||
    window.location.hash.includes("access_token") ||
    window.location.search.includes("code=")
  ) {
    return;
  }

  writeIsGuestMode(true);
  writeCurrentUser(null);
  writeCurrentCompany(null);
  writeAfterLoginRunning(false);
  resetOrgMembersState();

  hideAuthModal();
  hideCompanyPicker();

  initLocalStorageFull();
  loadProfilToSidebar();
  callOasGlobal("renderDashboard");
  setTimeout(() => {
    callOasGlobal("atInitOnLoad");
  }, 1500);

  requestAnimationFrame(() => {
    updateGuestChip();
    showGuestBanner();
  });
}

export function updateGuestChip(): void {
  if (typeof document === "undefined") return;
  const chipAvatar = document.getElementById("chip-avatar");
  const chipName = document.getElementById("chip-company-name");
  const chipSub = document.getElementById("chip-sub");
  const chip = document.getElementById("user-company-chip");
  if (chip) {
    chip.style.display = "flex";
    chip.style.pointerEvents = "";
    chip.onclick = () => showAuthModal();
    chip.title = "Login untuk simpan data ke cloud";
  }
  if (chipAvatar) {
    chipAvatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text);display:block;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    chipAvatar.style.background = "var(--surface2)";
    chipAvatar.style.border = "1px solid var(--border-strong)";
    chipAvatar.style.display = "flex";
    chipAvatar.style.alignItems = "center";
    chipAvatar.style.justifyContent = "center";
  }
  if (chipName) chipName.textContent = "Mode Tamu";
  if (chipSub) {
    chipSub.textContent = "Klik untuk login";
    chipSub.style.color = "var(--accent3)";
  }
}

export function showGuestBanner(): void {
  if (typeof document === "undefined") return;
  document.getElementById("guest-banner")?.remove();
  const banner = document.createElement("div");
  banner.id = "guest-banner";
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
      <span><b class="oas-ctx-highlight">Mode Tamu</b> Data hanya tersimpan di browser ini. <b>Login</b> untuk simpan ke cloud &amp; akses dari perangkat lain.</span>
      <button onclick="showAuthModal()" style="background:var(--accent);border:none;border-radius:6px;padding:5px 14px;font-weight:700;cursor:pointer;color:var(--accent-fg);font-size:12px;white-space:nowrap;flex-shrink:0;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px;margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Login / Daftar</button>
      <button onclick="document.getElementById('guest-banner')?.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px;margin-left:auto;flex-shrink:0;">✕</button>
    </div>`;
  banner.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:1px solid var(--border-strong);padding:10px 16px;z-index:5000;font-size:13px;";
  document.body.appendChild(banner);
}

// ── GUEST DATA MIGRATION ────────────────────────────────────────────────

export async function offerGuestDataMigration(): Promise<void> {
  const company = readCurrentCompany();
  const entries = readJurnalEntries();
  if (!company || !entries.length) return;
  const localEntries = entries.filter((j) => !j._id);
  if (!localEntries.length) return;

  const confirmFn = getWin()?.showCustomConfirmGeneral as
    | ((opts: Record<string, unknown>) => Promise<boolean>)
    | undefined;
  const doMigrate = confirmFn
    ? await confirmFn({
        icon: '<i class="ti ti-cloud-upload"></i>',
        iconColor: "var(--accent-tint)",
        iconBorder: "var(--border-strong)",
        title: "Pindahkan Data Tamu?",
        subtitle: `Kamu punya ${localEntries.length} jurnal dari mode tamu.`,
        rows: [
          {
            label: "Tujuan",
            value: `Bisnis "${company.name || ""}" di cloud`,
          },
        ],
        warning: null,
        btnLabel: "Ya, Pindahkan",
        btnGradient: "var(--accent)",
      })
    : window.confirm(
        `Pindahkan ${localEntries.length} jurnal dari mode tamu ke bisnis "${company.name || ""}" di cloud?`
      );

  if (doMigrate) {
    updateSaveIndicator("saving");
    for (const j of localEntries) {
      await saveJurnalToSupabase(j);
    }
    await saveAkunsToSupabase();
    updateSaveIndicator("saved");
    callOasGlobal(
      "showAlert",
      `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${localEntries.length} jurnal berhasil dipindahkan ke cloud!`
    );
  }
}

// ── AUTH ACTIONS ────────────────────────────────────────────────────────

export async function doGoogleLogin(): Promise<string | null> {
  const db = getDB() || initDbAdapter();
  if (!db) return "Koneksi Supabase tidak tersedia.";
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await db.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      if (
        error.message &&
        (error.message.includes("provider") ||
          error.message.includes("not enabled") ||
          error.message.includes("OAuth"))
      ) {
        return "Google Login belum diaktifkan. Hubungi admin untuk setup Google OAuth di Supabase Dashboard → Authentication → Providers → Google.";
      }
      return error.message || "Gagal login Google";
    }
    return null;
  } catch (e) {
    console.error("Google login error:", e);
    return "Gagal menghubungi server. Pastikan koneksi internet aktif.";
  }
}

export async function doLogout(): Promise<void> {
  callOasGlobal("showOpSpinner", "Keluar dari akun...", "Membersihkan sesi");
  const db = getDB();
  try {
    if (db) await db.auth.signOut({ scope: "global" });
  } catch {
    try {
      if (db) await db.auth.signOut();
    } catch {
      // ignore
    }
  }
  window.location.reload();
}

export function handleChipClick(): void {
  const win = getWin();
  if (readAfterLoginRunning()) return;
  if (win?.__oauthRedirect || win?.__initialOAuthRedirect) return;
  if (!readCurrentUser()) {
    showAuthModal();
    return;
  }
  void showCompanyPicker();
}

// ── AFTER LOGIN & COMPANIES ─────────────────────────────────────────────

export async function getMyCompanies(): Promise<CompanyLike[]> {
  const user = readCurrentUser();
  const supa = getSupa();
  if (!user || !supa) throw new Error("Belum login");

  const { data: owned, error: ownedErr } = await supa
    .from("companies")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at");

  if (ownedErr) {
    console.error("getMyCompanies error:", ownedErr);
    throw new Error(ownedErr.message || "Gagal mengambil data bisnis");
  }

  let memberships: Array<{
    company_id: string;
    role?: string;
    status?: string;
  }> = [];
  let memberCompanies: AuditCompanyLike[] = [];

  try {
    try {
      await supa.rpc?.("klaim_undangan");
    } catch {
      // belum tersedia / tidak ada undangan
    }
    const { data: ms, error: msErr } = await supa
      .from("org_members")
      .select("company_id, role, status")
      .eq("user_id", user.id);
    if (msErr) throw msErr;
    memberships = Array.isArray(ms)
      ? (ms as Array<{ company_id: string; role?: string; status?: string }>)
      : [];
    const ids = memberships
      .filter((m) => m.status === "active")
      .map((m) => m.company_id);
    if (ids.length) {
      const { data: mcos, error: mcErr } = await supa
        .from("companies")
        .select("*")
        .in("id", ids);
      if (mcErr) throw mcErr;
      memberCompanies = Array.isArray(mcos) ? (mcos as AuditCompanyLike[]) : [];
    }
  } catch (e) {
    console.warn("[getMyCompanies] bisnis anggota tidak termuat:", e);
  }

  return susunDaftarBisnis(
    (owned as AuditCompanyLike[] | null) ?? [],
    memberships,
    memberCompanies,
    user.id
  ) as CompanyLike[];
}

export async function afterLogin(): Promise<void> {
  if (readAfterLoginRunning()) return;
  writeAfterLoginRunning(true);

  const pendingJoin =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(PENDING_JOIN_KEY)
      : null;
  if (pendingJoin) sessionStorage.removeItem(PENDING_JOIN_KEY);

  const win = getWin();
  writeIsGuestMode(false);
  if (win) win.__oauthRedirect = false;
  hideAuthModal();
  document.getElementById("guest-banner")?.remove();

  const user = readCurrentUser();
  const chipAvatar = document.getElementById("chip-avatar");
  const chipName = document.getElementById("chip-company-name");
  const chipSub = document.getElementById("chip-sub");
  const chip = document.getElementById("user-company-chip");

  if (chip) {
    chip.style.display = "flex";
    chip.onclick = null;
    chip.style.pointerEvents = "none";
    chip.title = "Memuat...";
  }
  if (chipAvatar && user) {
    const photoURL =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      localStorage.getItem("oas_profile_photo");
    const initial = (
      user.user_metadata?.full_name ||
      user.email ||
      "?"
    )
      .charAt(0)
      .toUpperCase();
    if (photoURL) {
      chipAvatar.innerHTML = `<img src="${escapeHtml(photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      chipAvatar.style.background = "transparent";
    } else {
      chipAvatar.textContent = initial;
      chipAvatar.style.background = "var(--accent)";
      chipAvatar.style.color = "var(--accent-fg)";
    }
  }
  if (chipName) chipName.textContent = "Memuat bisnis...";
  if (chipSub) chipSub.textContent = user?.email || "";

  try {
    if (!user?.id) throw new Error("User ID tidak tersedia");

    let list: CompanyLike[] = [];
    try {
      list = await getMyCompanies();
      try {
        localStorage.setItem("oas_companies_" + user.id, JSON.stringify(list));
      } catch {
        // ignore
      }
    } catch (getErr) {
      console.warn("[afterLogin] getMyCompanies failed, fallback:", getErr);
      try {
        const supa = getSupa();
        if (!supa) throw getErr;
        const { data: owned, error: compErr } = await supa
          .from("companies")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at");
        if (compErr) {
          const msg = compErr.message || "";
          if (
            msg.includes("relation") ||
            msg.includes("does not exist") ||
            compErr.code === "42P01"
          ) {
            throw new Error(
              'Tabel "companies" belum dibuat. Buka Setup Supabase.'
            );
          }
          if (
            compErr.code === "42501" ||
            msg.includes("policy") ||
            msg.includes("permission")
          ) {
            throw new Error("RLS Policy belum diatur. Buka Setup Supabase.");
          }
          throw new Error(`Query gagal: ${msg} (code: ${compErr.code || ""})`);
        }
        list = Array.isArray(owned) ? (owned as CompanyLike[]) : [];
        try {
          localStorage.setItem(
            "oas_companies_" + user.id,
            JSON.stringify(list)
          );
        } catch {
          // ignore
        }
      } catch (fallbackErr) {
        const cachedListStr = localStorage.getItem("oas_companies_" + user.id);
        const lastCompStr = localStorage.getItem(
          "oas_active_company_" + user.id
        );
        if (cachedListStr) {
          try {
            list = JSON.parse(cachedListStr) || [];
          } catch {
            // ignore
          }
        }
        if ((!list || list.length === 0) && lastCompStr) {
          try {
            const lastComp = JSON.parse(lastCompStr) as CompanyLike;
            if (lastComp?.id) list = [lastComp];
          } catch {
            // ignore
          }
        }
        if (!list || list.length === 0) {
          throw fallbackErr;
        }
      }
    }

    if (list.length === 0) {
      showCompanyPickerScreen(list);
    } else if (list.length === 1) {
      await selectCompany(list[0]);
      updateUserChip();
      await offerGuestDataMigration();
    } else {
      const lastCompStr = localStorage.getItem("oas_active_company_" + user.id);
      let lastComp: CompanyLike | null = null;
      if (lastCompStr) {
        try {
          const parsed = JSON.parse(lastCompStr) as CompanyLike;
          lastComp = list.find((c) => c && c.id === parsed.id) || null;
        } catch {
          // ignore
        }
      }
      if (lastComp) {
        await selectCompany(lastComp);
        updateUserChip();
      } else {
        showCompanyPickerScreen(list);
      }
    }

    // Proses pending join code & pastikan RBAC diterapkan
    setTimeout(async () => {
      if (pendingJoin && readCurrentUser()) {
        await processJoinCode(pendingJoin);
      }
      if (readCurrentCompany()) {
        await loadOrgMembers();
        enforcePermissions();
        const navBtn = document.getElementById("nav-user-mgmt");
        if (navBtn) navBtn.style.display = isAdmin() ? "" : "none";
      }
    }, 600);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[afterLogin] ERROR:", msg, e);
    if (chip) chip.style.pointerEvents = "";
    if (chipName) {
      chipName.innerHTML =
        '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Gagal memuat';
    }
    if (chipSub) chipSub.textContent = msg || "Cek console";
    callOasGlobal("showAlert", "Gagal memuat data bisnis: " + msg);
    enterGuestMode();
  } finally {
    writeAfterLoginRunning(false);
    if (win) win.__initialOAuthRedirect = false;
  }
}

export async function showCompanyPicker(): Promise<void> {
  if (!readCurrentUser()) {
    showAuthModal();
    return;
  }
  if (companyPickerLoading) return;
  companyPickerLoading = true;
  const chip = document.getElementById("user-company-chip");
  if (chip) chip.style.opacity = "0.6";
  try {
    const companies = await getMyCompanies();
    showCompanyPickerScreen(companies);
  } catch (e) {
    console.error("showCompanyPicker error:", e);
    callOasGlobal("showAlert", "Gagal memuat daftar bisnis. Coba lagi.");
  } finally {
    companyPickerLoading = false;
    if (chip) chip.style.opacity = "1";
  }
}

export async function createCompanyRecord(
  name: string,
  type: string
): Promise<CompanyLike | null> {
  const user = readCurrentUser();
  const db = getDB();
  if (!user || !db) {
    callOasGlobal("showAlert", "Sesi login habis. Silakan login ulang.");
    return null;
  }

  const { data, error } = await db
    .table("companies")
    .insert({
      user_id: user.id,
      name,
      type,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    const msg = error.message || JSON.stringify(error);
    if (
      msg.includes("relation") ||
      msg.includes("does not exist") ||
      msg.includes("42P01")
    ) {
      callOasGlobal(
        "showAlert",
        'Tabel "companies" belum ada di Supabase.\n\nSilakan buka menu Setup Supabase dan jalankan SQL schema-nya dulu di Supabase Dashboard → SQL Editor.'
      );
      showSupabaseSetup();
      return null;
    }
    if (
      msg.includes("row-level") ||
      msg.includes("policy") ||
      msg.includes("42501") ||
      msg.includes("permission")
    ) {
      callOasGlobal(
        "showAlert",
        'Akses ditolak Supabase (RLS).\n\nPastikan policy "Users can manage own companies" sudah dibuat di SQL Editor Supabase.'
      );
      showSupabaseSetup();
      return null;
    }
    callOasGlobal("showAlert", "Gagal membuat bisnis:\n" + msg);
    return null;
  }

  const created = data as CompanyLike;
  await selectCompany(created);
  callOasGlobal("checkShowOnboarding");
  return created;
}

export async function deleteCompanyRecord(
  company: CompanyLike
): Promise<boolean> {
  const user = readCurrentUser();
  const db = getDB();
  if (!user || !db) return false;
  if (!adalahPemilikBisnis(company as AuditCompanyLike, user.id)) {
    callOasGlobal("showAlert", "Hanya pemilik yang bisa menghapus bisnis.");
    return false;
  }

  await db.table("jurnal_entries").delete().eq("company_id", company.id);
  const { error } = await db
    .table("companies")
    .delete()
    .eq("id", company.id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message || "Gagal menghapus bisnis");

  if (readCurrentCompany()?.id === company.id) {
    writeCurrentCompany(null);
  }
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bisnis "${escapeHtml(
      company.name || ""
    )}" berhasil dihapus.`
  );
  return true;
}

export function deleteCompany(company: CompanyLike): void {
  uiCallbacks?.showDeleteCompanyConfirm(company);
}

export async function selectCompany(company: CompanyLike): Promise<void> {
  writeCurrentCompany(company);
  writeIsGuestMode(false);
  hideCompanyPicker();

  const user = readCurrentUser();
  try {
    if (user?.id && company) {
      localStorage.setItem(
        "oas_active_company_" + user.id,
        JSON.stringify(company)
      );
    }
  } catch {
    // ignore
  }

  // Reset semua data agar tidak bocor ke bisnis baru
  writeMultiKartuStock({});
  writeJurnalEntries([]);
  cloudResetRecordsState();
  writePeriodeKunciSampai("");

  const win = getWin();
  if (win) {
    win.activeKartuStockId = null;
    win.activeKategoriId = null;
  }
  resetOrgMembersState();

  updateUserChip();

  await loadDataFromSupabase();

  await loadOrgMembers();
  enforcePermissions();
  const navBtn = document.getElementById("nav-user-mgmt");
  if (navBtn) navBtn.style.display = isAdmin() ? "" : "none";

  updateUserChip();
  callOasGlobal("renderDashboard");
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Beralih ke: ${escapeHtml(
      company.name || ""
    )}`
  );
}

export function updateUserChip(): void {
  if (typeof document === "undefined") return;
  const company = readCurrentCompany();
  const user: SupabaseUserLike | null = readCurrentUser();
  if (!company || !user) return;

  const chip = document.getElementById("user-company-chip");
  const chipAvatar = document.getElementById("chip-avatar");
  const chipName = document.getElementById("chip-company-name");
  const chipSub = document.getElementById("chip-sub");
  const bisnisAktif = document.getElementById("sidebar-bisnis-aktif");

  if (chip) {
    chip.style.display = "flex";
    chip.style.pointerEvents = "";
    chip.onclick = () => callOasGlobal("toggleAccountSwitcher");
    chip.title = "Ganti akun / riwayat login";
  }

  if (chipAvatar) {
    const photoURL =
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      localStorage.getItem("oas_profile_photo");
    const initial = (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "?"
    )
      .charAt(0)
      .toUpperCase();
    if (photoURL) {
      chipAvatar.innerHTML = `<img src="${escapeHtml(photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.innerHTML='${initial}'">`;
      chipAvatar.style.background = "transparent";
    } else {
      chipAvatar.textContent = initial;
      chipAvatar.style.background = "var(--accent)";
      chipAvatar.style.color = "var(--accent-fg)";
    }
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "-";
  if (chipName) {
    chipName.textContent =
      displayName.length > 22 ? displayName.slice(0, 20) + "…" : displayName;
  }
  if (chipSub) {
    const email = user.email || "";
    chipSub.textContent =
      email.length > 26 ? email.slice(0, 24) + "…" : email;
    chipSub.style.color = "var(--muted)";
  }
  if (bisnisAktif) bisnisAktif.textContent = company.name || "";
}

// ── SUPABASE DATA LAYER ─────────────────────────────────────────────────

function loadCloudGagal(err: unknown, companyId: string): void {
  console.warn("[loadDataFromSupabase] gagal, data cloud tidak dimuat:", err);
  const company = readCurrentCompany();
  if (company?.id === companyId) {
    cloudLoadFromCache(companyId);
  }
  callOasGlobal("hideOpSpinner");
  callOasGlobal(
    "showAlert",
    "Gagal memuat data bisnis dari cloud (koneksi bermasalah). Muat ulang halaman saat koneksi sudah ada. Tidak ada data yang diubah."
  );
}

export async function loadDataFromSupabase(): Promise<void> {
  const company = readCurrentCompany();
  const supa = getSupa();
  if (!company?.id || !supa) return;

  callOasGlobal("showOpSpinner", "Memuat data bisnis...", "Mengambil dari cloud");
  const companyId = company.id;

  const { data: jurnalData, error: jurnalErr } = await supa
    .from("jurnal_entries")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at");
  if (jurnalErr) {
    loadCloudGagal(jurnalErr, companyId);
    return;
  }

  const jList = Array.isArray(jurnalData)
    ? (jurnalData as Array<Record<string, unknown>>)
    : [];

  if (jList.length > 0) {
    const mapped: JurnalEntry[] = jList.map((r) => ({
      ...(r.meta && typeof r.meta === "object"
        ? (r.meta as Record<string, unknown>)
        : {}),
      no: String(r.no || ""),
      tanggal: String(r.tanggal || ""),
      ket: String(r.ket || ""),
      jenis: String(r.jenis || "Manual"),
      lines: Array.isArray(r.lines) ? (r.lines as JurnalEntry["lines"]) : [],
      attachments: Array.isArray(r.attachments)
        ? (r.attachments as JurnalEntry["attachments"])
        : [],
      _id: String(r.id || ""),
    }));
    writeJurnalEntries(mapped);
    const nums = mapped.map(
      (j) => parseInt(String(j.no || "").replace("JRN-", ""), 10) || 0
    );
    writeJurnalCounter(Math.max(0, ...nums) + 1);
  } else {
    writeJurnalEntries([]);
    writeJurnalCounter(1);
  }

  const { data: akunData, error: akunErr } = await supa
    .from("akuns")
    .select("*")
    .eq("company_id", companyId)
    .order("kode");
  if (akunErr) {
    loadCloudGagal(akunErr, companyId);
    return;
  }

  const aList = Array.isArray(akunData)
    ? (akunData as Array<Record<string, unknown>>)
    : [];

  if (aList.length > 0) {
    const defKat: Record<string, string> = {};
    getDefaultAkuns().forEach((d) => {
      defKat[d.kode] = d.kat;
    });
    writeAkuns(
      aList.map((r) => ({
        kode: String(r.kode || ""),
        nama: String(r.nama || ""),
        tipe: String(r.tipe || "Aset") as Akun["tipe"],
        normal: String(r.normal || "Debit") as Akun["normal"],
        kat: String(r.kat || defKat[String(r.kode || "")] || ""),
        _id: r.id ? String(r.id) : undefined,
      }))
    );
  } else {
    writeAkuns(getDefaultAkuns());
    await saveAkunsToSupabase();
  }

  const { data: profilData } = await supa
    .from("company_profiles")
    .select("*")
    .eq("company_id", companyId)
    .single();

  if (profilData && typeof profilData === "object") {
    const cloudData =
      ((profilData as Record<string, unknown>).data as Record<
        string,
        unknown
      >) || {};
    const profilObj =
      (cloudData._profil as Record<string, unknown> | undefined) || cloudData;
    if (profilObj && (profilObj.nama || profilObj.jenis)) {
      try {
        localStorage.setItem(PROFIL_KEY, JSON.stringify(profilObj));
      } catch {
        // ignore
      }
    }
    loadKartuStockFromData(cloudData);
    writePeriodeKunciSampai(
      typeof cloudData._periode_kunci === "string"
        ? cloudData._periode_kunci
        : ""
    );
  }

  await cloudLoadRecords();

  updateSaveIndicator("saved");
  callOasGlobal("hideOpSpinner");
}

// ── JURNAL CLOUD CRUD ───────────────────────────────────────────────────

const JURNAL_META_KEYS = ["sumber", "_ppnTarif", "_ksId"] as const;
let jurnalMetaDidukung = true;

function jurnalMetaDari(entry: JurnalEntry): Record<string, unknown> {
  const m: Record<string, unknown> = {};
  const rec = entry as unknown as Record<string, unknown>;
  JURNAL_META_KEYS.forEach((k) => {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== "") {
      m[k] = rec[k];
    }
  });
  return m;
}

function errKolomMeta(error: {
  message?: string;
  details?: string;
  hint?: string;
}): boolean {
  return /meta/i.test(
    [error.message, error.details, error.hint].filter(Boolean).join(" ")
  );
}

export async function saveJurnalToSupabase(
  entry: JurnalEntry
): Promise<boolean> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !db) return false;
  if (guardHanyaBaca()) return false;

  const payload: Record<string, unknown> = {
    company_id: company.id,
    no: entry.no,
    tanggal: entry.tanggal,
    ket: entry.ket,
    jenis: entry.jenis,
    lines: entry.lines,
    attachments: entry.attachments || [],
    created_at: new Date().toISOString(),
  };
  const meta = jurnalMetaDari(entry);
  if (jurnalMetaDidukung && Object.keys(meta).length) payload.meta = meta;

  let res = await db.table("jurnal_entries").insert(payload).select().single();
  if (res.error && payload.meta && errKolomMeta(res.error)) {
    jurnalMetaDidukung = false;
    delete payload.meta;
    res = await db.table("jurnal_entries").insert(payload).select().single();
  }
  if (!res.error && res.data && typeof res.data === "object") {
    const id = (res.data as { id?: string }).id;
    if (id) entry._id = id;
  }
  return !res.error;
}

export async function updateJurnalInSupabase(
  entry: JurnalEntry
): Promise<void> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !entry._id || !db) return;
  if (guardHanyaBaca()) return;

  const payload: Record<string, unknown> = {
    tanggal: entry.tanggal,
    ket: entry.ket,
    jenis: entry.jenis,
    lines: entry.lines,
    attachments: entry.attachments || [],
  };
  const meta = jurnalMetaDari(entry);
  if (jurnalMetaDidukung && Object.keys(meta).length) payload.meta = meta;

  const res = await db
    .table("jurnal_entries")
    .update(payload)
    .eq("id", entry._id);
  if (res.error && payload.meta && errKolomMeta(res.error)) {
    jurnalMetaDidukung = false;
    delete payload.meta;
    await db.table("jurnal_entries").update(payload).eq("id", entry._id);
  }
}

export async function deleteJurnalFromSupabase(
  entry: JurnalEntry
): Promise<void> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !entry._id || !db) return;
  if (guardHanyaBaca()) return;
  callOasGlobal("showOpSpinner", "Menghapus jurnal...", "Sinkronisasi ke cloud");
  try {
    await db.table("jurnal_entries").delete().eq("id", entry._id);
  } finally {
    callOasGlobal("hideOpSpinner");
  }
}

export async function saveAkunsToSupabase(): Promise<void> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !db) return;
  if (guardHanyaBaca()) return;

  const payload = readAkuns().map((a) => ({
    company_id: company.id,
    kode: a.kode,
    nama: a.nama,
    tipe: a.tipe,
    kat: a.kat || "",
    normal: a.normal,
  }));
  await db.table("akuns").upsert(payload, { onConflict: "company_id,kode" });
}

export async function saveProfilToSupabase(
  profilData: Record<string, unknown>
): Promise<void> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !db) return;
  if (guardHanyaBaca()) return;
  try {
    const existingRes = await db
      .table("company_profiles")
      .select("data")
      .eq("company_id", company.id)
      .single();
    const existingData =
      existingRes.data &&
      typeof (existingRes.data as { data?: unknown }).data === "object" &&
      (existingRes.data as { data?: unknown }).data !== null
        ? ((existingRes.data as { data: Record<string, unknown> }).data)
        : {};
    await db.table("company_profiles").upsert(
      {
        company_id: company.id,
        data: { ...existingData, _profil: profilData },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );
  } catch (e) {
    console.warn("saveProfilToSupabase error:", e);
  }
}

export async function savePeriodeKunciToCloud(): Promise<boolean> {
  markDirty();
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !db) return true;
  if (guardHanyaBaca()) return false;
  try {
    const existingRes = await db
      .table("company_profiles")
      .select("data")
      .eq("company_id", company.id)
      .single();
    const existingData =
      existingRes.data &&
      typeof (existingRes.data as { data?: unknown }).data === "object" &&
      (existingRes.data as { data?: unknown }).data !== null
        ? ((existingRes.data as { data: Record<string, unknown> }).data)
        : {};
    const { error } = await db.table("company_profiles").upsert(
      {
        company_id: company.id,
        data: {
          ...existingData,
          _periode_kunci: readPeriodeKunciSampai() || "",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );
    return !error;
  } catch (e) {
    console.warn("savePeriodeKunciToCloud error:", e);
    return false;
  }
}

export async function saveKartuStockToCloud(): Promise<boolean> {
  if (guardHanyaBaca()) return false;
  const company = readCurrentCompany();
  const db = getDB();
  const mks = readMultiKartuStock();
  if (!company?.id || !db) {
    try {
      localStorage.setItem("oas_mks_guest", JSON.stringify(mks));
    } catch {
      // ignore
    }
    return true;
  }
  try {
    const existingRes = await db
      .table("company_profiles")
      .select("data")
      .eq("company_id", company.id)
      .single();
    const existingData =
      existingRes.data &&
      typeof (existingRes.data as { data?: unknown }).data === "object" &&
      (existingRes.data as { data?: unknown }).data !== null
        ? ((existingRes.data as { data: Record<string, unknown> }).data)
        : {};
    await db.table("company_profiles").upsert(
      {
        company_id: company.id,
        data: { ...existingData, _multi_kartu_stock: mks },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" }
    );
    return true;
  } catch (e) {
    console.warn("saveKartuStockToCloud error:", e);
    try {
      localStorage.setItem("oas_mks_" + company.id, JSON.stringify(mks));
    } catch {
      // ignore
    }
    return false;
  }
}

export function loadKartuStockFromData(
  profileData: Record<string, unknown> | null | undefined
): void {
  const company = readCurrentCompany();
  let mks: Record<string, unknown> = readMultiKartuStock() as Record<
    string,
    unknown
  >;
  let ksFlat: Record<string, unknown[]> = {
    fifo: [],
    lifo: [],
    wa: [],
    mwa: [],
  };

  if (
    profileData &&
    profileData._multi_kartu_stock &&
    typeof profileData._multi_kartu_stock === "object" &&
    Object.keys(profileData._multi_kartu_stock as Record<string, unknown>)
      .length > 0
  ) {
    try {
      mks = JSON.parse(JSON.stringify(profileData._multi_kartu_stock));
      writeMultiKartuStock(mks as ReturnType<typeof readMultiKartuStock>);
      const key = "oas_mks_" + (company?.id || "guest");
      localStorage.setItem(key, JSON.stringify(mks));
    } catch {
      // ignore
    }
  } else if (
    profileData &&
    profileData._kartu_stock &&
    typeof profileData._kartu_stock === "object"
  ) {
    const ks = profileData._kartu_stock as Record<string, unknown[]>;
    ksFlat = {
      fifo: ks.fifo || [],
      lifo: ks.lifo || [],
      wa: ks.wa || [],
      mwa: ks.mwa || [],
    };
    writeKartuStockData(ksFlat as never);
  } else {
    try {
      const keyMks = "oas_mks_" + (company?.id || "guest");
      const storedMks = localStorage.getItem(keyMks);
      if (storedMks) {
        mks = JSON.parse(storedMks);
        writeMultiKartuStock(mks as ReturnType<typeof readMultiKartuStock>);
      } else {
        const key = "oas_kartu_stock_v1_" + (company?.id || "guest");
        const stored = localStorage.getItem(key);
        if (stored) {
          ksFlat = JSON.parse(stored);
          writeKartuStockData(ksFlat as never);
        }
      }
    } catch {
      // ignore
    }
  }

  let maxId = 0;
  Object.values(mks || {}).forEach((card) => {
    const katObj = (card as { kategori?: Record<string, unknown> })?.kategori;
    Object.values(katObj || {}).forEach((kat) => {
      const dataObj = (kat as { data?: Record<string, Array<{ id?: number }>> })
        ?.data;
      Object.values(dataObj || {}).forEach((arr) => {
        (arr || []).forEach((e) => {
          if ((e.id || 0) > maxId) maxId = e.id || 0;
        });
      });
    });
  });
  Object.values(ksFlat || {}).forEach((arr) => {
    ((arr as Array<{ id?: number }>) || []).forEach((e) => {
      if ((e.id || 0) > maxId) maxId = e.id || 0;
    });
  });
  writeKartuStockIdCounter(maxId + 1);
  callOasGlobal("initMultiKartuStock");
  callOasGlobal("renderKartuStock");
}

export async function saveAttachmentToSupabase(
  jurnalEntry: JurnalEntry,
  attachments: unknown[]
): Promise<void> {
  const company = readCurrentCompany();
  const db = getDB();
  if (!company?.id || !jurnalEntry._id || !db) return;
  if (guardHanyaBaca()) return;
  await db
    .table("jurnal_entries")
    .update({ attachments })
    .eq("id", jurnalEntry._id);
}

// ── CORE WRITE HOOKS: saveToStorage, manualSave, addJurnal, postJurnalLegacy ─

export async function saveToStorage(showToast = true): Promise<boolean> {
  const company = readCurrentCompany();
  if (!company) {
    return saveToLocalStorage(showToast);
  }
  if (isReadOnly()) {
    setHasUnsavedChanges(false);
    return true;
  }

  const overlay = document.getElementById("op-spinner-overlay");
  const spinnerAlreadyActive =
    !!overlay && overlay.classList.contains("active");
  if (!spinnerAlreadyActive) {
    callOasGlobal("showOpSpinner", "Menyimpan data...", "Mengunggah ke cloud");
  }

  try {
    const entries = readJurnalEntries();
    for (const j of entries) {
      if (!j._id) {
        await saveJurnalToSupabase(j);
      }
    }
    await saveAkunsToSupabase();
    const recOk = await cloudSyncRecords();
    if (!recOk) {
      if (!spinnerAlreadyActive) callOasGlobal("hideOpSpinner");
      updateSaveIndicator("error");
      showAutoSaveToast(
        '<i class="ti ti-alert-triangle" style="color:var(--accent3);margin-right:4px;"></i> Invoice/kontak/aset/produk belum tersimpan ke cloud',
        false
      );
      return false;
    }

    setHasUnsavedChanges(false);
    updateSaveIndicator("saved");
    if (showToast) {
      showAutoSaveToast(
        '<i class="ti ti-cloud-check" style="margin-right:4px;"></i> Tersimpan ke cloud!',
        false
      );
    } else {
      showAutoSaveToast(
        '<i class="ti ti-cloud-check" style="margin-right:4px;"></i> Auto-saved',
        true
      );
    }
    if (!spinnerAlreadyActive) callOasGlobal("hideOpSpinner");
    return true;
  } catch (e) {
    if (!spinnerAlreadyActive) callOasGlobal("hideOpSpinner");
    updateSaveIndicator("error");
    console.error("Supabase save error:", e);
    return false;
  }
}

export async function manualSave(): Promise<void> {
  const company = readCurrentCompany();
  if (!company || readIsGuestMode()) {
    const win = getWin();
    if (win) win._opSpinnerDepth = 0;
    callOasGlobal("showOpSpinner", "Menyimpan...", "Menyimpan ke penyimpanan lokal");
    const ok = saveToLocalStorage(true);
    if (ok) {
      callOasGlobal(
        "showAlert",
        '<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data berhasil disimpan!'
      );
      callOasGlobal("renderStorageSlots");
    }
    setTimeout(() => {
      if (win) win._opSpinnerDepth = 1;
      callOasGlobal("hideOpSpinner");
    }, 500);
    return;
  }

  callOasGlobal(
    "showOpSpinner",
    "Menyimpan ke cloud...",
    "Mohon tunggu sebentar"
  );
  updateSaveIndicator("saving");
  try {
    await saveToStorage(false);
    callOasGlobal("hideOpSpinner");
    updateSaveIndicator("saved");
    callOasGlobal(
      "showAlert",
      '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data berhasil disimpan ke cloud!'
    );
    callOasGlobal("renderStorageSlots");
  } catch (e) {
    callOasGlobal("hideOpSpinner");
    updateSaveIndicator("error");
    callOasGlobal(
      "showAlert",
      "Gagal menyimpan: " + (e instanceof Error ? e.message : String(e))
    );
  }
}

function createPeriodeTerkunciError(msg: string): Error {
  const win = getWin();
  const Ctor = win?.PeriodeTerkunciError as
    | (new (message: string) => Error)
    | undefined;
  if (typeof Ctor === "function") return new Ctor(msg);
  const err = new Error(msg);
  err.name = "PeriodeTerkunciError";
  return err;
}

export function addJurnal(
  entry: JurnalEntry,
  opsi?: { abaikanKunci?: boolean }
): JurnalEntry {
  const isTerkunci = callOasGlobal("isPeriodeTerkunci", entry.tanggal);
  if (!(opsi && opsi.abaikanKunci) && isTerkunci) {
    callOasGlobal("guardPeriode", entry.tanggal, "diposting");
    throw createPeriodeTerkunciError(
      `Periode terkunci sampai ${readPeriodeKunciSampai()}: ${entry.tanggal}`
    );
  }
  if (guardHanyaBaca("Jurnal")) {
    throw new Error("Viewer hanya bisa membaca data bisnis ini");
  }

  const nextCounter = readJurnalCounter();
  entry.no = "JRN-" + String(nextCounter).padStart(3, "0");
  writeJurnalCounter(nextCounter + 1);

  const sumberAktif = getJurnalSumberAktif();
  if (sumberAktif && !entry.sumber) entry.sumber = sumberAktif;

  const entries = readJurnalEntries();
  entries.push(entry);

  if (readCurrentCompany()) {
    saveJurnalToSupabase(entry).catch((e) =>
      console.warn("Auto-save error:", e)
    );
  }

  markDirty();

  try {
    const total = (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
    auditLog(
      "create",
      "jurnal",
      `Jurnal ${entry.jenis || "Manual"}: ${
        entry.ket || entry.keterangan || "-"
      } · ${fmtRp(total)}`,
      { ref: entry.no || entry.id || "", debit: total }
    );
  } catch {
    // ignore
  }

  return entry;
}

export function postJurnalLegacy(entry: JurnalEntry | null): JurnalEntry | null {
  if (!entry) return null;
  if (!entry.ket) entry.ket = entry.keterangan || "";
  if (!entry.jenis) entry.jenis = "Manual";
  if (entry.no && !entry.kodeRef) entry.kodeRef = entry.no;
  try {
    return addJurnal(entry);
  } catch (e) {
    const win = getWin();
    const Ctor = win?.PeriodeTerkunciError as
      | (new (message: string) => Error)
      | undefined;
    if (
      (Ctor && e instanceof Ctor) ||
      (e instanceof Error && e.name === "PeriodeTerkunciError")
    ) {
      return null;
    }
    throw e;
  }
}

// ── HELPERS: INPUT SANITIZER, DIAGNOSA & SETUP GUIDES ───────────────────

export function blockNonNumeric(e: KeyboardEvent): void {
  const allowed = [
    "Backspace",
    "Delete",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
    "Enter",
    "Home",
    "End",
  ];
  if (allowed.includes(e.key)) return;
  if (
    (e.ctrlKey || e.metaKey) &&
    ["a", "c", "v", "x"].includes(e.key.toLowerCase())
  ) {
    return;
  }
  const target = e.target as HTMLInputElement | null;
  if (e.key === "." && target && !target.value.includes(".")) return;
  if (
    e.key === "-" &&
    target &&
    target.selectionStart === 0 &&
    !target.value.includes("-")
  ) {
    return;
  }
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

export function sanitizePaste(
  e: ClipboardEvent,
  el: HTMLInputElement | null
): void {
  e.preventDefault();
  if (!el) return;
  const text = e.clipboardData?.getData("text") || "";
  const clean = text.replace(/[^0-9.-]/g, "");
  const num = parseFloat(clean);
  if (!Number.isNaN(num)) {
    el.value = String(num);
    el.dispatchEvent(new Event("input"));
  }
}

export async function diagnosSupabase(): Promise<void> {
  const db = getDB();
  let result = "<b>Diagnosa Supabase:</b>\n\n";
  try {
    if (!db) {
      result += "Adapter Supabase tidak aktif\n";
    } else {
      const {
        data: { session },
        error: sessErr,
      } = await db.auth.getSession();
      result += session
        ? `<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Session aktif (${escapeHtml(
            session.user?.email || ""
          )})\n`
        : "Tidak ada session aktif\n";
      if (sessErr) {
        result += `<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Session error: ${sessErr.message || ""}\n`;
      }

      const { error } = await db.table("companies").select("count").limit(1);
      if (error) {
        const msg = error.message || "";
        if (
          msg.includes("relation") ||
          msg.includes("does not exist") ||
          error.code === "42P01"
        ) {
          result +=
            'Tabel "companies" BELUM DIBUAT\n   → Jalankan SQL schema di Supabase Dashboard\n';
        } else if (
          error.code === "42501" ||
          msg.includes("permission") ||
          msg.includes("policy")
        ) {
          result +=
            "RLS Policy BELUM DIBUAT\n   → Tambahkan policy di Supabase Dashboard\n";
        } else {
          result += `Error tabel: ${msg} (code: ${error.code || ""})\n`;
        }
      } else {
        result +=
          '<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tabel "companies" ada dan bisa diakses\n';
      }
    }
  } catch (e) {
    result += `Exception: ${e instanceof Error ? e.message : String(e)}\n`;
  }

  result += `\nURL: <span style="word-break:break-all;">${escapeHtml(
    SUPABASE_URL
  )}</span>\n`;
  result += "\nJika ada kendala, buka Setup Supabase untuk panduan lengkap.";
  callOasGlobal("showAlert", result.replace(/\n/g, "<br>"));
}

export function showSupabaseSetup(): void {
  if (typeof document === "undefined") return;
  const sql = `-- Jalankan SQL ini di Supabase SQL Editor:

-- 1. Tabel companies
CREATE TABLE companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'umum',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own companies"
  ON companies FOR ALL USING (auth.uid() = user_id);

-- 2. Tabel jurnal_entries
CREATE TABLE jurnal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  no text NOT NULL,
  tanggal date,
  ket text,
  jenis text,
  lines jsonb DEFAULT '[]',
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jurnal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own jurnal"
  ON jurnal_entries FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- 3. Tabel akuns
CREATE TABLE akuns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  kode text NOT NULL,
  nama text,
  tipe text,
  kat text,
  normal text,
  UNIQUE(company_id, kode)
);
ALTER TABLE akuns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own akuns"
  ON akuns FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- 4. Tabel company_profiles
CREATE TABLE company_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profiles"
  ON company_profiles FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));`;

  document.getElementById("supa-setup-sql-modal")?.remove();
  const bd = document.createElement("div");
  bd.id = "supa-setup-sql-modal";
  bd.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;";
  bd.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;max-width:680px;width:100%;max-height:88dvh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--surface2);">
        <div style="font-size:15px;font-weight:700;color:var(--text);">Setup Supabase untuk OAS</div>
        <button type="button" onclick="this.closest('#supa-setup-sql-modal').remove()" class="modal-close"><i class="ti ti-x"></i></button>
      </div>
      <div style="padding:18px 20px;overflow-y:auto;flex:1;">
        <p style="color:var(--muted);margin:0 0 14px;font-size:13px;line-height:1.6;">
          1. Buat project baru di <b>supabase.com</b><br>
          2. Pergi ke <b>SQL Editor → New Query</b><br>
          3. Salin dan jalankan SQL di bawah ini<br>
          4. Konfigurasi <b>NEXT_PUBLIC_SUPABASE_URL</b> dan <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> di environment aplikasi
        </p>
        <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
          <button type="button" id="supa-copy-sql-btn" class="btn btn-primary" style="font-size:12px;padding:8px 14px;">Salin SQL</button>
        </div>
        <pre style="background:var(--bg);border:1px solid var(--border-strong);border-radius:8px;padding:16px;white-space:pre-wrap;font-size:12px;line-height:1.6;font-family:var(--mono);color:var(--text);margin:0;"></pre>
      </div>
    </div>`;
  const pre = bd.querySelector("pre");
  if (pre) pre.textContent = sql;
  const copyBtn = bd.querySelector<HTMLButtonElement>("#supa-copy-sql-btn");
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard?.writeText(sql);
      copyBtn.textContent = "Tersalin!";
      setTimeout(() => {
        copyBtn.textContent = "Salin SQL";
      }, 1600);
    };
  }
  bd.onclick = (e) => {
    if (e.target === bd) bd.remove();
  };
  document.body.appendChild(bd);
}

export function showGoogleSetupGuide(): void {
  if (typeof document === "undefined") return;
  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;";
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border-strong);border-radius:10px;max-width:520px;width:100%;padding:28px;font-family:var(--sans);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="width:36px;height:36px;border-radius:8px;background:var(--surface2);border:1px solid var(--border-strong);display:inline-flex;align-items:center;justify-content:center;font-size:18px;color:var(--accent-text);"><i class="ti ti-lock"></i></span>
        <div>
          <div style="font-size:16px;font-weight:700;">Setup Google Login</div>
          <div style="font-size:12px;color:var(--muted);">Ikuti langkah berikut di Supabase Dashboard</div>
        </div>
      </div>
      <ol style="font-size:13px;line-height:1.9;color:var(--text);padding-left:18px;">
        <li>Buka <a href="https://supabase.com/dashboard" target="_blank" style="color:var(--accent-text)">supabase.com/dashboard</a> → pilih project kamu</li>
        <li>Pergi ke <b>Authentication → Providers → Google</b></li>
        <li>Toggle <b>Enable</b> → aktifkan</li>
        <li>Buka <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent-text)">Google Cloud Console</a> → buat project / pilih project</li>
        <li>Pergi ke <b>APIs &amp; Services → Credentials → Create OAuth Client ID</b></li>
        <li>Application type: <b>Web application</b></li>
        <li>Di bagian <b>Authorized redirect URIs</b>, tambahkan:<br>
          <code style="background:var(--surface2);padding:4px 8px;border-radius:5px;font-size:12px;display:block;margin-top:5px;word-break:break-all;">${escapeHtml(
            SUPABASE_URL
          )}/auth/v1/callback</code>
        </li>
        <li>Copy <b>Client ID</b> dan <b>Client Secret</b> → paste di Supabase</li>
        <li>Simpan di Supabase → selesai!</li>
      </ol>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-top:18px;width:100%;background:var(--accent);border:none;border-radius:8px;padding:11px;font-weight:700;cursor:pointer;color:var(--accent-fg);font-size:14px;">Mengerti, Tutup</button>
    </div>`;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}
