"use client";

import { useEffect, useRef, useState } from "react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { getDB, initDbAdapter } from "@/lib/cloud/db-adapter";
import {
  createCompanyRecord,
  deleteCompanyRecord,
  doGoogleLogin,
  getMyCompanies,
  registerAuthUiCallbacks,
  selectCompany,
} from "@/lib/cloud/supabase-data";
import {
  adalahPemilikBisnis,
  labelPeranBisnis,
  type CompanyLike as AuditCompanyLike,
} from "@/lib/lainnya/audit-tim";
import {
  callOasGlobal,
  readCurrentUser,
  type CompanyLike,
} from "@/lib/shared/legacy-store";

const BIZ_TYPES = [
  { val: "umum", label: "Umum", icon: "ti-building-skyscraper" },
  { val: "dagang", label: "Dagang / Toko", icon: "ti-shopping-cart" },
  { val: "jasa", label: "Jasa", icon: "ti-briefcase" },
  { val: "manufaktur", label: "Manufaktur", icon: "ti-industry" },
  { val: "properti", label: "Properti", icon: "ti-home" },
] as const;

function getBizIcon(type?: string): string {
  const found = BIZ_TYPES.find((b) => b.val === type);
  return found?.icon || "ti-building-skyscraper";
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

const CP_LONG_PRESS_MS = 600;

function CompanyCard({
  company,
  index,
  onSelect,
  onOpenActions,
}: {
  company: CompanyLike;
  index: number;
  onSelect: (c: CompanyLike) => void;
  onOpenActions: (c: CompanyLike) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [pressing, setPressing] = useState(false);

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
  };

  const startPress = (x: number, y: number) => {
    longPressedRef.current = false;
    startPosRef.current = { x, y };
    setPressing(true);
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setPressing(false);
      if (navigator.vibrate) navigator.vibrate(40);
      onOpenActions(company);
    }, CP_LONG_PRESS_MS);
  };

  const checkMove = (x: number, y: number) => {
    if (
      Math.abs(x - startPosRef.current.x) > 8 ||
      Math.abs(y - startPosRef.current.y) > 8
    ) {
      cancelPress();
    }
  };

  const endPress = () => {
    if (!longPressedRef.current) {
      cancelPress();
      onSelect(company);
    }
    longPressedRef.current = false;
  };

  return (
    <div
      className={`cp-company-card${pressing ? " long-pressing" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) startPress(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) checkMove(t.clientX, t.clientY);
      }}
      onTouchEnd={endPress}
      onTouchCancel={() => {
        cancelPress();
        longPressedRef.current = false;
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        startPress(e.clientX, e.clientY);
      }}
      onMouseMove={(e) => checkMove(e.clientX, e.clientY)}
      onMouseUp={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        endPress();
      }}
      onMouseLeave={cancelPress}
    >
      <div className="cp-card-inner">
        <div
          className="cp-company-icon"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <i className={`ti ${getBizIcon(company.type)}`} style={{ fontSize: 22 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {company.name || "Bisnis"}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              marginTop: 2,
              textTransform: "capitalize",
            }}
          >
            {company.type || "Umum"}
            {company._role && company._role !== "owner" && (
              <span
                style={{
                  textTransform: "none",
                  color: "var(--accent2)",
                  fontWeight: 600,
                }}
              >
                {" "}
                · Anggota ({labelPeranBisnis(company._role)})
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            cancelPress();
            onOpenActions(company);
          }}
          title="Opsi bisnis"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: 12,
            fontFamily: "var(--mono)",
            opacity: 0.7,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 6px",
            flexShrink: 0,
          }}
        >
          <span>opsi</span>
          <i className="ti ti-dots-vertical" style={{ fontSize: 15 }} />
        </button>
      </div>
      <div
        className={`cp-press-bar${pressing ? " animating" : ""}`}
        style={{
          width: pressing ? "100%" : "0%",
          transition: pressing ? `width ${CP_LONG_PRESS_MS}ms linear` : "none",
        }}
      />
    </div>
  );
}

export function AuthCompanyModals() {
  // ── AUTH PAGE STATE ──
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPw, setRegPw] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState<{ text: string; isError: boolean } | null>(
    null
  );

  // Animasi typewriter intro
  const [welcomeTxt, setWelcomeTxt] = useState("");
  const [welcomeCaret, setWelcomeCaret] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [brandTitle, setBrandTitle] = useState("");
  const [titleCaret, setTitleCaret] = useState(false);
  const [brandSub, setBrandSub] = useState("");
  const [subCaret, setSubCaret] = useState(false);
  const [formVisible, setFormVisible] = useState(false);

  // ── COMPANY PICKER STATE ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyLike[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCoName, setNewCoName] = useState("");
  const [newCoType, setNewCoType] = useState("umum");
  const [creatingCo, setCreatingCo] = useState(false);

  // Action sheet & delete confirm
  const [actionTarget, setActionTarget] = useState<CompanyLike | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyLike | null>(null);
  const [deletingCo, setDeletingCo] = useState(false);

  // Register UI callbacks ke supabase-data.ts
  useEffect(() => {
    registerAuthUiCallbacks({
      showAuthModal: () => {
        setAuthMsg(null);
        setAuthOpen(true);
      },
      hideAuthModal: () => setAuthOpen(false),
      showCompanyPickerScreen: (list) => {
        setCompanies(list);
        setShowAddForm(false);
        setNewCoName("");
        setNewCoType("umum");
        setPickerOpen(true);
      },
      hideCompanyPicker: () => setPickerOpen(false),
      showDeleteCompanyConfirm: (co) => {
        const user = readCurrentUser();
        if (!adalahPemilikBisnis(co as AuditCompanyLike, user?.id)) {
          callOasGlobal("showAlert", "Hanya pemilik yang bisa menghapus bisnis.");
          return;
        }
        setDeleteTarget(co);
      },
    });
    return () => registerAuthUiCallbacks(null);
  }, []);

  // Typewriter intro loop saat authOpen === true
  useEffect(() => {
    if (!authOpen) return;
    let cancelled = false;
    const delay = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    const typeInto = async (
      text: string,
      speed: number,
      setText: (v: string) => void,
      setCaret: (v: boolean) => void
    ) => {
      setCaret(true);
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setText(text.slice(0, i));
        await delay(speed);
      }
    };

    const untypeFrom = async (
      text: string,
      speed: number,
      setText: (v: string) => void,
      setCaret: (v: boolean) => void
    ) => {
      for (let i = text.length; i >= 0; i--) {
        if (cancelled) return;
        setText(text.slice(0, i));
        await delay(speed);
      }
      setCaret(false);
    };

    const runLoop = async () => {
      setWelcomeTxt("");
      setBrandTitle("");
      setBrandSub("");
      setLogoVisible(false);
      setFormVisible(false);

      // Tampilkan form setelah jeda singkat agar pengguna tidak menunggu terlalu lama
      const formReveal = setTimeout(() => {
        if (!cancelled) setFormVisible(true);
      }, 350);

      while (!cancelled) {
        await typeInto("Selamat Datang", 50, setWelcomeTxt, setWelcomeCaret);
        if (cancelled) break;
        await delay(2000);
        if (cancelled) break;
        await untypeFrom("Selamat Datang", 35, setWelcomeTxt, setWelcomeCaret);
        if (cancelled) break;
        await delay(200);
        if (cancelled) break;

        setLogoVisible(true);
        await delay(380);
        if (cancelled) break;

        await typeInto("OAS", 110, setBrandTitle, setTitleCaret);
        if (cancelled) break;
        setTitleCaret(false);
        await typeInto(
          "Orias Accounting System",
          28,
          setBrandSub,
          setSubCaret
        );
        if (cancelled) break;
        setFormVisible(true);
        await delay(2200);
        if (cancelled) break;

        setLogoVisible(false);
        await delay(380);
        if (cancelled) break;
        await untypeFrom("OAS", 35, setBrandTitle, setTitleCaret);
        if (cancelled) break;
        await untypeFrom(
          "Orias Accounting System",
          35,
          setBrandSub,
          setSubCaret
        );
        if (cancelled) break;
        await delay(250);
      }

      clearTimeout(formReveal);
    };

    void runLoop();
    return () => {
      cancelled = true;
    };
  }, [authOpen]);

  // ── AUTH HANDLERS ──
  const handleLogin = async () => {
    const email = loginEmail.trim();
    if (!email || !loginPw) {
      setAuthMsg({ text: "Isi email dan password dulu", isError: true });
      return;
    }
    const db = getDB() || initDbAdapter();
    if (!db) {
      setAuthMsg({ text: "Koneksi Supabase belum siap", isError: true });
      return;
    }
    setAuthLoading(true);
    setAuthMsg(null);
    const { error } = await db.auth.signInWithPassword({
      email,
      password: loginPw,
    });
    setAuthLoading(false);
    if (error) {
      setAuthMsg({
        text:
          error.message === "Invalid login credentials"
            ? "Email atau password salah"
            : error.message || "Gagal login",
        isError: true,
      });
    }
  };

  const handleRegister = async () => {
    const name = regName.trim();
    const email = regEmail.trim();
    if (!name) {
      setAuthMsg({ text: "Isi nama lengkap dulu", isError: true });
      return;
    }
    if (!email) {
      setAuthMsg({ text: "Isi email dulu", isError: true });
      return;
    }
    if (regPw.length < 6) {
      setAuthMsg({ text: "Password minimal 6 karakter", isError: true });
      return;
    }
    const db = getDB() || initDbAdapter();
    if (!db) {
      setAuthMsg({ text: "Koneksi Supabase belum siap", isError: true });
      return;
    }
    setAuthLoading(true);
    setAuthMsg(null);
    const { error } = await db.auth.signUp({
      email,
      password: regPw,
      options: { data: { full_name: name } },
    });
    setAuthLoading(false);
    if (error) {
      setAuthMsg({
        text: error.message || "Gagal mendaftar",
        isError: true,
      });
      return;
    }
    setAuthMsg({
      text: "Cek email kamu untuk verifikasi!",
      isError: false,
    });
  };

  const handleForgotPassword = async () => {
    const email = loginEmail.trim();
    if (!email) {
      setAuthMsg({ text: "Masukkan email kamu dulu", isError: true });
      return;
    }
    const db = getDB() || initDbAdapter();
    if (!db) return;
    const { error } = await db.auth.resetPasswordForEmail(email);
    if (error) {
      setAuthMsg({ text: error.message || "Gagal mengirim email", isError: true });
    } else {
      setAuthMsg({
        text: "Link reset password sudah dikirim!",
        isError: false,
      });
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setAuthMsg(null);
    const err = await doGoogleLogin();
    if (err) {
      setGoogleLoading(false);
      setAuthMsg({ text: err, isError: true });
    }
  };

  // ── COMPANY PICKER HANDLERS ──
  const handleCreateCompany = async () => {
    const name = newCoName.trim();
    if (!name) return;
    setCreatingCo(true);
    try {
      await createCompanyRecord(name, newCoType);
    } finally {
      setCreatingCo(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingCo(true);
    try {
      const ok = await deleteCompanyRecord(deleteTarget);
      if (ok) {
        setDeleteTarget(null);
        const list = await getMyCompanies();
        setCompanies(list);
      }
    } catch (e) {
      callOasGlobal(
        "showAlert",
        "Gagal menghapus bisnis: " + (e instanceof Error ? e.message : String(e))
      );
    } finally {
      setDeletingCo(false);
    }
  };

  const currentUser = readCurrentUser();
  const canDeleteAction =
    !!actionTarget &&
    adalahPemilikBisnis(actionTarget as AuditCompanyLike, currentUser?.id);

  return (
    <>
      {/* 1. FULLSCREEN AUTH SPLIT-PAGE */}
      {authOpen && (
        <div
          id="auth-modal-inline"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            overflow: "hidden",
            background: "var(--bg)",
          }}
        >
          <div className="auth-page-split">
            {/* INTRO COLUMN */}
            <div className="auth-intro-col">
              <div className="auth-intro-stage">
                <div
                  className={`auth-intro-overlay${
                    welcomeCaret ? " typing-caret" : ""
                  }`}
                  style={{
                    fontSize: "clamp(22px,4vw,32px)",
                    fontWeight: 800,
                    fontFamily: "var(--sans)",
                    color: "var(--text)",
                  }}
                >
                  {welcomeTxt}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    className={logoVisible ? "logo-built" : ""}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 10,
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 16,
                      opacity: logoVisible ? 1 : 0,
                      transition:
                        "opacity 0.2s cubic-bezier(0.16,1,0.3,1)",
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 80 80"
                      width="44"
                      height="44"
                    >
                      <rect
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "0ms",
                            fill: "var(--accent)",
                          } as React.CSSProperties
                        }
                        x="38.5"
                        y="12"
                        width="3"
                        height="38"
                        rx="1.5"
                      />
                      <rect
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "90ms",
                            fill: "var(--accent)",
                          } as React.CSSProperties
                        }
                        x="24"
                        y="50"
                        width="32"
                        height="4"
                        rx="2"
                      />
                      <rect
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "160ms",
                            fill: "var(--accent)",
                          } as React.CSSProperties
                        }
                        x="28"
                        y="54"
                        width="24"
                        height="3"
                        rx="1.5"
                        opacity="0.65"
                      />
                      <rect
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "230ms",
                            fill: "var(--accent2)",
                          } as React.CSSProperties
                        }
                        x="16"
                        y="20"
                        width="48"
                        height="3"
                        rx="1.5"
                      />
                      <circle
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "300ms",
                            fill: "var(--accent3)",
                          } as React.CSSProperties
                        }
                        cx="40"
                        cy="21.5"
                        r="3.5"
                      />
                      <line
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "370ms",
                            stroke: "var(--accent2)",
                          } as React.CSSProperties
                        }
                        x1="20"
                        y1="23"
                        x2="20"
                        y2="35"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <line
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "370ms",
                            stroke: "var(--accent2)",
                          } as React.CSSProperties
                        }
                        x1="60"
                        y1="23"
                        x2="60"
                        y2="35"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <ellipse
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "450ms",
                            fill: "var(--accent)",
                          } as React.CSSProperties
                        }
                        cx="20"
                        cy="36.5"
                        rx="10"
                        ry="3"
                        opacity="0.9"
                      />
                      <ellipse
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "450ms",
                            fill: "var(--accent)",
                          } as React.CSSProperties
                        }
                        cx="60"
                        cy="36.5"
                        rx="10"
                        ry="3"
                        opacity="0.9"
                      />
                      <text
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "530ms",
                            fill: "var(--bg)",
                          } as React.CSSProperties
                        }
                        x="20"
                        y="35.5"
                        textAnchor="middle"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        Rp
                      </text>
                      <text
                        className="logo-part"
                        style={
                          {
                            "--part-delay": "530ms",
                            fill: "var(--bg)",
                          } as React.CSSProperties
                        }
                        x="60"
                        y="35.5"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        =
                      </text>
                    </svg>
                  </div>
                  <div
                    className={titleCaret ? "typing-caret" : ""}
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      fontFamily: "var(--mono)",
                      letterSpacing: "0.02em",
                      color: "var(--accent-text)",
                      minHeight: "1.2em",
                    }}
                  >
                    {brandTitle}
                  </div>
                  <div
                    className={subCaret ? "typing-caret" : ""}
                    style={{
                      fontSize: 12,
                      marginTop: 6,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      minHeight: "1.2em",
                    }}
                  >
                    {brandSub}
                  </div>
                </div>
              </div>
            </div>

            {/* FORM COLUMN */}
            <div className="auth-form-col">
              <div
                style={{
                  width: "100%",
                  maxWidth: 400,
                  opacity: formVisible ? 1 : 0,
                  transform: formVisible
                    ? "translateY(0)"
                    : "translateY(14px)",
                  transition: "opacity 0.6s ease, transform 0.6s ease",
                }}
              >
                <div className="auth-tab-switch">
                  <div
                    className="auth-tab-thumb"
                    style={{
                      transform:
                        authTab === "login"
                          ? "translateX(0%)"
                          : "translateX(100%)",
                    }}
                  />
                  <button
                    type="button"
                    className={`auth-tab-opt${
                      authTab === "login" ? " active" : ""
                    }`}
                    onClick={() => {
                      setAuthTab("login");
                      setAuthMsg(null);
                    }}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    className={`auth-tab-opt${
                      authTab === "register" ? " active" : ""
                    }`}
                    onClick={() => {
                      setAuthTab("register");
                      setAuthMsg(null);
                    }}
                  >
                    Daftar
                  </button>
                </div>

                {authTab === "login" ? (
                  <div>
                    <div className="auth-field-group">
                      <label className="auth-label">Email</label>
                      <input
                        type="email"
                        className="auth-input"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="nama@email.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label">Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showLoginPw ? "text" : "password"}
                          className="auth-input"
                          value={loginPw}
                          onChange={(e) => setLoginPw(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleLogin();
                          }}
                          placeholder="Password"
                          autoComplete="current-password"
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw((v) => !v)}
                          className="auth-pw-toggle"
                        >
                          <i
                            className={`ti ${
                              showLoginPw ? "ti-eye-off" : "ti-eye"
                            }`}
                            style={{ fontSize: 15 }}
                          />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      disabled={authLoading}
                      onClick={() => void handleLogin()}
                    >
                      {authLoading ? "Memproses..." : "Masuk"}
                    </button>
                    <button
                      type="button"
                      className="auth-btn-google"
                      disabled={googleLoading}
                      onClick={() => void handleGoogle()}
                    >
                      <GoogleIcon />
                      {googleLoading
                        ? "Mengarahkan ke Google..."
                        : "Lanjutkan dengan Google"}
                    </button>
                    <p
                      className="auth-forgot"
                      onClick={() => void handleForgotPassword()}
                    >
                      Lupa password?
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="auth-field-group">
                      <label className="auth-label">Nama Lengkap</label>
                      <input
                        type="text"
                        className="auth-input"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Nama kamu"
                        autoComplete="name"
                      />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label">Email</label>
                      <input
                        type="email"
                        className="auth-input"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="nama@email.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="auth-field-group">
                      <label className="auth-label">Password</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type={showRegPw ? "text" : "password"}
                          className="auth-input"
                          value={regPw}
                          onChange={(e) => setRegPw(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleRegister();
                          }}
                          placeholder="Minimal 6 karakter"
                          autoComplete="new-password"
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPw((v) => !v)}
                          className="auth-pw-toggle"
                        >
                          <i
                            className={`ti ${
                              showRegPw ? "ti-eye-off" : "ti-eye"
                            }`}
                            style={{ fontSize: 15 }}
                          />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      disabled={authLoading}
                      onClick={() => void handleRegister()}
                    >
                      {authLoading ? "Membuat akun..." : "Buat Akun"}
                    </button>
                    <button
                      type="button"
                      className="auth-btn-google"
                      disabled={googleLoading}
                      onClick={() => void handleGoogle()}
                    >
                      <GoogleIcon />
                      {googleLoading
                        ? "Mengarahkan ke Google..."
                        : "Lanjutkan dengan Google"}
                    </button>
                  </div>
                )}

                {authMsg && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      textAlign: "center",
                      background: authMsg.isError
                        ? "rgba(248,113,113,0.1)"
                        : "rgba(74,222,128,0.1)",
                      border: authMsg.isError
                        ? "1px solid rgba(248,113,113,0.3)"
                        : "1px solid rgba(74,222,128,0.3)",
                      color: authMsg.isError ? "var(--red)" : "var(--green)",
                    }}
                  >
                    {authMsg.text}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setAuthOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: 12,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Lanjutkan sebagai Mode Tamu
                  </button>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: 11,
                      color: "var(--muted)",
                      margin: 0,
                      opacity: 0.7,
                    }}
                  >
                    Data tersimpan aman di cloud · Multi-perangkat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FULLSCREEN COMPANY PICKER */}
      {pickerOpen && (
        <div
          id="company-picker"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99997,
            overflowY: "auto",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              minHeight: "100dvh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ width: "100%", maxWidth: 480, position: "relative", zIndex: 2 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      fontFamily: "var(--mono)",
                    }}
                  >
                    Pilih Bisnis
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    {currentUser?.email || ""}
                  </div>
                </div>
                {companies.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPickerOpen(false)}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {companies.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "var(--muted)",
                      fontSize: 13,
                    }}
                  >
                    Belum ada bisnis.
                    <br />
                    Buat bisnis pertama kamu di bawah!
                  </div>
                ) : (
                  companies.map((c, i) => (
                    <CompanyCard
                      key={c.id}
                      company={c}
                      index={i}
                      onSelect={(co) => void selectCompany(co)}
                      onOpenActions={(co) => setActionTarget(co)}
                    />
                  ))
                )}
              </div>

              {showAddForm ? (
                <div
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: 18,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      marginBottom: 16,
                    }}
                  >
                    <i
                      className="ti ti-building-plus"
                      style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
                    />
                    Bisnis Baru
                  </div>
                  <div className="auth-field-group">
                    <label className="auth-label">Nama Bisnis</label>
                    <input
                      type="text"
                      className="auth-input"
                      value={newCoName}
                      onChange={(e) => setNewCoName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleCreateCompany();
                      }}
                      placeholder="Contoh: Toko Kemeja Surfing"
                      autoFocus
                    />
                  </div>
                  <div className="auth-field-group">
                    <label className="auth-label">Jenis Usaha</label>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      {BIZ_TYPES.map((t) => {
                        const selected = newCoType === t.val;
                        return (
                          <label
                            key={t.val}
                            className={`cp-type-card${
                              selected ? " cp-type-selected" : ""
                            }`}
                            onClick={() => setNewCoType(t.val)}
                          >
                            <span className="cp-type-icon">
                              <i className={`ti ${t.icon}`} style={{ fontSize: 20 }} />
                            </span>
                            <span className="cp-type-label">{t.label}</span>
                            <span className="cp-type-radio">
                              {selected && <span className="cp-type-dot" />}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="auth-btn-primary"
                      style={{ flex: 1 }}
                      disabled={creatingCo}
                      onClick={() => void handleCreateCompany()}
                    >
                      {creatingCo ? "Membuat..." : "Buat Bisnis"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="auth-btn-sm-ghost"
                      style={{ flex: 0, padding: "0 16px" }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="cp-add-btn"
                >
                  + Tambah Bisnis Baru
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. COMPANY ACTION SHEET */}
      <OasModalDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        maxWidth="420px"
        title={actionTarget?.name || "Opsi Bisnis"}
      >
        {actionTarget && (
          <div>
            <div className="cp-action-header">
              <div
                className="cp-action-biz-icon"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <i
                  className={`ti ${getBizIcon(actionTarget.type)}`}
                  style={{ fontSize: 18 }}
                />
              </div>
              <div>
                <div className="cp-action-biz-name">
                  {actionTarget.name || "Bisnis"}
                </div>
                <div className="cp-action-biz-type">
                  {actionTarget.type || "Umum"}
                </div>
              </div>
            </div>
            <div className="cp-action-btns">
              <button
                type="button"
                className="cp-action-btn open-btn"
                onClick={() => {
                  const target = actionTarget;
                  setActionTarget(null);
                  void selectCompany(target);
                }}
              >
                <div className="cp-action-btn-icon">
                  <i className="ti ti-arrow-right" />
                </div>
                <div>
                  <div>Buka Bisnis Ini</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      fontWeight: 400,
                      marginTop: 2,
                    }}
                  >
                    Masuk ke dashboard bisnis
                  </div>
                </div>
              </button>
              {canDeleteAction && (
                <button
                  type="button"
                  className="cp-action-btn delete-btn"
                  onClick={() => {
                    const target = actionTarget;
                    setActionTarget(null);
                    setDeleteTarget(target);
                  }}
                >
                  <div className="cp-action-btn-icon">
                    <i className="ti ti-trash ti-btn" />
                  </div>
                  <div>
                    <div>Hapus Bisnis</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        fontWeight: 400,
                        marginTop: 2,
                      }}
                    >
                      Hapus permanen beserta semua datanya
                    </div>
                  </div>
                </button>
              )}
            </div>
            <button
              type="button"
              className="cp-action-cancel"
              onClick={() => setActionTarget(null)}
            >
              Batal
            </button>
          </div>
        )}
      </OasModalDialog>

      {/* 4. DELETE COMPANY CONFIRM */}
      <OasModalDialog
        open={!!deleteTarget}
        onClose={() => {
          if (!deletingCo) setDeleteTarget(null);
        }}
        maxWidth="400px"
        title="Hapus Bisnis?"
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={deletingCo}
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className={`btn btn-danger${deletingCo ? " loading" : ""}`}
              disabled={deletingCo}
              onClick={() => void handleConfirmDelete()}
            >
              <i className="ti ti-trash ti-btn" />{" "}
              {deletingCo ? "Menghapus..." : "Hapus Permanen"}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div className="cp-del-icon-wrap" style={{ margin: "0 auto 14px" }}>
              <i className="ti ti-trash ti-btn" />
            </div>
            <div className="cp-del-desc">
              Kamu akan menghapus bisnis
              <div className="cp-del-biz-name">{deleteTarget.name || ""}</div>
            </div>
            <div className="cp-del-warning" style={{ marginTop: 12 }}>
              <span style={{ flexShrink: 0, fontSize: 15 }}>
                <i
                  className="ti ti-alert-triangle"
                  style={{ color: "var(--accent3)", fontSize: 14 }}
                />
              </span>
              <span>
                Semua jurnal &amp; transaksi bisnis &quot;
                {deleteTarget.name || ""}&quot; akan dihapus permanen.
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
              Tindakan ini{" "}
              <strong style={{ color: "var(--red)" }}>
                tidak bisa dibatalkan
              </strong>
              .
            </div>
          </div>
        )}
      </OasModalDialog>
    </>
  );
}
