import {
  bisnisHanyaBaca,
  modulUntukHalaman,
  ringkasHasilGabung,
  type CompanyLike as AuditCompanyLike,
} from "@/lib/lainnya/audit-tim";
import {
  callOasGlobal,
  getWin,
  readCurrentCompany,
  readCurrentUser,
  readDbAdapter,
  readIsGuestMode,
} from "@/lib/shared/legacy-store";

export const AUDIT_KEY = "oas_audit_trail";
export const AUDIT_MAX = 2000;
export const PENDING_JOIN_KEY = "oas_pending_join";

export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  category: string;
  description: string;
  who: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
  meta: Record<string, unknown>;
}

export interface ModuleInfo {
  label: string;
  icon: string;
}

export const MODULES_CRUD: Record<string, ModuleInfo> = {
  dashboard: { label: "Dashboard", icon: "ti-layout-dashboard" },
  transaksi: { label: "Input Transaksi", icon: "ti-credit-card" },
  jurnal: { label: "Jurnal", icon: "ti-book" },
  "laba-rugi": { label: "Laba Rugi", icon: "ti-trending-up" },
  neraca: { label: "Neraca", icon: "ti-building-bank" },
  "arus-kas": { label: "Arus Kas", icon: "ti-cash" },
  akun: { label: "Chart of Accounts", icon: "ti-clipboard-list" },
  kontak: { label: "Kontak", icon: "ti-users" },
  invoice: { label: "Invoice & Piutang", icon: "ti-receipt" },
  anggaran: { label: "Anggaran", icon: "ti-chart-bar" },
  pajak: { label: "Pajak", icon: "ti-percent" },
  rekonsiliasi: { label: "Rekonsiliasi Bank", icon: "ti-refresh" },
  analitik: { label: "Analitik & Tren", icon: "ti-chart-area" },
  "ai-assistant": { label: "AI Assisten", icon: "ti-robot" },
  export: { label: "Export Laporan", icon: "ti-upload" },
};

export type ModulePermMap = Record<string, { read: boolean }>;

export interface OrgMemberRecord {
  id: string;
  company_id?: string;
  user_id?: string | null;
  email?: string;
  nama?: string;
  nik?: string;
  jabatan?: string;
  role?: string;
  permissions?: ModulePermMap;
  status?: string;
  invited_by?: string;
  created_at?: string;
}

export function makeDefaultPerms(): ModulePermMap {
  const p: ModulePermMap = {};
  Object.keys(MODULES_CRUD).forEach((mod) => {
    p[mod] = { read: true };
  });
  return p;
}

let orgMembers: OrgMemberRecord[] = [];
let currentMemberRole: string | null = null;
let readOnlyNotifTs = 0;

export function getOrgMembers(): OrgMemberRecord[] {
  return orgMembers;
}

export function getCurrentMemberRole(): string | null {
  return currentMemberRole;
}

export function resetOrgMembersState(): void {
  orgMembers = [];
  currentMemberRole = null;
}

export function getActorRole(): string {
  if (readIsGuestMode()) return "guest";
  const user = readCurrentUser();
  if (!user) return "guest";
  const company = readCurrentCompany();
  if (company) {
    if (company.user_id && company.user_id === user.id) return "owner";
    if (currentMemberRole === "admin") return "admin";
    if (currentMemberRole === "member") return "member";
    if (currentMemberRole === "owner") return "owner";
    if (currentMemberRole === "viewer") return "member";
    return "member";
  }
  if (user.id) return "owner";
  return "guest";
}

function getCurrentActorLabel(): string {
  const user = readCurrentUser();
  if (user?.email) {
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email
    );
  }
  if (readIsGuestMode()) return "Guest (Lokal)";
  return "Pengguna";
}

export function auditGetAll(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]") as AuditEntry[];
  } catch {
    return [];
  }
}

export function auditLog(
  action: string,
  category: string,
  description: string,
  meta: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  try {
    const logs = auditGetAll();
    const isAI = !!meta.aiActed;
    const who = isAI ? "Orias AI" : getCurrentActorLabel();
    const role = isAI ? "ai" : getActorRole();
    const cleanMeta = isAI ? { ...meta } : meta;
    if (isAI) delete cleanMeta.aiActed;

    const company = readCurrentCompany();
    const entry: AuditEntry = {
      id: "AL_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      ts: new Date().toISOString(),
      action,
      category,
      description,
      who,
      role,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      meta: cleanMeta,
    };
    logs.unshift(entry);
    if (logs.length > AUDIT_MAX) logs.length = AUDIT_MAX;
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
    window.dispatchEvent(new CustomEvent("oas:audit-updated"));
  } catch (e) {
    console.warn("[Audit] Failed:", e);
  }
}

