"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, History, Shield, Trash2 } from "lucide-react";
import { setOasWindowFn } from "@/lib";

interface AuditRecord {
  id?: string;
  ts?: string;
  time?: string;
  action?: string;
  category?: string;
  desc?: string;
  description?: string;
  who?: string;
  role?: string;
  companyName?: string;
  ref?: string;
}

const AUDIT_STORAGE_KEY = "oas_audit_trail";
const PAGE_SIZE = 40;

const ACTION_META: Record<string, { bg: string; color: string }> = {
  create: { bg: "var(--green-tint)", color: "var(--green)" },
  delete: { bg: "var(--red-tint)", color: "var(--danger)" },
  edit: { bg: "rgba(217,119,43,0.14)", color: "var(--accent3)" },
  auto: { bg: "var(--accent2-tint)", color: "var(--accent2)" },
  login: { bg: "var(--accent-tint)", color: "var(--accent-text)" },
  export: { bg: "rgba(217,119,43,0.14)", color: "var(--accent3)" },
  reset: { bg: "var(--red-tint)", color: "var(--danger)" },
  info: { bg: "var(--surface2)", color: "var(--muted)" },
};

const ROLE_META: Record<string, { label: string; bg: string; color: string }> = {
  owner: { label: "Owner", bg: "var(--accent-tint)", color: "var(--accent-text)" },
  admin: { label: "Admin", bg: "var(--accent2-tint)", color: "var(--accent2)" },
  member: { label: "Member", bg: "var(--surface2)", color: "var(--text)" },
  guest: { label: "Guest", bg: "var(--surface2)", color: "var(--muted)" },
  system: { label: "Sistem", bg: "var(--surface2)", color: "var(--accent2)" },
  ai: { label: "AI", bg: "var(--green-tint)", color: "var(--green)" },
};

