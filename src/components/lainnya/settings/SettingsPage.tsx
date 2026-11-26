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
  ArrowDownCircle,
  ArrowUpCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Info,
  Lock,
  LogOut,
  Mail,
  Receipt,
  RefreshCw,
  Save,
  User,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { resolveAkunSetting } from "@/lib/shared/accounting";
import { fmtDate } from "@/lib/shared/format";
import {
  BELI_AKUN_SETTINGS_OPTIONS,
  cachePasswordLocally,
  closeAccountSwitcher,
  getCachedPassword,
  JUAL_AKUN_SETTINGS_OPTIONS,
} from "@/lib/fitur-baru/settings-switcher";
import {
  callOasGlobal,
  getWin,
  readAkuns,
  readAuthReady,
  readCurrentUser,
  readDbAdapter,
  readIsGuestMode,
  readPeriodeKunciSampai,
  readTransaksiAkunSettings,
  setOasWindowFn,
  writePeriodeKunciSampai,
  writeTransaksiAkunSettings,
  type SupabaseUserLike,
} from "@/lib/shared/legacy-store";
import type { Akun, TransaksiAkunSettings } from "@/types";

type SettingsView =
  | "root"
  | "akun"
  | "akun-nama"
  | "akun-info"
  | "transaksi"
  | "transaksi-jual"
  | "transaksi-beli"
  | "transaksi-kunci";

const SETTINGS_TITLES: Record<SettingsView, [string, string]> = {
  root: ["Settings", "Akun, autentikasi & pengaturan transaksi"],
  akun: ["Akun", "Foto, nama & informasi akun"],
  "akun-nama": ["Nama", "Ubah nama tampilan akun"],
  "akun-info": ["Informasi Akun", "Kelola metode login & password"],
  transaksi: ["Transaksi", "Pengaturan akun default per jenis transaksi"],
  "transaksi-jual": ["Penjualan", "Akun default untuk tiap jenis penjualan"],
  "transaksi-beli": ["Pembelian", "Akun default untuk tiap jenis pembelian"],
  "transaksi-kunci": [
    "Kunci Periode",
    "Cegah perubahan jurnal pada periode yang sudah ditutup",
  ],
};

const SUPPORTED_PROVIDERS = [
  {
    id: "google",
    name: "Google",
    description: "Login dengan akun Google",
  },
] as const;

interface ProviderStatusState {
  loading: boolean;
  error: string;
  hasEmail: boolean;
  identities: NonNullable<SupabaseUserLike["identities"]>;
  email: string;
  uid: string;
}

