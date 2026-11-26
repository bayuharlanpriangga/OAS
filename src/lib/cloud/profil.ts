import { callOasGlobal, getWin } from "@/lib/shared/legacy-store";

export const PROFIL_KEY = "oas_profil_v1";
export const COMPANY_LOGO_KEY = "oas_company_logo";
export const ONBOARDED_KEY = "oas_onboarded";

export interface ProfilPerusahaan {
  nama?: string;
  jenis?: string;
  pemilik?: string;
  alamat?: string;
  telp?: string;
  npwp?: string;
  email?: string;
  website?: string;
  provinsi?: string;
  kabkota?: string;
  kecamatan?: string;
  kelurahan?: string;
  tahunBuku?: string;
  matauang?: string;
  [key: string]: unknown;
}

export interface OptionItem {
  value: string;
  label: string;
  sub: string;
  iconClass?: string;
  symbol?: string;
}

export const TAHUN_BUKU_OPTIONS: OptionItem[] = [
  {
    value: "jan",
    label: "Januari - Desember",
    sub: "Fiskal kalender standar",
    iconClass: "ti ti-calendar",
  },
  {
    value: "apr",
    label: "April - Maret",
    sub: "Fiskal tahunan April",
    iconClass: "ti ti-flower",
  },
  {
    value: "jul",
    label: "Juli - Juni",
    sub: "Fiskal semester tengah",
    iconClass: "ti ti-sun",
  },
  {
    value: "okt",
    label: "Oktober - September",
    sub: "Fiskal kuartal akhir",
    iconClass: "ti ti-leaf",
  },
];

export const MATA_UANG_OPTIONS: OptionItem[] = [
  {
    value: "IDR",
    label: "IDR · Rupiah",
    sub: "Rupiah Indonesia",
    symbol: "Rp",
  },
  {
    value: "USD",
    label: "USD · Dollar",
    sub: "Dolar Amerika Serikat",
    symbol: "$",
  },
  {
    value: "SGD",
    label: "SGD · Singapore Dollar",
    sub: "Dolar Singapura",
    symbol: "S$",
  },
  {
    value: "EUR",
    label: "EUR · Euro",
    sub: "Euro Eropa",
    symbol: "€",
  },
  {
    value: "MYR",
    label: "MYR · Ringgit",
    sub: "Ringgit Malaysia",
    symbol: "RM",
  },
  {
    value: "JPY",
    label: "JPY · Yen",
    sub: "Yen Jepang",
    symbol: "¥",
  },
];

export const OB_BUSINESS_TYPES = [
  {
    val: "umum",
    label: "Umum",
    desc: "Belum tahu / lainnya",
    iconClass: "ti ti-building-skyscraper",
    fullWidth: false,
  },
  {
    val: "dagang",
    label: "Dagang / Toko",
    desc: "Toko, reseller, distributor",
    iconClass: "ti ti-shopping-cart",
    fullWidth: false,
  },
  {
    val: "jasa",
    label: "Jasa",
    desc: "Konsultan, klinik, salon, agensi",
    iconClass: "ti ti-briefcase",
    fullWidth: false,
  },
  {
    val: "manufaktur",
    label: "Manufaktur",
    desc: "Pabrik, produksi, UMKM",
    iconClass: "ti ti-industry",
    fullWidth: false,
  },
  {
    val: "properti",
    label: "Properti",
    desc: "Kos, kontrakan, rental",
    iconClass: "ti ti-home",
    fullWidth: true,
  },
] as const;

export function getProfil(): ProfilPerusahaan {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROFIL_KEY) || "{}") as ProfilPerusahaan;
  } catch {
    return {};
  }
}

export function saveProfilLocal(p: ProfilPerusahaan): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFIL_KEY, JSON.stringify(p));
  } catch {
    // ignore quota error
  }
}

export function getCompanyLogo(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(COMPANY_LOGO_KEY) || "";
  } catch {
    return "";
  }
}

export function setCompanyLogo(dataUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    if (dataUrl) {
      localStorage.setItem(COMPANY_LOGO_KEY, dataUrl);
    } else {
      localStorage.removeItem(COMPANY_LOGO_KEY);
    }
    window.dispatchEvent(
      new CustomEvent("oas:company-logo-updated", { detail: { logo: dataUrl } })
    );
  } catch {
    // ignore
  }
}

// Registry modal React sehingga openModal(id) juga membuka dialog React dengan mulus
const modalOpeners = new Map<string, () => void>();
const modalClosers = new Map<string, () => void>();

export function registerReactModal(
  id: string,
  openFn: () => void,
  closeFn?: () => void
): () => void {
  modalOpeners.set(id, openFn);
  if (closeFn) modalClosers.set(id, closeFn);
  return () => {
    if (modalOpeners.get(id) === openFn) modalOpeners.delete(id);
    if (closeFn && modalClosers.get(id) === closeFn) modalClosers.delete(id);
  };
}

export function openModal(id: string): void {
  const opener = modalOpeners.get(id);
  if (opener) {
    opener();
    return;
  }
  if (typeof document === "undefined") return;
  document.getElementById(id)?.classList.add("open");
}