function readAuditLogs(): AuditRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const refresh = useCallback(() => {
    setLogs(readAuditLogs());
  }, []);

  useEffect(() => {
    refresh();
    setOasWindowFn("__oasReactAuditRefresh", refresh as (...args: never[]) => unknown);
    setOasWindowFn("initAuditPage", refresh as (...args: never[]) => unknown);
    setOasWindowFn("renderAuditTrail", refresh as (...args: never[]) => unknown);
  }, [refresh]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (roleFilter && (l.role || "guest") !== roleFilter) return false;
      if (catFilter !== "all" && l.category !== catFilter) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        (l.desc || l.description || "").toLowerCase().includes(q) ||
        (l.who || "").toLowerCase().includes(q) ||
        (l.category || "").toLowerCase().includes(q) ||
        (l.ref || "").toLowerCase().includes(q)
      );
    });
  }, [actionFilter, catFilter, logs, roleFilter, search]);

  const kpi = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = logs.filter((l) => (l.ts || l.time || "").startsWith(today)).length;
    const writeCount = logs.filter((l) => l.action === "create" || l.action === "edit").length;
    const delCount = logs.filter((l) => l.action === "delete" || l.action === "reset").length;
    return { total: logs.length, todayCount, writeCount, delCount };
  }, [logs]);

  const handleExportCsv = useCallback(() => {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Waktu", "Aksi", "Kategori", "Pengguna", "Role", "Deskripsi"];
    const rows = filtered.map((l) => [
      l.ts || l.time || "",
      l.action || "",
      l.category || "",
      l.who || "",
      l.role || "",
      l.desc || l.description || "",
    ]);
    const csv = "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, [filtered]);

  const handleClearOld = useCallback(() => {
    const win = window as unknown as {
      showConfirm?: (m: string, cb: () => void) => void;
      showAlert?: (m: string) => void;
    };
    const run = () => {
      const cutoff = Date.now() - 30 * 86400000;
      const kept = readAuditLogs().filter((l) => {
        const t = Date.parse(l.ts || l.time || "");
        return !isNaN(t) && t >= cutoff;
      });
      try {
        localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(kept));
      } catch {}
      setLogs(kept);
      win.showAlert?.(`Log lama (>30 hari) dibersihkan. Tersisa ${kept.length} log.`);
    };
    if (win.showConfirm) {
      win.showConfirm("Hapus log audit yang lebih tua dari 30 hari?", run);
    } else run();
  }, []);

  const visible = filtered.slice(0, limit);

  return (
    <div className="page" id="page-audit-trail" data-react-managed="1">
      <div className="section-header" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div className="section-title">
            <Shield size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
            Audit Trail
          </div>
          <div className="section-sub">Rekam jejak seluruh aktivitas pengguna &amp; sistem</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={handleExportCsv}>
            <Download size={13} /> Export CSV
          </button>
          <button className="btn btn-danger btn-sm" type="button" onClick={handleClearOld}>
            <Trash2 size={13} /> Bersihkan Log Lama
          </button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
        {[
          { label: "Total Aktivitas", val: kpi.total, color: "var(--text)" },
          { label: "Hari Ini", val: kpi.todayCount, color: "var(--accent2)" },
          { label: "Buat / Ubah", val: kpi.writeCount, color: "var(--green)" },
          { label: "Hapus / Reset", val: kpi.delCount, color: "var(--danger)" },
        ].map((c) => (
          <div key={c.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 14px", flex: 1, minWidth: "120px" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{c.label}</div>
            <div style={{ fontSize: "17px", fontWeight: 700, fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", color: c.color, marginTop: "2px" }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Role filter badges */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "var(--muted)" }}>Filter role:</span>
        {Object.entries(ROLE_META).map(([key, info]) => {
          const active = roleFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRoleFilter(active ? null : key)}
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "6px",
                background: info.bg,
                color: info.color,
                border: active ? `2px solid ${info.color}` : "1px solid var(--border)",
                cursor: "pointer",
                opacity: roleFilter && !active ? 0.5 : 1,
              }}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Filter row */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", color: "var(--text)", fontSize: "12px" }}
        >
          <option value="all">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 10px", color: "var(--text)", fontSize: "12px" }}
        >
          <option value="all">Semua Aktivitas</option>
          {Object.keys(ACTION_META).map((a) => (
            <option key={a} value={a}>{a.toUpperCase()}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cari aktivitas, nama, referensi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 12px", color: "var(--text)", fontSize: "12px" }}
        />
      </div>

      {/* Log list */}
      <div className="table-card">
        {!visible.length ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
            <History size={22} style={{ marginBottom: "6px", opacity: 0.4 }} />
            <div>Belum ada log audit yang cocok dengan filter.</div>
          </div>
        ) : (
          <div style={{ display: "grid" }}>
            {visible.map((l, idx) => {
              const roleKey = l.role || "guest";
              const r = ROLE_META[roleKey] || ROLE_META.guest;
              const actStyle = ACTION_META[l.action || "info"] || ACTION_META.info;
              const ts = l.ts || l.time || "";
              const timeStr = ts
                ? new Date(ts).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";
              return (
                <div
                  key={l.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "12.5px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginBottom: "3px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", padding: "1px 6px", borderRadius: "4px", background: actStyle.bg, color: actStyle.color }}>
                        {l.action || "info"}
                      </span>
                      {l.category && (
                        <span style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "var(--mono)" }}>
                          [{l.category}]
                        </span>
                      )}
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: r.bg, color: r.color }}>
                        {r.label}
                      </span>
                      <span style={{ fontSize: "11.5px", fontWeight: 600 }}>{l.who || "Pengguna"}</span>
                    </div>
                    <div>{l.desc || l.description || "—"}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)", whiteSpace: "nowrap" }}>
                    {timeStr}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {filtered.length > limit && (
          <div style={{ textAlign: "center", padding: "12px" }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
              Muat lebih banyak ({filtered.length - limit} tersisa)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
