"use client";

import { useCallback, useEffect, useState } from "react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  MODULES_CRUD,
  enforcePermissions,
  getOrCreateJoinCode,
  isAdmin,
  loadOrgMembers,
  makeDefaultPerms,
  processJoinCode,
  regenerateJoinCodeDb,
  showOrgMembersSQL,
  type ModulePermMap,
  type OrgMemberRecord,
} from "@/lib/cloud/audit-permission";
import { registerReactModal } from "@/lib/cloud/profil";
import {
  callOasGlobal,
  readCurrentCompany,
  readCurrentUser,
  readDbAdapter,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";

function PermissionTable({
  perms,
  onChange,
}: {
  perms: ModulePermMap;
  onChange: (next: ModulePermMap) => void;
}) {
  const keys = Object.keys(MODULES_CRUD);
  const allChecked = keys.every((mod) => perms[mod]?.read !== false);

  const toggleAll = (checked: boolean) => {
    const next: ModulePermMap = {};
    keys.forEach((mod) => {
      next[mod] = { read: checked };
    });
    onChange(next);
  };

  const toggleOne = (mod: string, checked: boolean) => {
    onChange({
      ...perms,
      [mod]: { read: checked },
    });
  };

  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid var(--border)",
        borderRadius: 8,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                color: "var(--muted)",
                fontWeight: 600,
              }}
            >
              Modul
            </th>
            <th
              style={{
                textAlign: "center",
                padding: "6px 8px",
                color: "var(--muted)",
                fontWeight: 600,
                minWidth: 72,
              }}
            >
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                Lihat
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleAll(e.target.checked)}
                  style={{
                    width: 15,
                    height: 15,
                    accentColor: "var(--accent2)",
                    cursor: "pointer",
                  }}
                  title="Pilih semua"
                />
              </label>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(MODULES_CRUD).map(([mod, info]) => (
            <tr key={mod} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "7px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <i
                    className={`ti ${info.icon}`}
                    style={{
                      fontSize: 13,
                      color: "var(--muted)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "var(--text)" }}>{info.label}</span>
                </div>
              </td>
              <td style={{ textAlign: "center", padding: 4 }}>
                <input
                  type="checkbox"
                  checked={perms[mod]?.read !== false}
                  onChange={(e) => toggleOne(mod, e.target.checked)}
                  style={{
                    width: 15,
                    height: 15,
                    accentColor: "var(--accent)",
                    cursor: "pointer",
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeamModals() {
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [members, setMembers] = useState<OrgMemberRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [sqlMissing, setSqlMissing] = useState(false);

  const [joinCodeOpen, setJoinCodeOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeBusy, setJoinCodeBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invNama, setInvNama] = useState("");
  const [invEmail, setInvEmail] = useState("");
  const [invNik, setInvNik] = useState("");
  const [invJabatan, setInvJabatan] = useState("");
  const [invRole, setInvRole] = useState("member");
  const [invPerms, setInvPerms] = useState<ModulePermMap>(makeDefaultPerms);
  const [invSaving, setInvSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editNik, setEditNik] = useState("");
  const [editJabatan, setEditJabatan] = useState("");
  const [editRole, setEditRole] = useState("member");
  const [editPerms, setEditPerms] = useState<ModulePermMap>(makeDefaultPerms);
  const [editSaving, setEditSaving] = useState(false);

  const [joinInputOpen, setJoinInputOpen] = useState(false);
  const [joinInputVal, setJoinInputVal] = useState("");
  const [joinStatus, setJoinStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  const refreshMembers = useCallback(async () => {
    setLoadingMembers(true);
    setSqlMissing(false);
    const db = readDbAdapter();
    try {
      if (db?.isConnected()) {
        const check = await db.table("org_members").select("id").limit(1);
        if (
          check.error &&
          (check.error.code === "42P01" ||
            check.error.message?.includes("does not exist"))
        ) {
          setSqlMissing(true);
          setMembers([]);
          return;
        }
      }
      const list = await loadOrgMembers();
      setMembers(list);
    } catch {
      setSqlMissing(true);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  const openMgmt = useCallback(() => {
    if (!isAdmin()) {
      callOasGlobal("showAlert", "Hanya admin yang bisa mengelola tim.");
      return;
    }
    setMgmtOpen(true);
    void refreshMembers();
  }, [refreshMembers]);

  const openJoinCode = useCallback(async () => {
    if (!isAdmin()) {
      callOasGlobal("showAlert", "Hanya admin yang bisa melihat join code.");
      return;
    }
    setJoinCodeBusy(true);
    try {
      const code = await getOrCreateJoinCode();
      setJoinCode(code || "—");
      setJoinCodeOpen(true);
    } catch (e) {
      callOasGlobal(
        "showAlert",
        "Gagal: " +
          (e instanceof Error ? e.message : String(e)) +
          "\n\nPastikan tabel company_join_codes sudah dibuat."
      );
    } finally {
      setJoinCodeBusy(false);
    }
  }, []);

  const openInvite = useCallback(() => {
    if (!isAdmin()) return;
    setInvNama("");
    setInvEmail("");
    setInvNik("");
    setInvJabatan("");
    setInvRole("member");
    setInvPerms(makeDefaultPerms());
    setMgmtOpen(false);
    setInviteOpen(true);
  }, []);

  const openEdit = useCallback(
    (memberId: string) => {
      const m = members.find((x) => x.id === memberId);
      if (!m) return;
      setEditId(memberId);
      setEditNama(m.nama || "");
      setEditNik(m.nik || "");
      setEditJabatan(m.jabatan || "");
      setEditRole(m.role || "member");
      setEditPerms(
        m.permissions
          ? { ...makeDefaultPerms(), ...m.permissions }
          : makeDefaultPerms()
      );
      setEditOpen(true);
    },
    [members]
  );

  const openJoinWithCode = useCallback(() => {
    callOasGlobal("closeSidebar");
    setJoinInputVal("");
    setJoinStatus(null);
    setJoinSubmitting(false);
    setJoinInputOpen(true);
  }, []);

  useEffect(() => {
    const unregs = [
      registerReactModal("modal-user-mgmt", openMgmt, () => setMgmtOpen(false)),
      registerReactModal(
        "modal-joincode",
        () => void openJoinCode(),
        () => setJoinCodeOpen(false)
      ),
      registerReactModal("modal-invite-user", openInvite, () =>
        setInviteOpen(false)
      ),
      registerReactModal(
        "modal-edit-member",
        () => setEditOpen(true),
        () => setEditOpen(false)
      ),
      registerReactModal("modal-join-with-code", openJoinWithCode, () =>
        setJoinInputOpen(false)
      ),
    ];

    setOasWindowFn("openUserMgmtModal", openMgmt);
    setOasWindowFn("renderUserMgmtList", () => void refreshMembers());
    setOasWindowFn("showJoinCodeModal", () => void openJoinCode());
    setOasWindowFn("openInviteModal", openInvite);
    setOasWindowFn("openEditMember", (id: string) => openEdit(id));
    setOasWindowFn("openJoinWithCodeModal", openJoinWithCode);

    return () => {
      unregs.forEach((fn) => fn());
    };
  }, [
    openEdit,
    openInvite,
    openJoinCode,
    openJoinWithCode,
    openMgmt,
    refreshMembers,
  ]);

  const handleRemoveMember = async (m: OrgMemberRecord) => {
    const label = m.nama || m.email || "anggota";
    if (!window.confirm(`Hapus anggota "${label}" dari tim?`)) return;
    const db = readDbAdapter();
    if (!db?.isConnected()) return;
    const res = await db.table("org_members").delete().eq("id", m.id);
    if (res.error) {
      callOasGlobal("showAlert", "Gagal hapus: " + res.error.message);
      return;
    }
    callOasGlobal("showAlert", `✓ "${label}" dihapus dari tim.`);
    void refreshMembers();
  };

  const handleRegenCode = async () => {
    setJoinCodeBusy(true);
    try {
      const code = await regenerateJoinCodeDb();
      setJoinCode(code || "—");
    } catch (e) {
      callOasGlobal(
        "showAlert",
        "Gagal memperbarui kode: " +
          (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setJoinCodeBusy(false);
    }
  };

  const joinLink =
    typeof window !== "undefined" && joinCode && joinCode !== "—"
      ? `${window.location.origin}${window.location.pathname}?join=${joinCode}`
      : "";

  const handleCopyJoinLink = () => {
    if (!joinLink) return;
    navigator.clipboard
      ?.writeText(joinLink)
      .then(() => callOasGlobal("showAlert", "✓ Link berhasil disalin!"))
      .catch(() => callOasGlobal("showAlert", "Link: " + joinLink));
  };

  const handleKirimInvite = async () => {
    const email = invEmail.trim();
    if (!email) {
      callOasGlobal("showAlert", "Email wajib diisi!");
      return;
    }
    const db = readDbAdapter();
    const company = readCurrentCompany();
    const user = readCurrentUser();
    if (!db?.isConnected() || !company?.id || !user?.id) return;

    setInvSaving(true);
    try {
      const res = await db.table("org_members").insert({
        company_id: company.id,
        email,
        nama: invNama.trim(),
        nik: invNik.trim(),
        jabatan: invJabatan.trim(),
        role: invRole,
        permissions: invPerms,
        invited_by: user.id,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      if (res.error) {
        callOasGlobal("showAlert", "Gagal: " + res.error.message);
        return;
      }
      callOasGlobal(
        "showAlert",
        `✓ Anggota "${invNama.trim() || email}" ditambahkan!\n\nMinta mereka buka link join code untuk bergabung.`
      );
      setInviteOpen(false);
      setMgmtOpen(true);
      void refreshMembers();
    } catch (e) {
      callOasGlobal(
        "showAlert",
        "Error: " + (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setInvSaving(false);
    }
  };

  const handleSimpanEdit = async () => {
    if (!editId) return;
    const db = readDbAdapter();
    if (!db?.isConnected()) return;

    setEditSaving(true);
    try {
      const res = await db
        .table("org_members")
        .update({
          nama: editNama.trim(),
          nik: editNik.trim(),
          jabatan: editJabatan.trim(),
          role: editRole,
          permissions: editPerms,
        })
        .eq("id", editId);
      if (res.error) {
        callOasGlobal("showAlert", "Gagal: " + res.error.message);
        return;
      }
      callOasGlobal("showAlert", "✓ Data anggota berhasil diperbarui!");
      setEditOpen(false);
      await refreshMembers();
      enforcePermissions();
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmitJoinCode = async () => {
    const code = joinInputVal.trim().toUpperCase();
    if (!code || code.length < 6) {
      setJoinStatus({
        text: "Masukkan kode minimal 6 karakter.",
        error: true,
      });
      return;
    }
    if (!readCurrentUser()) {
      setJoinInputOpen(false);
      callOasGlobal("showAlert", "Silakan login terlebih dahulu untuk bergabung.");
      setTimeout(() => callOasGlobal("showAuthModal"), 400);
      return;
    }
    setJoinSubmitting(true);
    setJoinStatus({ text: "Memeriksa kode..." });
    try {
      await processJoinCode(code);
      setJoinInputOpen(false);
    } catch (e) {
      setJoinStatus({
        text: "Gagal: " + (e instanceof Error ? e.message : String(e)),
        error: true,
      });
    } finally {
      setJoinSubmitting(false);
    }
  };

  const currentUserId = readCurrentUser()?.id;
  const modCount = Object.keys(MODULES_CRUD).length;

  return (
    <>
      <OasModalDialog
        id="modal-user-mgmt"
        open={mgmtOpen}
        onClose={() => setMgmtOpen(false)}
        maxWidth="560px"
        title={
          <div>
            <div>
              <i
                className="ti ti-users"
                style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }}
              />
              Kelola Tim
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              Atur anggota &amp; izin akses per modul
            </div>
          </div>
        }
        footer={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMgmtOpen(false)}
          >
            Tutup
          </button>
        }
      >
        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--accent-text)",
                marginBottom: 3,
              }}
            >
              <i
                className="ti ti-link"
                style={{ fontSize: 12, verticalAlign: -1, marginRight: 4 }}
              />
              Share Join Code
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              Bagikan kode ini agar anggota bisa bergabung dari perangkat mereka
              sendiri
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={joinCodeBusy}
            onClick={() => void openJoinCode()}
          >
            <i
              className="ti ti-qrcode"
              style={{ fontSize: 13, verticalAlign: -1, marginRight: 4 }}
            />
            {joinCodeBusy ? "Memuat..." : "Lihat Join Code"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Anggota Tim
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={openInvite}
          >
            <i
              className="ti ti-user-plus"
              style={{ fontSize: 13, verticalAlign: -1, marginRight: 4 }}
            />
            Tambah Manual
          </button>
        </div>

        <div style={{ maxHeight: 360, overflowY: "auto" }}>
          {loadingMembers ? (
            <div
              style={{
                color: "var(--muted)",
                fontSize: 13,
                padding: 20,
                textAlign: "center",
              }}
            >
              Memuat anggota...
            </div>
          ) : sqlMissing ? (
            <div style={{ textAlign: "center", padding: "24px 16px" }}>
              <i
                className="ti ti-database-off"
                style={{
                  fontSize: 32,
                  display: "block",
                  margin: "0 auto 12px",
                  opacity: 0.3,
                }}
              />
              <div style={{ fontSize: 13, color: "var(--muted)" }}>
                Tabel <code>org_members</code> belum dibuat.
                <br />
                Jalankan SQL dari tombol &quot;Lihat SQL&quot; di bawah terlebih
                dahulu.
              </div>
            </div>
          ) : !members.length ? (
            <div style={{ textAlign: "center", padding: "32px 16px" }}>
              <i
                className="ti ti-users"
                style={{
                  fontSize: 32,
                  display: "block",
                  margin: "0 auto 12px",
                  opacity: 0.3,
                }}
              />
              <div
                style={{
                  fontSize: 13,
                  color: "var(--muted)",
                  marginBottom: 12,
                }}
              >
                Belum ada anggota tim.
                <br />
                Bagikan join code agar user lain bisa bergabung.
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void openJoinCode()}
              >
                <i className="ti ti-link ti-btn" /> Tampilkan Join Code
              </button>
            </div>
          ) : (
            members.map((m) => {
              const isMe = m.user_id && m.user_id === currentUserId;
              const p = m.permissions || {};
              const activeCount = Object.keys(MODULES_CRUD).filter(
                (mod) => p[mod]?.read !== false
              ).length;
              const badgeStyle =
                m.role === "admin"
                  ? {
                      background: "rgba(245,158,11,0.15)",
                      color: "var(--accent3)",
                    }
                  : m.role === "viewer"
                  ? {
                      background: "rgba(148,163,184,0.15)",
                      color: "var(--muted)",
                    }
                  : {
                      background: "rgba(34,211,238,0.1)",
                      color: "var(--accent2)",
                    };
              const roleLabel =
                m.role === "admin"
                  ? "Admin"
                  : m.role === "viewer"
                  ? "Viewer"
                  : "Member";

              return (
                <div
                  key={m.id}
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--accent-tint)",
                        border: "1px solid var(--border-strong)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 700,
                        color: "var(--accent-text)",
                        flexShrink: 0,
                      }}
                    >
                      {(m.nama || m.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                          {m.nama || "—"}
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 5,
                            fontSize: 10,
                            fontWeight: 700,
                            ...badgeStyle,
                          }}
                        >
                          {roleLabel}
                        </span>
                        {isMe && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--accent-text)",
                              background: "var(--green-tint)",
                              padding: "2px 6px",
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            Saya
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {m.email || "—"}
                        {m.nik ? ` · NIK: ${m.nik}` : ""}
                        {m.jabatan ? ` · ${m.jabatan}` : ""}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginTop: 2,
                        }}
                      >
                        <i
                          className="ti ti-shield-check"
                          style={{ fontSize: 11, verticalAlign: -1 }}
                        />{" "}
                        {activeCount}/{modCount} modul · Status:{" "}
                        <span
                          style={{
                            color:
                              m.status === "active"
                                ? "var(--green)"
                                : "var(--accent3)",
                          }}
                        >
                          {m.status === "active" ? "Aktif" : "Pending"}
                        </span>
                      </div>
                    </div>
                    {!isMe && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(m.id)}
                        >
                          <i className="ti ti-pencil ti-btn" /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => void handleRemoveMember(m)}
                        >
                          <i className="ti ti-trash ti-btn" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sqlMissing && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              background: "rgba(217,119,43,0.1)",
              border: "1px solid rgba(217,119,43,0.28)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--muted)",
              lineHeight: 1.7,
            }}
          >
            <b style={{ color: "var(--accent3)" }}>
              <i className="ti ti-alert-triangle ti-inline" /> Setup diperlukan:
            </b>{" "}
            Jalankan SQL schema <code>org_members</code> +{" "}
            <code>company_join_codes</code> di Supabase agar fitur tim
            berfungsi.
            <button
              type="button"
              onClick={showOrgMembersSQL}
              style={{
                marginLeft: 8,
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: 5,
                padding: "3px 10px",
                fontSize: 10,
                color: "var(--text)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Lihat SQL
            </button>
          </div>
        )}
      </OasModalDialog>

      <OasModalDialog
        id="modal-joincode"
        open={joinCodeOpen}
        onClose={() => setJoinCodeOpen(false)}
        maxWidth="440px"
        title={
          <>
            <i
              className="ti ti-link"
              style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }}
            />
            Join Code Bisnis
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={joinCodeBusy}
              onClick={() => void handleRegenCode()}
            >
              <i
                className="ti ti-refresh"
                style={{ fontSize: 13, verticalAlign: -1, marginRight: 4 }}
              />
              {joinCodeBusy ? "Memperbarui..." : "Perbarui Kode"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setJoinCodeOpen(false)}
            >
              Tutup
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Kode Bergabung
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "var(--accent-text)",
              fontFamily: "var(--mono)",
              background: "var(--surface2)",
              border: "2px dashed var(--border-strong)",
              borderRadius: 10,
              padding: "16px 24px",
              display: "inline-block",
              marginBottom: 8,
            }}
          >
            {joinCode || "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Berlaku 7 hari · Admin bisa memperbarui kapan saja
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 6,
            }}
          >
            Atau share link langsung:
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              readOnly
              value={joinLink}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                flex: 1,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: 12,
                fontFamily: "var(--mono)",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCopyJoinLink}
            >
              <i
                className="ti ti-copy"
                style={{ fontSize: 13, verticalAlign: -1 }}
              />{" "}
              Salin
            </button>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface2)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.8,
          }}
        >
          <b style={{ color: "var(--text)" }}>Cara bergabung untuk anggota:</b>
          <br />
          1. Login ke OAS dengan email mereka
          <br />
          2. Buka link di atas, atau masukkan kode di menu Bergabung
          <br />
          3. Konfirmasi untuk bergabung ke bisnis ini
          <br />
          4. Admin bisa atur izin akses di Kelola Tim
        </div>
      </OasModalDialog>

      <OasModalDialog
        id="modal-invite-user"
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        maxWidth="560px"
        title={
          <>
            <i
              className="ti ti-user-plus"
              style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }}
            />
            Tambah Anggota Tim
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setInviteOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={invSaving}
              onClick={() => void handleKirimInvite()}
            >
              <i
                className="ti ti-device-floppy"
                style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
              />
              {invSaving ? "Menyimpan..." : "Simpan Anggota"}
            </button>
          </>
        }
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent-text)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          Data Anggota
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input
              type="text"
              value={invNama}
              onChange={(e) => setInvNama(e.target.value)}
              placeholder="Nama anggota"
            />
          </div>
          <div className="form-group">
            <label>
              Email <span style={{ color: "var(--red)" }}>*</span>
            </label>
            <input
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              placeholder="email@domain.com"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>NIK / ID Karyawan</label>
            <input
              type="text"
              value={invNik}
              onChange={(e) => setInvNik(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div className="form-group">
            <label>Jabatan</label>
            <input
              type="text"
              value={invJabatan}
              onChange={(e) => setInvJabatan(e.target.value)}
              placeholder="Jabatan / posisi"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Role</label>
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: 13,
                width: "100%",
              }}
            >
              <option value="viewer">Viewer · Hanya baca</option>
              <option value="member">Member · Akses terbatas</option>
              <option value="admin">Admin · Akses penuh</option>
            </select>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent-text)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            <i
              className="ti ti-shield-check"
              style={{ fontSize: 12, verticalAlign: -1, marginRight: 4 }}
            />
            Izin Akses per Modul
          </div>
          <PermissionTable perms={invPerms} onChange={setInvPerms} />
        </div>
      </OasModalDialog>

      <OasModalDialog
        id="modal-edit-member"
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="560px"
        title={
          <>
            <i
              className="ti ti-pencil"
              style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }}
            />
            Edit Anggota
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setEditOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={editSaving}
              onClick={() => void handleSimpanEdit()}
            >
              <i
                className="ti ti-device-floppy"
                style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
              />
              {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </>
        }
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--accent-text)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 10,
          }}
        >
          Data Anggota
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Nama Lengkap</label>
            <input
              type="text"
              value={editNama}
              onChange={(e) => setEditNama(e.target.value)}
              placeholder="Nama anggota"
            />
          </div>
          <div className="form-group">
            <label>NIK / ID Karyawan</label>
            <input
              type="text"
              value={editNik}
              onChange={(e) => setEditNik(e.target.value)}
              placeholder="Opsional"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Jabatan</label>
            <input
              type="text"
              value={editJabatan}
              onChange={(e) => setEditJabatan(e.target.value)}
              placeholder="Jabatan / posisi"
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--text)",
                fontSize: 13,
                width: "100%",
              }}
            >
              <option value="viewer">Viewer · Hanya baca</option>
              <option value="member">Member · Akses terbatas</option>
              <option value="admin">Admin · Akses penuh</option>
            </select>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--accent-text)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            <i
              className="ti ti-shield-check"
              style={{ fontSize: 12, verticalAlign: -1, marginRight: 4 }}
            />
            Izin Akses per Modul
          </div>
          <PermissionTable perms={editPerms} onChange={setEditPerms} />
        </div>
      </OasModalDialog>

      <OasModalDialog
        id="modal-join-with-code"
        open={joinInputOpen}
        onClose={() => setJoinInputOpen(false)}
        maxWidth="420px"
        title={
          <div>
            <div>
              <i
                className="ti ti-login"
                style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }}
              />
              Bergabung ke Bisnis
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                fontWeight: 400,
                marginTop: 2,
              }}
            >
              Masukkan kode undangan dari admin bisnis
            </div>
          </div>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setJoinInputOpen(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={joinSubmitting}
              onClick={() => void handleSubmitJoinCode()}
            >
              <i
                className="ti ti-login"
                style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
              />
              {joinSubmitting ? "Memproses..." : "Bergabung"}
            </button>
          </>
        }
      >
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 8,
              background: "var(--accent-tint)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
            }}
          >
            <i
              className="ti ti-login"
              style={{ fontSize: 24, color: "var(--accent-text)" }}
            />
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginBottom: 16,
            }}
          >
            Ketik atau paste kode 8 karakter yang diberikan admin
          </div>
          <input
            type="text"
            maxLength={8}
            value={joinInputVal}
            onChange={(e) => {
              setJoinInputVal(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
              );
              if (joinStatus?.error) setJoinStatus(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmitJoinCode();
            }}
            placeholder="Contoh: ABCD1234"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "0.2em",
              padding: 14,
              background: "var(--surface2)",
              border: "2px solid var(--border)",
              borderRadius: 12,
              color: "var(--text)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <div style={{ minHeight: 20, marginTop: 8, fontSize: 12 }}>
            {joinStatus && (
              <span
                style={{
                  color: joinStatus.error ? "var(--red)" : "var(--muted)",
                }}
              >
                {joinStatus.text}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            background: "var(--surface2)",
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 12,
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          <b style={{ color: "var(--text)" }}>Belum punya kode?</b>
          <br />
          Minta admin bisnis untuk membuka{" "}
          <b>Kelola Tim → Lihat Join Code</b> dan bagikan kode atau link kepada
          kamu.
        </div>
      </OasModalDialog>
    </>
  );
}