export function renderAuditTrail(): void {
  const win = getWin();
  if (typeof win?.__oasReactAuditRefresh === "function") {
    (win.__oasReactAuditRefresh as () => void)();
  }
}

export function initAuditPage(): void {
  renderAuditTrail();
}

export function auditExportCSV(): void {
  if (!isAdmin()) {
    callOasGlobal(
      "showAlert",
      "⛔ Akses ditolak: Audit Trail hanya dapat diekspor oleh Admin atau Pemilik bisnis."
    );
    return;
  }
  const logs = auditGetAll();
  if (!logs.length) {
    callOasGlobal("showAlert", "Belum ada log audit.");
    return;
  }
  const header = [
    "Waktu",
    "Bisnis",
    "Aksi",
    "Kategori",
    "Deskripsi",
    "Oleh",
    "Role",
    "Referensi",
  ];
  const rows = logs.map((e) =>
    [
      new Date(e.ts).toLocaleString("id-ID"),
      e.companyName || "",
      e.action,
      e.category,
      e.description,
      e.who || "",
      e.role || "",
      String(e.meta?.ref || ""),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`)
  );
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  auditLog("export", "system", `Export audit trail CSV — ${logs.length} entri`);
}

export function auditClearOld(): void {
  if (!isAdmin()) {
    callOasGlobal(
      "showAlert",
      "⛔ Akses ditolak: Hanya Admin atau Pemilik bisnis yang dapat membersihkan log audit."
    );
    return;
  }
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const logs = auditGetAll();
  const before = logs.length;
  const fresh = logs.filter((e) => e.ts >= cutoff);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(fresh));
  const removed = before - fresh.length;
  auditLog("info", "system", `Membersihkan ${removed} log audit lama (>90 hari)`);
  renderAuditTrail();
  callOasGlobal("showAlert", `${removed} log lama dihapus.`);
}

export function auditLogLogin(email: string): void {
  const MAX_WAIT = 5000;
  const INTERVAL = 200;
  let elapsed = 0;
  const tryLog = () => {
    const company = readCurrentCompany();
    if (company?.id || elapsed >= MAX_WAIT) {
      auditLog("login", "system", `Login: ${email} — sesi dimulai`, {
        ref: email,
      });
    } else {
      elapsed += INTERVAL;
      setTimeout(tryLog, INTERVAL);
    }
  };
  setTimeout(tryLog, INTERVAL);
}

export function auditLogLogout(email?: string): void {
  auditLog("login", "system", `Logout: ${email || "pengguna"}`, {
    ref: email || "",
  });
}

let startupAuditLogged = false;
export function logStartupAudit(): void {
  if (startupAuditLogged) return;
  startupAuditLogged = true;
  setTimeout(() => {
    auditLog("info", "system", "Aplikasi dibuka", { ref: "STARTUP" });
  }, 2000);
}

// ── RBAC & ORG MEMBERS ──────────────────────────────────────────────────

export async function loadOrgMembers(): Promise<OrgMemberRecord[]> {
  const company = readCurrentCompany();
  const db = readDbAdapter();
  const user = readCurrentUser();

  if (!company?.id || !db?.isConnected()) {
    orgMembers = [];
    currentMemberRole = null;
    return [];
  }

  try {
    const res = await db
      .table("org_members")
      .select("*")
      .eq("company_id", company.id);
    if (res.error) {
      console.error("loadOrgMembers:", res.error);
      currentMemberRole =
        company.user_id && user?.id && company.user_id === user.id
          ? "owner"
          : "member";
      return [];
    }
    orgMembers = Array.isArray(res.data)
      ? (res.data as OrgMemberRecord[])
      : [];
    const myId = user?.id;
    const myEmail = (user?.email || "").trim().toLowerCase();
    const me = orgMembers.find(
      (m) =>
        (myId && m.user_id === myId) ||
        (myEmail && m.email && m.email.trim().toLowerCase() === myEmail)
    );
    if (me && !me.user_id && myId) me.user_id = myId;

    if (company.user_id && myId && company.user_id === myId) {
      currentMemberRole = "owner";
    } else if (me) {
      currentMemberRole = me.role || "member";
    } else {
      currentMemberRole = "member";
    }
    return orgMembers;
  } catch (e) {
    console.error("loadOrgMembers:", e);
    currentMemberRole =
      company.user_id && user?.id && company.user_id === user.id
        ? "owner"
        : "member";
    return [];
  }
}

export function isAdmin(): boolean {
  const company = readCurrentCompany();
  const user = readCurrentUser();
  if (company?.user_id && user?.id && company.user_id === user.id) return true;
  return currentMemberRole === "admin" || currentMemberRole === "owner";
}

export function isReadOnly(): boolean {
  const company = readCurrentCompany();
  const user = readCurrentUser();
  if (!company?.id) return false;
  return bisnisHanyaBaca(
    company as AuditCompanyLike,
    user?.id,
    currentMemberRole
  );
}

export function guardHanyaBaca(aksi?: string): boolean {
  if (!isReadOnly()) return false;
  callOasGlobal("hideOpSpinner");
  if (Date.now() - readOnlyNotifTs > 5000) {
    readOnlyNotifTs = Date.now();
    callOasGlobal(
      "showAlert",
      "🔒 Kamu Viewer di bisnis ini, jadi hanya bisa melihat data." +
        (aksi ? " " + aksi + " tidak disimpan." : "")
    );
  }
  return true;
}

export function hasPerm(mod: string, act: "read" | "write" = "read"): boolean {
  const company = readCurrentCompany();
  const user = readCurrentUser();
  if (!company || !user) return true;
  if (isAdmin()) return true;
  if (isReadOnly() && act !== "read") return false;
  if (act !== "read") return true;

  const myId = user.id;
  const myEmail = (user.email || "").trim().toLowerCase();
  const me = orgMembers.find(
    (m) =>
      (myId && m.user_id === myId) ||
      (myEmail && m.email && m.email.trim().toLowerCase() === myEmail)
  );
  if (!me) return false;
  const p = me.permissions || {};
  return p[mod]?.read !== false;
}

function setPermLocked(el: HTMLElement, locked: boolean): void {
  el.classList.toggle("perm-locked", locked);
  if (locked) {
    if (el.dataset.permTitle === undefined) el.dataset.permTitle = el.title || "";
    el.title = "Tidak ada izin akses — hubungi admin";
  } else if (el.dataset.permTitle !== undefined) {
    el.title = el.dataset.permTitle;
    delete el.dataset.permTitle;
  }
}

export function enforcePermissions(): void {
  if (typeof document === "undefined") return;
  const isAdm = isAdmin();
  const readOnly = isReadOnly();
  if (document.body) {
    document.body.classList.toggle("role-viewer", readOnly);
  }

  const navUserMgmt = document.getElementById("nav-user-mgmt");
  if (navUserMgmt) navUserMgmt.style.display = isAdm ? "" : "none";

  document.querySelectorAll<HTMLElement>("[data-page]").forEach((el) => {
    const pageId = el.getAttribute("data-page") || "";
    if (pageId === "audit-trail") {
      setPermLocked(el, !isAdm);
      return;
    }
    const mod = modulUntukHalaman(pageId);
    if (mod) setPermLocked(el, !hasPerm(mod, "read"));
  });

  document
    .querySelectorAll<HTMLElement>('.quick-action-btn[onclick*="showPage("]')
    .forEach((btn) => {
      const m = /showPage\('([^']+)'\)/.exec(btn.getAttribute("onclick") || "");
      if (m && m[1] === "audit-trail") {
        setPermLocked(btn, !isAdm);
        return;
      }
      const mod = m && modulUntukHalaman(m[1]);
      if (mod) setPermLocked(btn, !hasPerm(mod, "read"));
    });

  document
    .querySelectorAll<HTMLElement>(
      '[onclick*="openExportModal"], [data-oas-action="openExportModal"]'
    )
    .forEach((el) => setPermLocked(el, !hasPerm("export", "read")));

  document
    .querySelectorAll<HTMLElement>(
      '#storage-reset-btn, [onclick*="resetData"], [onclick*="confirmResetAll"]'
    )
    .forEach((b) => {
      b.style.display = isAdm ? "" : "none";
    });

  const viewerSelectors = [
    'button[onclick*="openModalInvoice"]',
    'button[onclick*="openModalBill"]',
    'button[onclick*="openModalKontak"]',
    'button[onclick*="openModalAkun"]',
    'button[onclick*="openModalAsetTetap"]',
    'button[onclick*="openModalTambahKS"]',
    'button[onclick*="openModalKelolaSemuaKartuStock"]',
    'button[onclick*="openModalJurnalBerulang"]',
    'button[onclick*="openModalAnggaran"]',
    'button[onclick*="openModalSaldoAwal"]',
    "#btn-setting-saldo-awal",
    "#coa-trash-btn",
  ];
  document
    .querySelectorAll<HTMLElement>(viewerSelectors.join(","))
    .forEach((b) => {
      b.style.display = readOnly ? "none" : "";
    });
}

// ── JOIN CODE & TEAM INVITE ─────────────────────────────────────────────

export async function getOrCreateJoinCode(): Promise<string | null> {
  const company = readCurrentCompany();
  const db = readDbAdapter();
  if (!company?.id || !db?.isConnected()) return null;

  const existingRes = await db
    .table("company_join_codes")
    .select("code,expires_at")
    .eq("company_id", company.id)
    .maybeSingle();

  const existing = existingRes.data as {
    code?: string;
    expires_at?: string;
  } | null;

  if (existing?.code && existing.expires_at) {
    if (new Date(existing.expires_at) > new Date()) {
      return existing.code;
    }
  }

  const rpcRes = await db.rpc("buat_kode_gabung", { cid: company.id });
  if (rpcRes.error) {
    throw new Error(rpcRes.error.message || "Gagal membuat kode gabung");
  }
  return (rpcRes.data as string | null) ?? null;
}

export async function regenerateJoinCodeDb(): Promise<string | null> {
  const company = readCurrentCompany();
  const db = readDbAdapter();
  if (!company?.id || !db?.isConnected()) return null;
  await db.table("company_join_codes").delete().eq("company_id", company.id);
  return getOrCreateJoinCode();
}

export async function checkJoinCodeInURL(): Promise<void> {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const rawCode = params.get("join");
  if (!rawCode) return;

  const code = rawCode.toUpperCase();
  window.history.replaceState({}, "", window.location.pathname);

  const user = readCurrentUser();
  if (!user) {
    sessionStorage.setItem(PENDING_JOIN_KEY, code);
    callOasGlobal(
      "showAlert",
      "🔗 Link undangan terdeteksi!\n\nSilakan login terlebih dahulu untuk bergabung ke bisnis ini."
    );
    setTimeout(() => callOasGlobal("showAuthModal"), 400);
    return;
  }
  await processJoinCode(code);
}

export async function processJoinCode(code: string): Promise<boolean> {
  const user = readCurrentUser();
  const db = readDbAdapter();
  if (!code || !user || !db?.isConnected()) return false;

  sessionStorage.removeItem(PENDING_JOIN_KEY);
  try {
    if (
      !window.confirm(
        `✅ Bergabung ke bisnis dengan kode ${code}?\n\nKamu akan ditambahkan sebagai Viewer (hanya bisa melihat). Admin bisa mengubah peran dan izin aksesmu.`
      )
    ) {
      return false;
    }
    const res = await db.rpc("gabung", { kode: code });
    if (res.error) {
      throw new Error(res.error.message || "Gagal bergabung");
    }
    const payload = res.data as {
      company_id?: string;
      nama?: string;
      peran?: string;
      hasil?: string;
    };
    const ringkas = ringkasHasilGabung(payload);
    if (!ringkas.berhasil) {
      callOasGlobal("showAlert", ringkas.pesan);
      return false;
    }
    callOasGlobal(
      "showAlert",
      ringkas.pesan +
        "<br><br>Klik tombol bisnis di pojok kiri atas untuk memilih bisnis tersebut."
    );
    const companies = (await callOasGlobal("getMyCompanies")) as
      | Array<{ id: string }>
      | undefined;
    const newCo = Array.isArray(companies)
      ? companies.find((c) => c.id === payload?.company_id)
      : null;
    if (newCo && !readCurrentCompany()) {
      await callOasGlobal("selectCompany", newCo);
      callOasGlobal("updateUserChip");
    }
    return true;
  } catch (e) {
    console.error("processJoinCode error:", e);
    callOasGlobal(
      "showAlert",
      "Error saat bergabung: " + (e instanceof Error ? e.message : String(e))
    );
    return false;
  }
}

export function showOrgMembersSQL(): void {
  callOasGlobal(
    "showAlert",
    "Jalankan file migrasi SQL <code>org_members</code> dan <code>company_join_codes</code> di Supabase SQL Editor proyek OAS kamu."
  );
}