export default function SettingsPage() {
  const [stack, setStack] = useState<SettingsView[]>(["root"]);
  const currentView = stack[stack.length - 1] || "root";

  // User & Account state
  const [user, setUser] = useState<SupabaseUserLike | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [inputName, setInputName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Providers & cached password state
  const [provState, setProvState] = useState<ProviderStatusState>({
    loading: false,
    error: "",
    hasEmail: false,
    identities: [],
    email: "",
    uid: "",
  });
  const [provMsg, setProvMsg] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [cachedPw, setCachedPw] = useState<string | null>(null);
  const [showCachedPw, setShowCachedPw] = useState(false);

  // Modal Ubah / Tambah Password
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPwOld, setShowPwOld] = useState(false);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  // Transaksi settings state
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [trxSettings, setTrxSettings] = useState<TransaksiAkunSettings>(() =>
    readTransaksiAkunSettings()
  );

  // Kunci Periode state
  const [kunciSampai, setKunciSampai] = useState("");
  const [kunciInput, setKunciInput] = useState("");
  const [kunciInfoOpen, setKunciInfoOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(true);

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const loadUserInfo = useCallback(() => {
    const u = readCurrentUser();
    setUser(u);
    if (!u) {
      setPhotoUrl("");
      setInputName("");
      return;
    }
    const localPhoto =
      typeof window !== "undefined"
        ? localStorage.getItem("oas_profile_photo") || ""
        : "";
    setPhotoUrl(
      u.user_metadata?.avatar_url || u.user_metadata?.picture || localPhoto
    );
    setInputName(u.user_metadata?.full_name || u.user_metadata?.name || "");
  }, []);

  const loadProviders = useCallback(async () => {
    const u = readCurrentUser();
    if (!u) {
      setProvState({
        loading: false,
        error: "",
        hasEmail: false,
        identities: [],
        email: "",
        uid: "",
      });
      setCachedPw(null);
      return;
    }
    setProvState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      let resolvedUser: SupabaseUserLike = u;
      const db = readDbAdapter();
      if (db) {
        try {
          const timeout = new Promise<never>((_, rej) =>
            window.setTimeout(() => rej(new Error("timeout")), 4000)
          );
          const fresh = db.auth.getUser().then((r) => r.data?.user);
          const result = await Promise.race([fresh, timeout]);
          if (result) resolvedUser = result;
        } catch {
          // fallback to in-memory user
        }
      }
      const identities = resolvedUser.identities || [];
      const linkedIds = identities.map((i) => i.provider);
      const hasEmail =
        linkedIds.includes("email") ||
        Boolean(resolvedUser.app_metadata?.providers?.includes("email")) ||
        Boolean(resolvedUser.user_metadata?.has_password);
      const win = getWin();
      if (win) win._accsHasEmailPw = hasEmail;

      setProvState({
        loading: false,
        error: "",
        hasEmail,
        identities,
        email: resolvedUser.email || "",
        uid: resolvedUser.id || "",
      });
      if (hasEmail && resolvedUser.id) {
        setCachedPw(getCachedPassword(resolvedUser.id));
        setShowCachedPw(false);
      } else {
        setCachedPw(null);
      }
    } catch (e) {
      setProvState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, []);

  const loadTransaksi = useCallback(() => {
    setAkuns([...readAkuns()]);
    const cur = readTransaksiAkunSettings();
    setTrxSettings({
      jual: { ...(cur.jual || {}) },
      beli: { ...(cur.beli || {}) },
      jualHpp: cur.jualHpp || "",
      jualPersediaan: cur.jualPersediaan || "",
    });
  }, []);

  const loadKunci = useCallback(() => {
    const val = readPeriodeKunciSampai();
    setKunciSampai(val);
    setKunciInput(val);
    const adminCheck = callOasGlobal("isAdmin");
    setIsAdminUser(adminCheck === undefined ? true : Boolean(adminCheck));
  }, []);

  const triggerLoadersForView = useCallback(
    (view: SettingsView) => {
      if (view === "akun" || view === "akun-nama" || view === "akun-info") {
        loadUserInfo();
      }
      if (view === "akun-info") {
        void loadProviders();
      }
      if (
        view === "transaksi" ||
        view === "transaksi-jual" ||
        view === "transaksi-beli"
      ) {
        loadTransaksi();
      }
      if (view === "transaksi-kunci") {
        loadKunci();
      }
    },
    [loadKunci, loadProviders, loadTransaksi, loadUserInfo]
  );

  const navigate = useCallback(
    (view: SettingsView) => {
      if (!SETTINGS_TITLES[view]) return;
      setStack((prev) =>
        prev[prev.length - 1] === view ? prev : [...prev, view]
      );
      triggerLoadersForView(view);
    },
    [triggerLoadersForView]
  );

  const goBack = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      triggerLoadersForView(next[next.length - 1]);
      return next;
    });
  }, [triggerLoadersForView]);

  const resetTo = useCallback(
    (views: SettingsView[]) => {
      const valid = views.filter((v): v is SettingsView =>
        Boolean(SETTINGS_TITLES[v])
      );
      const next: SettingsView[] = valid.length ? valid : ["root"];
      setStack(next);
      triggerLoadersForView(next[next.length - 1]);
    },
    [triggerLoadersForView]
  );

  const hasEmailLogin = useCallback((): boolean => {
    const u = readCurrentUser();
    if (!u) return false;
    const linkedIds = (u.identities || []).map((i) => i.provider);
    const win = getWin();
    return (
      linkedIds.includes("email") ||
      Boolean(u.app_metadata?.providers?.includes("email")) ||
      Boolean(u.user_metadata?.has_password) ||
      Boolean(win?._accsHasEmailPw) ||
      provState.hasEmail
    );
  }, [provState.hasEmail]);

  const openPasswordModal = useCallback(() => {
    if (!readCurrentUser()) {
      callOasGlobal("showAlert", "Belum memiliki password.");
      return;
    }
    setPwOld("");
    setPw1("");
    setPw2("");
    setShowPwOld(false);
    setShowPw1(false);
    setShowPw2(false);
    setPwModalOpen(true);
  }, []);

  const openAccountSettings = useCallback(() => {
    if (!readCurrentUser()) {
      const fn = getWin()?.showAuthModal;
      if (typeof fn === "function") (fn as () => void)();
      else callOasGlobal("showAlert", "Silakan login terlebih dahulu.");
      return;
    }
    closeAccountSwitcher();
    callOasGlobal("showPage", "settings");
    resetTo(["root", "akun"]);
  }, [resetTo]);

  // ── Handlers: Akun ──
  const handlePhotoUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg("Ukuran foto max 5MB");
      return;
    }
    setPhotoMsg("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      callOasGlobal("openCropModal", {
        imgSrc: ev.target?.result,
        shape: "circle",
        outputSize: 300,
        title: "Sesuaikan Foto Profil",
        onConfirm: (croppedDataURL: string) => {
          callOasGlobal("_applyProfilePhoto", croppedDataURL);
          setPhotoUrl(croppedDataURL);
        },
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const clean = inputName.trim();
    if (!clean) {
      setProfileMsg({ text: "Nama tidak boleh kosong.", type: "error" });
      return;
    }
    const db = readDbAdapter();
    if (!db) {
      setProfileMsg({ text: "Koneksi autentikasi belum siap.", type: "error" });
      return;
    }
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { data, error: sessErr } = await db.auth.getSession();
      if (sessErr || !data?.session) {
        setProfileMsg({
          text: "Sesi login sudah habis. Silakan login ulang.",
          type: "error",
        });
        return;
      }
      const { error } = await db.auth.updateUser({
        data: { full_name: clean },
      });
      if (error) throw new Error(error.message || "Gagal menyimpan");
      const u = readCurrentUser();
      if (u?.user_metadata) u.user_metadata.full_name = clean;
      loadUserInfo();
      setProfileMsg({ text: "Profil berhasil disimpan!", type: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      if (/jwt|token|session/i.test(msg)) {
        setProfileMsg({
          text: "Sesi expired · coba refresh halaman lalu login ulang.",
          type: "error",
        });
      } else {
        setProfileMsg({ text: msg, type: "error" });
      }
    } finally {
      setSavingProfile(false);
    }
  }, [inputName, loadUserInfo]);

  const handleLinkProvider = useCallback(async (providerId: string) => {
    const db = readDbAdapter();
    if (!db) return;
    setProvMsg({ text: `Mengarahkan ke ${providerId}...`, type: "success" });
    try {
      const redirectTo = window.location.href.split("#")[0] + "#account-linked";
      const { error } = await db.auth.linkIdentity({
        provider: providerId,
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        if (
          error.message?.includes("not supported") ||
          error.message?.includes("linkIdentity")
        ) {
          setProvMsg({
            text: `Login dengan ${providerId} menggunakan email yang sama · Supabase akan otomatis menggabungkan akun.`,
            type: "error",
          });
          return;
        }
        throw new Error(error.message || "Gagal menghubungkan provider");
      }
    } catch (e) {
      setProvMsg({
        text: e instanceof Error ? e.message : String(e),
        type: "error",
      });
    }
  }, []);

  const handleUnlinkProvider = useCallback(
    async (providerId: string) => {
      const db = readDbAdapter();
      if (!db) return;
      const { data } = await db.auth.getUser();
      const identities = data?.user?.identities || [];
      if (identities.length <= 1) {
        setProvMsg({
          text: "Tidak bisa menghapus satu-satunya metode login.",
          type: "error",
        });
        return;
      }
      const identity = identities.find((i) => i.provider === providerId);
      if (!identity) {
        setProvMsg({ text: "Provider tidak ditemukan.", type: "error" });
        return;
      }
      const pName =
        SUPPORTED_PROVIDERS.find((p) => p.id === providerId)?.name ||
        providerId;
      if (
        !window.confirm(
          `Putuskan koneksi ${pName}? Kamu masih bisa login dengan metode lain.`
        )
      ) {
        return;
      }
      try {
        const { error } = await db.auth.unlinkIdentity(identity);
        if (error) throw new Error(error.message || "Gagal memutuskan provider");
        setProvMsg({
          text: `${pName} berhasil diputuskan dari akun ini.`,
          type: "success",
        });
        window.setTimeout(() => void loadProviders(), 1200);
      } catch (e) {
        setProvMsg({
          text: e instanceof Error ? e.message : String(e),
          type: "error",
        });
      }
    },
    [loadProviders]
  );

  const handleCopyCurrentPw = useCallback(() => {
    if (!cachedPw) return;
    navigator.clipboard
      ?.writeText(cachedPw)
      .then(() => {
        setProvMsg({
          text: "Password disalin ke clipboard.",
          type: "success",
        });
      })
      .catch(() => {
        callOasGlobal("showAlert", "Gagal menyalin password.");
      });
  }, [cachedPw]);

  const handleSavePassword = useCallback(async () => {
    const needOld = hasEmailLogin();
    if (needOld && !pwOld) {
      callOasGlobal("showAlert", "Masukkan password lama.");
      return;
    }
    if (!pw1) {
      callOasGlobal("showAlert", "Password tidak boleh kosong.");
      return;
    }
    if (pw1.length < 6) {
      callOasGlobal("showAlert", "Password minimal 6 karakter.");
      return;
    }
    if (pw1 !== pw2) {
      callOasGlobal("showAlert", "Konfirmasi password tidak cocok.");
      return;
    }
    const db = readDbAdapter();
    const u = readCurrentUser();
    if (!db || !u) return;

    setSavingPw(true);
    try {
      if (needOld && pwOld && u.email) {
        const { error: reauthErr } = await db.auth.signInWithPassword({
          email: u.email,
          password: pwOld,
        });
        if (reauthErr) {
          callOasGlobal("showAlert", "Password lama salah.");
          return;
        }
      }
      const { error } = await db.auth.updateUser({ password: pw1 });
      if (error) throw new Error(error.message || "Gagal menyimpan password");
      try {
        await db.auth.updateUser({ data: { has_password: true } });
      } catch {
        // non-critical
      }
      if (u.id) {
        cachePasswordLocally(u.id, pw1);
        setCachedPw(pw1);
      }
      setPwOld("");
      setPw1("");
      setPw2("");
      callOasGlobal(
        "showAlert",
        "Password berhasil diatur! Kamu sekarang bisa login dengan email + password juga."
      );
      window.setTimeout(async () => {
        try {
          await db.auth.refreshSession();
        } catch {
          // ignore
        }
        void loadProviders();
        setPwModalOpen(false);
      }, 1200);
    } catch (e) {
      callOasGlobal(
        "showAlert",
        e instanceof Error ? e.message : String(e)
      );
    } finally {
      setSavingPw(false);
    }
  }, [hasEmailLogin, loadProviders, pw1, pw2, pwOld]);

  const handleForgotPassword = useCallback(async () => {
    const u = readCurrentUser();
    const db = readDbAdapter();
    if (!u?.email || !db) return;
    try {
      const { error } = await db.auth.resetPasswordForEmail(u.email);
      if (error) throw new Error(error.message || "Gagal mengirim email reset");
      callOasGlobal(
        "showAlert",
        `Link reset password sudah dikirim ke ${u.email}`
      );
    } catch (e) {
      callOasGlobal("showAlert", e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleLogoutAll = useCallback(async () => {
    if (
      !window.confirm(
        "Logout dari semua perangkat? Kamu harus login ulang setelahnya."
      )
    ) {
      return;
    }
    const db = readDbAdapter();
    try {
      await db?.auth.signOut({ scope: "global" });
    } catch {
      await db?.auth.signOut();
    }
    window.location.reload();
  }, []);

  // ── Handlers: Transaksi Akun Mapping ──
  const handleUpdateAkunSetting = useCallback(
    (kategori: "jual" | "beli", kodeDefault: string, rawVal: string) => {
      const val = rawVal.trim() || kodeDefault;
      const next: TransaksiAkunSettings = {
        ...trxSettings,
        [kategori]: {
          ...(trxSettings[kategori] || {}),
          [kodeDefault]: val,
        },
      };
      setTrxSettings(next);
      writeTransaksiAkunSettings(next);
      callOasGlobal("markDirty");
    },
    [trxSettings]
  );

  const handleResetAkunSetting = useCallback(
    (kategori: "jual" | "beli", kodeDefault: string) => {
      handleUpdateAkunSetting(kategori, kodeDefault, kodeDefault);
    },
    [handleUpdateAkunSetting]
  );

  const handleUpdateHppPersediaan = useCallback(
    (field: "jualHpp" | "jualPersediaan", rawVal: string) => {
      const next: TransaksiAkunSettings = {
        ...trxSettings,
        [field]: rawVal.trim(),
      };
      setTrxSettings(next);
      writeTransaksiAkunSettings(next);
      callOasGlobal("markDirty");
    },
    [trxSettings]
  );

  // ── Handlers: Kunci Periode ──
  const handleSimpanKunci = useCallback(async () => {
    if (callOasGlobal("isAdmin") === false) {
      callOasGlobal(
        "showAlert",
        "Hanya admin yang bisa mengubah kunci periode."
      );
      return;
    }
    const v = kunciInput.trim();
    if (!v) {
      callOasGlobal("showAlert", "Pilih tanggalnya dulu, atau pakai Buka Kunci.");
      return;
    }
    const prev = readPeriodeKunciSampai();
    if (
      prev &&
      v < prev &&
      !window.confirm(
        `Tanggal kunci dimundurkan dari ${fmtDate(prev)} ke ${fmtDate(v)}. Periode di antaranya jadi bisa diubah lagi. Lanjutkan?`
      )
    ) {
      return;
    }
    writePeriodeKunciSampai(v);
    const ok = await (callOasGlobal("savePeriodeKunciToCloud") as Promise<
      boolean | undefined
    >);
    loadKunci();
    callOasGlobal(
      "showAlert",
      ok === false
        ? "Kunci tersimpan di perangkat ini, tapi gagal sinkron ke cloud."
        : `Periode sampai ${fmtDate(v)} dikunci.`
    );
  }, [kunciInput, loadKunci]);

  const handleBukaKunci = useCallback(async () => {
    if (callOasGlobal("isAdmin") === false) {
      callOasGlobal(
        "showAlert",
        "Hanya admin yang bisa mengubah kunci periode."
      );
      return;
    }
    if (
      !window.confirm(
        "Buka semua kunci periode? Jurnal di periode lama bisa ditambah lagi."
      )
    ) {
      return;
    }
    writePeriodeKunciSampai("");
    const ok = await (callOasGlobal("savePeriodeKunciToCloud") as Promise<
      boolean | undefined
    >);
    loadKunci();
    callOasGlobal(
      "showAlert",
      ok === false
        ? "Kunci dibuka di perangkat ini, tapi gagal sinkron ke cloud."
        : "Kunci periode dibuka."
    );
  }, [loadKunci]);

  // Register globals & OAuth #account-linked redirect handler + guest sidebar sync
  useEffect(() => {
    setOasWindowFn(
      "settingsNavigate",
      navigate as (...args: never[]) => unknown
    );
    setOasWindowFn("settingsGoBack", goBack as (...args: never[]) => unknown);
    setOasWindowFn(
      "settingsResetTo",
      resetTo as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderSettingsView",
      (() => triggerLoadersForView(currentView)) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "switchSettingsTab",
      ((tab: string) =>
        navigate(tab === "transaksi" ? "transaksi" : "akun")) as (
        ...args: never[]
      ) => unknown
    );
    setOasWindowFn(
      "switchSettingsTransTab",
      ((sub: string) =>
        navigate(`transaksi-${sub}` as SettingsView)) as (
        ...args: never[]
      ) => unknown
    );
    setOasWindowFn(
      "switchAccsTab",
      ((tab: string) =>
        navigate(tab === "profile" ? "akun-nama" : "akun-info")) as (
        ...args: never[]
      ) => unknown
    );
    setOasWindowFn(
      "openAccountSettings",
      openAccountSettings as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "accsLoadUserInfo",
      loadUserInfo as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "accsLoadProviders",
      loadProviders as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderSettingsTransaksi",
      loadTransaksi as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderSettingsKunci",
      loadKunci as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "openAccsPasswordModal",
      openPasswordModal as (...args: never[]) => unknown
    );
  }, [
    currentView,
    goBack,
    loadKunci,
    loadProviders,
    loadTransaksi,
    loadUserInfo,
    navigate,
    openAccountSettings,
    openPasswordModal,
    resetTo,
    triggerLoadersForView,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const btn = document.getElementById("sidebar-accs-btn");
      if (btn) btn.style.display = readIsGuestMode() ? "none" : "flex";
    }, 1000);

    if (window.location.href.includes("account-linked")) {
      const tryOpen = window.setInterval(() => {
        if (readAuthReady() && readCurrentUser()) {
          window.clearInterval(tryOpen);
          window.history.replaceState(null, "", window.location.pathname);
          window.setTimeout(() => {
            openAccountSettings();
            navigate("akun-info");
            setProvMsg({
              text: "Provider berhasil dihubungkan ke akun kamu!",
              type: "success",
            });
          }, 600);
        }
      }, 400);
      window.setTimeout(() => window.clearInterval(tryOpen), 12000);
    }

    return () => window.clearInterval(timer);
  }, [navigate, openAccountSettings]);

  const [crumbTitle, crumbSub] = SETTINGS_TITLES[currentView];
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    "(Nama belum diatur)";
  const initial = (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "?"
  )
    .charAt(0)
    .toUpperCase();
  const hasPw = useMemo(() => hasEmailLogin(), [hasEmailLogin]);
  const pwActionText = hasPw ? "Ubah Password" : "Tambahkan Password";

  const goLoginModal = () => {
    const fn = getWin()?.showAuthModal;
    if (typeof fn === "function") (fn as () => void)();
    else callOasGlobal("showAlert", "Silakan login terlebih dahulu.");
  };

  const renderAkunMappingList = (
    kategori: "jual" | "beli",
    options: readonly { kodeDefault: string; label: string }[]
  ) =>
    options.map((j) => {
      const efektif = resolveAkunSetting(trxSettings, kategori, j.kodeDefault);
      const akunObj = akuns.find((a) => a.kode === efektif);
      const notFound = !akunObj;
      const isCustom = efektif !== j.kodeDefault;
      return (
        <div key={j.kodeDefault}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              border: `1px solid ${notFound ? "var(--red)" : "var(--border)"}`,
              borderRadius: "8px",
              marginBottom: "6px",
              background: "var(--surface2)",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: "13px" }}>{j.label}</div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: "2px",
                }}
              >
                Default: {j.kodeDefault}
                {akunObj ? ` · ${akunObj.nama}` : ""}
              </div>
            </div>
            <input
              type="text"
              defaultValue={efektif}
              key={`${kategori}-${j.kodeDefault}-${efektif}`}
              onBlur={(e) =>
                handleUpdateAkunSetting(kategori, j.kodeDefault, e.target.value)
              }
              style={{
                width: "80px",
                textAlign: "center",
                fontFamily: "var(--mono)",
                padding: "7px 6px",
                border: `1px solid ${notFound ? "var(--red)" : "var(--border)"}`,
                borderRadius: "6px",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "12.5px",
              }}
            />
            {isCustom ? (
              <button
                type="button"
                onClick={() => handleResetAkunSetting(kategori, j.kodeDefault)}
                title="Reset ke default"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "4px",
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={14} />
              </button>
            ) : (
              <span
                style={{
                  width: "22px",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          {notFound ? (
            <div
              style={{
                fontSize: "11px",
                color: "var(--red)",
                margin: "-2px 0 8px 2px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertTriangle size={11} /> Akun {efektif} tidak ditemukan di COA ·
              cek Sampah COA atau isi kode akun lain.
            </div>
          ) : null}
        </div>
      );
    });

  return (
    <div className="page" id="page-settings" data-react-managed="1">
      <div className="section-header" style={{ marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className={`settings-back-btn${stack.length > 1 ? " show" : ""}`}
            id="settings-back-btn"
            onClick={goBack}
            aria-label="Kembali"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="section-title" id="settings-crumb-title">
              {crumbTitle}
            </div>
            <div className="section-sub" id="settings-crumb-sub">
              {crumbSub}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        {/* ── LEVEL 0: ROOT ── */}
        {currentView === "root" ? (
          <div className="settings-view active">
            <div className="settings-list">
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("akun")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate("akun");
                }}
              >
                <span className="sli-icon">
                  <User size={18} />
                </span>
                <div className="sli-body">
                  <div className="sli-label">Akun</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("transaksi")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate("transaksi");
                }}
              >
                <span className="sli-icon">
                  <Receipt size={18} />
                </span>
                <div className="sli-body">
                  <div className="sli-label">Transaksi</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── LEVEL 1: AKUN ── */}
        {currentView === "akun" ? (
          <div className="settings-view active">
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <div className="accs-avatar-ring" id="accs-avatar">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt="Foto profil"
                      onClick={() =>
                        callOasGlobal("openPhotoViewer", photoUrl, "circle")
                      }
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                        borderRadius: "50%",
                        cursor: "pointer",
                      }}
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div
                  className="accs-avatar-badge"
                  style={{
                    position: "absolute",
                    bottom: "4px",
                    right: "4px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "var(--accent)",
                    border: "2px solid var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 3,
                    color: "var(--accent-fg)",
                  }}
                >
                  <Check size={10} strokeWidth={3} />
                </div>
                <button
                  type="button"
                  title="Ganti foto profil"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    position: "absolute",
                    bottom: "0px",
                    left: "-2px",
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    background: "var(--accent2)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--bg)",
                    zIndex: 10,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    color: "#0d0f14",
                    padding: 0,
                  }}
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                />
              </div>
              {photoMsg ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--red)",
                    marginTop: "4px",
                  }}
                >
                  {photoMsg}
                </div>
              ) : null}
            </div>

            <div className="settings-list">
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("akun-nama")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate("akun-nama");
                }}
              >
                <div className="sli-body">
                  <div className="sli-label">Nama</div>
                </div>
                <span className="sli-value">
                  {user ? displayName : "Belum login"}
                </span>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("akun-info")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate("akun-info");
                }}
              >
                <div className="sli-body">
                  <div className="sli-label">Informasi Akun</div>
                </div>
                <span className="sli-value">{user?.email || "—"}</span>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── LEVEL 2: AKUN > NAMA ── */}
        {currentView === "akun-nama" ? (
          <div className="settings-view active">
            <div className="accs-field">
              <label htmlFor="accs-input-name">NAMA TAMPILAN</label>
              <input
                type="text"
                id="accs-input-name"
                placeholder="Nama kamu"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
              />
            </div>
            <div className="accs-field">
              <label htmlFor="accs-input-email">
                EMAIL (tidak bisa diubah langsung)
              </label>
              <input
                type="email"
                id="accs-input-email"
                value={user?.email || ""}
                disabled
              />
            </div>
            <button
              type="button"
              className="auth-btn-primary"
              disabled={savingProfile}
              onClick={() => void handleSaveProfile()}
              style={{
                marginTop: "4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Save size={14} />{" "}
              {savingProfile ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            {profileMsg ? (
              <div
                className={`accs-msg ${profileMsg.type}`}
                style={{ display: "block" }}
              >
                {profileMsg.text}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── LEVEL 2: AKUN > INFORMASI AKUN ── */}
        {currentView === "akun-info" ? (
          <div className="settings-view active">
            <div className="accs-email-label" style={{ marginBottom: "2px" }}>
              {user?.email || "—"}
            </div>
            <div className="accs-uid-label" style={{ marginBottom: "16px" }}>
              {user?.id ? `UID: ${user.id.substring(0, 16)}...` : ""}
            </div>

            <div className="settings-section-label">Metode Login</div>
            <div id="accs-providers-list">
              {!user ? (
                <>
                  <div
                    className="provider-card"
                    style={{ cursor: "pointer" }}
                    onClick={goLoginModal}
                  >
                    <div className="provider-icon">
                      <Mail size={18} />
                    </div>
                    <div className="provider-info">
                      <div className="provider-name">Email &amp; Password</div>
                      <div className="provider-status">Belum login</div>
                    </div>
                  </div>
                  {SUPPORTED_PROVIDERS.map((p) => (
                    <div
                      key={p.id}
                      className="provider-card"
                      style={{ cursor: "pointer" }}
                      onClick={goLoginModal}
                    >
                      <div className="provider-icon">G</div>
                      <div className="provider-info">
                        <div className="provider-name">{p.name}</div>
                        <div className="provider-status">Belum login</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : provState.loading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  Memuat koneksi...
                </div>
              ) : provState.error ? (
                <div
                  style={{
                    color: "var(--red)",
                    fontSize: "13px",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  Gagal memuat: {provState.error}
                </div>
              ) : (
                <>
                  <div
                    className={`provider-card${provState.hasEmail ? " linked-primary" : ""}`}
                  >
                    <div className="provider-icon">
                      <Mail size={18} />
                    </div>
                    <div className="provider-info">
                      <div className="provider-name">Email &amp; Password</div>
                      <div
                        className={`provider-status${provState.hasEmail ? " primary" : ""}`}
                      >
                        {provState.hasEmail
                          ? `Aktif · ${provState.email}`
                          : "Belum ada password · atur di bawah"}
                      </div>
                    </div>
                    {provState.hasEmail ? (
                      <span className="provider-badge-primary">Aktif</span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                        ↓ di bawah
                      </span>
                    )}
                  </div>

                  {SUPPORTED_PROVIDERS.map((p) => {
                    const identity = provState.identities.find(
                      (i) => i.provider === p.id
                    );
                    const isLinked = Boolean(identity);
                    const linkedEmail = identity?.identity_data?.email || "";
                    const canUnlink = provState.identities.length > 1;
                    return (
                      <div
                        key={p.id}
                        className={`provider-card${isLinked ? " linked" : ""}`}
                      >
                        <div className="provider-icon">G</div>
                        <div className="provider-info">
                          <div className="provider-name">{p.name}</div>
                          <div
                            className={`provider-status${isLinked ? " linked" : ""}`}
                          >
                            {isLinked ? linkedEmail || "Terhubung" : p.description}
                          </div>
                        </div>
                        {isLinked ? (
                          <button
                            type="button"
                            className="provider-action btn-unlink"
                            disabled={!canUnlink}
                            title={
                              !canUnlink
                                ? "Tidak bisa unlink satu-satunya metode login"
                                : undefined
                            }
                            onClick={() => void handleUnlinkProvider(p.id)}
                          >
                            {!canUnlink ? "Terkunci" : "Putuskan"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="provider-action btn-link"
                            onClick={() => void handleLinkProvider(p.id)}
                          >
                            + Hubungkan
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {provMsg ? (
              <div
                className={`accs-msg ${provMsg.type}`}
                style={{ display: "block" }}
              >
                {provMsg.text}
              </div>
            ) : null}

            {user && provState.hasEmail ? (
              <div id="accs-current-pw-section">
                <div className="settings-section-label">Password Saat Ini</div>
                {cachedPw ? (
                  <div className="pw-reveal-box">
                    <input
                      type={showCachedPw ? "text" : "password"}
                      value={cachedPw}
                      readOnly
                    />
                    <button
                      type="button"
                      onClick={() => setShowCachedPw((v) => !v)}
                      title="Lihat/sembunyikan"
                    >
                      {showCachedPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCurrentPw}
                      title="Salin"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="pw-unknown-note">
                    <Info
                      size={12}
                      style={{ verticalAlign: "-1px", marginRight: "4px" }}
                    />
                    Password belum tersimpan di perangkat ini (baru tersimpan
                    otomatis setelah kamu mengatur/mengubah password lewat
                    tombol di bawah).
                  </div>
                )}
              </div>
            ) : null}

            <div className="settings-list" style={{ marginTop: "14px" }}>
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={openPasswordModal}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openPasswordModal();
                }}
              >
                <div className="sli-body">
                  <div className="sli-label">{pwActionText}</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>

            {user ? (
              <div className="accs-danger-zone">
                <div className="accs-danger-desc">
                  Logout dari semua perangkat. Data bisnis &amp; jurnal{" "}
                  <strong>tidak</strong> akan terhapus.
                </div>
                <button
                  type="button"
                  className="provider-action btn-unlink"
                  onClick={() => void handleLogoutAll()}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <LogOut size={14} /> Logout dari Semua Perangkat
                </button>
                <button
                  type="button"
                  className="provider-action btn-unlink"
                  onClick={() => callOasGlobal("doLogout")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "rgba(248,113,113,0.08)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <LogOut size={14} /> Keluar dari Akun Ini
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── LEVEL 1: TRANSAKSI ── */}
        {currentView === "transaksi" ? (
          <div className="settings-view active">
            <div className="settings-list">
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("transaksi-jual")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate("transaksi-jual");
                }}
              >
                <span className="sli-icon">
                  <ArrowUpCircle size={18} />
                </span>
                <div className="sli-body">
                  <div className="sli-label">Penjualan</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("transaksi-beli")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate("transaksi-beli");
                }}
              >
                <span className="sli-icon">
                  <ArrowDownCircle size={18} />
                </span>
                <div className="sli-body">
                  <div className="sli-label">Pembelian</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
              <div
                className="settings-list-item"
                role="button"
                tabIndex={0}
                onClick={() => navigate("transaksi-kunci")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ")
                    navigate("transaksi-kunci");
                }}
              >
                <span className="sli-icon">
                  <Lock size={18} />
                </span>
                <div className="sli-body">
                  <div className="sli-label">Kunci Periode</div>
                </div>
                <span className="sli-chevron">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── LEVEL 2: TRANSAKSI > PENJUALAN ── */}
        {currentView === "transaksi-jual" ? (
          <div className="settings-view active">
            <div className="accs-info-box">
              Atur akun mana yang dipakai untuk tiap jenis penjualan. Defaultnya
              mengikuti akun bawaan (kode di bawah kode default) — ubah kalau
              kamu mau pakai akun lain, misalnya karena akun bawaannya sudah
              dihapus dari COA.
            </div>
            <div>
              {renderAkunMappingList("jual", JUAL_AKUN_SETTINGS_OPTIONS)}
              <div
                style={{
                  marginTop: "10px",
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginBottom: "8px",
                  }}
                >
                  HPP &amp; Persediaan (dulu diset per-produk di Master Produk)
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Akun HPP (default)</label>
                    <input
                      type="text"
                      value={trxSettings.jualHpp || ""}
                      placeholder="5101 (otomatis)"
                      onChange={(e) =>
                        handleUpdateHppPersediaan("jualHpp", e.target.value)
                      }
                      style={{ fontFamily: "var(--mono)" }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Akun Persediaan (default)</label>
                    <input
                      type="text"
                      value={trxSettings.jualPersediaan || ""}
                      placeholder="Kosongkan = tebak otomatis"
                      onChange={(e) =>
                        handleUpdateHppPersediaan(
                          "jualPersediaan",
                          e.target.value
                        )
                      }
                      style={{ fontFamily: "var(--mono)" }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  Kosongkan Akun Persediaan supaya tetap pakai deteksi otomatis
                  per kategori produk (dagang/bahan baku/barang jadi).
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── LEVEL 2: TRANSAKSI > PEMBELIAN ── */}
        {currentView === "transaksi-beli" ? (
          <div className="settings-view active">
            <div className="accs-info-box">
              Atur akun mana yang dipakai untuk tiap jenis pembelian.
            </div>
            <div>
              {renderAkunMappingList("beli", BELI_AKUN_SETTINGS_OPTIONS)}
            </div>
          </div>
        ) : null}

        {/* ── LEVEL 2: TRANSAKSI > KUNCI PERIODE ── */}
        {currentView === "transaksi-kunci" ? (
          <div className="settings-view active">
            <div style={{ padding: "4px 2px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "14px",
                }}
              >
                <div style={{ fontSize: "13px" }}>
                  {kunciSampai ? (
                    <>
                      Periode sampai <b>{fmtDate(kunciSampai)}</b> dikunci.
                    </>
                  ) : (
                    "Belum ada periode yang dikunci."
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setKunciInfoOpen((v) => !v)}
                  aria-expanded={kunciInfoOpen}
                  title="Penjelasan kunci periode"
                  style={{
                    flex: "none",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    border: `1px solid ${kunciInfoOpen ? "var(--accent)" : "var(--border)"}`,
                    background: "var(--surface2)",
                    color: kunciInfoOpen ? "var(--accent)" : "var(--muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  <Info size={16} />
                </button>
              </div>

              {kunciInfoOpen ? (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.65,
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  Jurnal bertanggal pada atau sebelum tanggal kunci tidak bisa
                  ditambah. Untuk mengoreksi jurnal di periode terkunci, buat
                  jurnal pembalik bertanggal setelah tanggal kunci. Tutup Buku
                  (Jurnal Penutup) otomatis mengunci sampai akhir tahun bukunya.
                  Kunci ini ditegakkan oleh aplikasi; untuk perlindungan penuh
                  terhadap akses langsung ke database, perlu aturan tambahan di
                  Supabase.
                </div>
              ) : null}

              {isAdminUser ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <label
                      htmlFor="kunci-periode-tgl"
                      style={{ fontSize: "12px", color: "var(--muted)" }}
                    >
                      Kunci semua jurnal sampai tanggal
                    </label>
                    <input
                      type="date"
                      id="kunci-periode-tgl"
                      value={kunciInput}
                      onChange={(e) => setKunciInput(e.target.value)}
                      style={{ width: "100%", margin: 0 }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "16px",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => void handleSimpanKunci()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Lock size={14} /> Simpan Kunci
                    </button>
                    {kunciSampai ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => void handleBukaKunci()}
                      >
                        Buka Kunci
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Hanya admin yang bisa mengubah kunci periode.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ═══ MODAL UBAH / TAMBAH PASSWORD ═══ */}
      <OasModalDialog
        id="modal-ubah-password"
        open={pwModalOpen}
        onClose={() => setPwModalOpen(false)}
        maxWidth="420px"
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Lock size={15} /> {pwActionText}
          </span>
        }
      >
        {hasPw ? (
          <div className="accs-field">
            <label htmlFor="accs-input-pw-old">PASSWORD LAMA</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwOld ? "text" : "password"}
                id="accs-input-pw-old"
                placeholder="Password saat ini"
                style={{ paddingRight: "44px" }}
                value={pwOld}
                onChange={(e) => setPwOld(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPwOld((v) => !v)}
                className="auth-pw-toggle"
              >
                {showPwOld ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ) : null}

        <div className="accs-field">
          <label htmlFor="accs-input-pw1">PASSWORD BARU</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw1 ? "text" : "password"}
              id="accs-input-pw1"
              placeholder="Minimal 6 karakter"
              style={{ paddingRight: "44px" }}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw1((v) => !v)}
              className="auth-pw-toggle"
            >
              {showPw1 ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="accs-field">
          <label htmlFor="accs-input-pw2">KONFIRMASI PASSWORD BARU</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw2 ? "text" : "password"}
              id="accs-input-pw2"
              placeholder="Ulangi password"
              style={{ paddingRight: "44px" }}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw2((v) => !v)}
              className="auth-pw-toggle"
            >
              {showPw2 ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="auth-btn-primary"
          disabled={savingPw}
          onClick={() => void handleSavePassword()}
          style={{
            marginTop: "4px",
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Lock size={14} /> {savingPw ? "Menyimpan..." : "Simpan Password"}
        </button>

        <div style={{ textAlign: "center", marginTop: "14px" }}>
          <button
            type="button"
            className="auth-forgot"
            onClick={() => void handleForgotPassword()}
            style={{
              fontSize: "12px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Lupa password?
          </button>
        </div>
      </OasModalDialog>
    </div>
  );
}