export function closeModalReactAware(id: string): void {
  const closer = modalClosers.get(id);
  if (closer) {
    closer();
  }
  if (typeof document !== "undefined") {
    document.getElementById(id)?.classList.remove("open");
  }
}

export function handleLogoUpload(input: HTMLInputElement | null): void {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    callOasGlobal("showAlert", "Ukuran logo max 5MB.");
    input.value = "";
    return;
  }
  const isFromExport = input.id === "exp-logo-input";
  const reader = new FileReader();
  reader.onload = (e) => {
    const imgSrc = String(e.target?.result || "");
    const win = getWin();
    const openCrop = win?.openCropModal as
      | ((opts: {
          imgSrc: string;
          shape: string;
          outputSize: number;
          title: string;
          onConfirm: (croppedDataURL: string) => void;
        }) => void)
      | undefined;

    const applyResult = (croppedDataURL: string) => {
      if (isFromExport) {
        if (win) win.exportLogoDataUrl = croppedDataURL;
        const img = document.getElementById("exp-logo-img") as HTMLImageElement | null;
        const placeholder = document.getElementById("exp-logo-placeholder");
        const removeBtn = document.getElementById("exp-logo-remove-btn");
        if (img) {
          img.src = croppedDataURL;
          img.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
        if (removeBtn) removeBtn.style.display = "block";
        const box = document.getElementById("exp-logo-preview-box");
        if (box) {
          box.style.borderStyle = "solid";
          box.style.borderColor = "var(--accent)";
        }
      } else {
        setCompanyLogo(croppedDataURL);
        callOasGlobal("_applyCompanyLogo", croppedDataURL);
      }
    };

    if (typeof openCrop === "function") {
      openCrop({
        imgSrc,
        shape: "rounded",
        outputSize: 300,
        title: "Sesuaikan Logo Perusahaan",
        onConfirm: applyResult,
      });
    } else {
      applyResult(imgSrc);
    }
  };
  reader.readAsDataURL(file);
  input.value = "";
}

export function loadProfilToSidebar(): void {
  // Logo OAS tidak diubah — nama perusahaan bukan nama app.
  // Chip akan diupdate oleh updateGuestChip() atau updateUserChip().
}

export function showDemoModeBanner(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("demo-banner")) return;
  const banner = document.createElement("div");
  banner.id = "demo-banner";
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span><b>Mode Demo</b> · Data tersimpan di browser. Untuk cloud &amp; multi-user:</span>
      <button onclick="showSupabaseSetup()" style="background:var(--accent);border:none;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer;color:var(--accent-fg);font-size:12px;white-space:nowrap;">Setup Supabase ›</button>
      <button onclick="document.getElementById('demo-banner').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px;margin-left:auto;">✕</button>
    </div>`;
  banner.style.cssText =
    "position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:1px solid var(--border);padding:10px 16px;z-index:5000;font-size:13px;";
  document.body.appendChild(banner);
}

export function closeInvMetodeSheet(): void {
  callOasGlobal("closeOptPicker");
  if (typeof document !== "undefined") {
    const bd = document.getElementById("inv-metode-sheet-backdrop");
    if (bd) bd.style.display = "none";
  }
}

export function openPhotoViewer(src: string, shape?: string): void {
  if (!src) return;
  const win = getWin();
  if (typeof win?.openPhotoViewer === "function" && win.openPhotoViewer !== openPhotoViewer) {
    (win.openPhotoViewer as (s: string, sh?: string) => void)(src, shape);
    return;
  }
  if (typeof document === "undefined") return;
  const overlay = document.getElementById("photo-viewer-overlay");
  const frame = document.getElementById("photo-viewer-frame");
  const img = document.getElementById("photo-viewer-img") as HTMLImageElement | null;
  if (!overlay || !img || !frame) return;
  img.src = src;
  frame.className = shape === "circle" ? "circle" : "rounded";
  overlay.classList.add("open");
}

let mobileKbFixInstalled = false;

export function initMobileKeyboardScrollFix(): void {
  if (typeof window === "undefined" || mobileKbFixInstalled) return;
  mobileKbFixInstalled = true;

  const scrollInputIntoView = (el: HTMLElement) => {
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        let parent = el.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const overflow = style.overflowY;
          if (overflow === "auto" || overflow === "scroll") {
            const elRect = el.getBoundingClientRect();
            if (elRect.bottom > window.innerHeight * 0.55) {
              parent.scrollTop += elRect.bottom - window.innerHeight * 0.45;
            }
            break;
          }
          parent = parent.parentElement;
        }
      } catch {
        // ignore
      }
    }, 350);
  };

  document.addEventListener(
    "focusin",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (window.innerWidth <= 768) {
          scrollInputIntoView(target);
        }
      }
    },
    true
  );

  let lastVH = window.visualViewport
    ? window.visualViewport.height
    : window.innerHeight;

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      if (!window.visualViewport) return;
      const currentVH = window.visualViewport.height;
      const diff = lastVH - currentVH;
      lastVH = currentVH;
      if (diff > 100) {
        const focused = document.activeElement as HTMLElement | null;
        if (
          focused &&
          (focused.tagName === "INPUT" || focused.tagName === "TEXTAREA")
        ) {
          scrollInputIntoView(focused);
        }
      }
    });
  }
}
