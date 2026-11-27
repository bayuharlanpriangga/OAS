import { hasPerm, isAdmin } from "@/lib/cloud/audit-permission";
import { modulUntukHalaman } from "@/lib/lainnya/audit-tim";
import { escapeHtml } from "@/lib/shared/format";
import {
  callOasGlobal,
  getLegacyKsStore,
  getWin,
  readAkuns,
  readMultiKartuStock,
} from "@/lib/shared/legacy-store";
import type { Akun } from "@/types";
import { setCurrentPage } from "./runtime-store";

export const THEME_KEY = "oas_theme";

export const PAGE_TITLES: Record<string, [string, string]> = {
  dashboard: ["Dashboard", "Ringkasan keuangan bisnis Anda"],
  pembelian: ["Pembelian", "Pesanan pembelian dan pembelian langsung"],
  "pesanan-pembelian": [
    "Pesanan Pembelian",
    "Daftar pesanan pembelian dan penerimaan barang ke gudang",
  ],
  penjualan: ["Penjualan", "Pesanan penjualan dan penjualan langsung"],
  pengiriman: [
    "Pengiriman",
    "Daftar kategori jasa pengirim dan alamat ekspedisi",
  ],
  transaksi: ["Input Transaksi", "Tambah transaksi baru"],
  "jurnal-umum": ["Jurnal Umum", "Semua entri jurnal"],
  "jurnal-kas": ["Jurnal Kas", "Penerimaan dan pengeluaran kas"],
  "jurnal-penjualan": ["Jurnal Penjualan", "Transaksi penjualan"],
  "jurnal-pembelian": ["Jurnal Pembelian", "Transaksi pembelian"],
  "buku-besar": ["Buku Besar", "Mutasi per akun"],
  "neraca-saldo": ["Neraca Saldo", "Saldo semua akun"],
  "laba-rugi": ["Laporan Laba Rugi", "Pendapatan & beban"],
  neraca: ["Neraca", "Posisi keuangan"],
  akun: ["Chart of Accounts", "Daftar akun"],
  "kalk-penyusutan": [
    "Penyusutan Aset",
    "Garis lurus, saldo menurun, SYD, dan unit produksi",
  ],
  "kalk-persediaan": [
    "Persediaan",
    "Multi gudang, rak penyimpanan, daftar barang, dan transfer stok",
  ],
  "kalk-bunga": [
    "Bunga & Anuitas",
    "Bunga tunggal, majemuk, cicilan, dan PV/FV",
  ],
  "kalk-rasio": [
    "Rasio Keuangan",
    "Likuiditas, solvabilitas, profitabilitas, dan aktivitas",
  ],
  "kalk-bep": [
    "BEP & Margin",
    "Titik impas, margin kontribusi, dan batas aman",
  ],
  "ai-assistant": [
    "Orias Assisten",
    "Asisten akuntansi dan pencatatan jurnal",
  ],
  tutorial: ["Tutorial", "Panduan penggunaan langkah demi langkah"],
  analitik: [
    "Analitik & Tren Bisnis",
    "Pendapatan, laba, arus kas, dan proyeksi",
  ],
  "jurnal-berulang": [
    "Jurnal Berulang",
    "Otomasi transaksi rutin seperti gaji, sewa, dan cicilan",
  ],
  invoice: [
    "Invoice & Piutang",
    "Buat invoice, lacak pembayaran, dan jurnal otomatis",
  ],
  "pesanan-jual": [
    "Pesanan Penjualan",
    "Daftar pesanan penjualan dari dikemas, menunggu, hingga selesai",
  ],
  rekonsiliasi: [
    "Rekonsiliasi Bank",
    "Cocokkan mutasi bank CSV dengan catatan jurnal",
  ],
  anggaran: [
    "Anggaran vs Aktual",
    "Target per akun, realisasi, dan selisih anggaran",
  ],
  pajak: [
    "Pajak Otomatis",
    "Perhitungan PPN, PPh 21, PPh 23, dan rekap SPT",
  ],
  "arus-kas": ["Laporan Arus Kas", "Metode tidak langsung (PSAK 2)"],
  "perubahan-ekuitas": [
    "Laporan Perubahan Ekuitas",
    "Mutasi modal pemilik (PSAK 1)",
  ],
  produk: ["Master Produk", "Daftar produk, layanan, stok, dan harga jual"],
  "aset-tetap": [
    "Register Aset Tetap",
    "Daftar aset, penyusutan otomatis, dan nilai buku",
  ],
  kontak: ["Master Kontak", "Pelanggan, supplier, dan histori transaksi"],
  "audit-trail": [
    "Audit Trail",
    "Riwayat aktivitas pengguna dan perubahan data",
  ],
  settings: ["Settings", "Akun, autentikasi & pengaturan transaksi"],
};

let pageHistory: string[] = ["dashboard"];
let isNavigating = false;
let navLifecycleBound = false;

function isInIframe(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function safeHistoryPush(
  state: unknown,
  title: string,
  url: string
): void {
  if (typeof window === "undefined" || isInIframe()) return;
  try {
    window.history.pushState(state, title, url);
  } catch {
    // blocked in sandboxed iframe
  }
}

export function safeHistoryReplace(
  state: unknown,
  title: string,
  url: string
): void {
  if (typeof window === "undefined" || isInIframe()) return;
  try {
    window.history.replaceState(state, title, url);
  } catch {
    // blocked in sandboxed iframe
  }
}

export function toggleSidebar(): void {
  if (typeof document === "undefined") return;
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebar-overlay")?.classList.toggle("open");
}

export function closeSidebar(): void {
  if (typeof document === "undefined") return;
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebar-overlay")?.classList.remove("open");
}

export function showPage(rawId: string): void {
  if (typeof document === "undefined") return;
  const id = rawId === "produk" ? "kalk-persediaan" : rawId;

  // Cek permission sebelum buka halaman
  if (id === "audit-trail" && !isAdmin()) {
    callOasGlobal(
      "showAlert",
      "⛔ Akses ditolak.\n\nAudit Trail hanya dapat diakses oleh Admin atau Pemilik bisnis."
    );
    return;
  }
  const modulIzin = modulUntukHalaman(id);
  if (id !== "dashboard" && id !== "settings" && modulIzin && !isAdmin()) {
    if (!hasPerm(modulIzin, "read")) {
      callOasGlobal(
        "showAlert",
        "⛔ Akses ditolak.\n\nKamu tidak punya izin untuk membuka modul ini.\nHubungi admin untuk mengatur ulang hak akses."
      );
      return;
    }
  }

  document.querySelectorAll<HTMLElement>(".page").forEach((p) => {
    p.classList.remove("active");
    p.style.display = "none";
  });
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.querySelectorAll(".nav-card").forEach((n) => n.classList.remove("active"));

  const activePage = document.getElementById("page-" + id);
  if (activePage) {
    activePage.classList.add("active");
    activePage.style.display = id === "audit-trail" ? "flex" : "block";
  }

  document.querySelectorAll<HTMLElement>(".nav-item").forEach((n) => {
    const oc = n.getAttribute("onclick") || "";
    if (oc === `showPage('${id}')`) n.classList.add("active");
  });
  document.querySelectorAll<HTMLElement>(".nav-card[data-page]").forEach((n) => {
    if (n.dataset.page === id) n.classList.add("active");
  });

  if (!isNavigating) {
    safeHistoryPush({ page: id }, "", "#" + id);
    if (pageHistory[pageHistory.length - 1] !== id) pageHistory.push(id);
  }

  const t = PAGE_TITLES[id] || [id, ""];
  const titleEl = document.getElementById("page-title");
  const subEl = document.getElementById("page-sub");
  if (titleEl) titleEl.textContent = t[0];
  if (subEl) subEl.textContent = t[1];

  setCurrentPage(id);

  // Trigger render per halaman
  if (id === "dashboard") {
    callOasGlobal("renderDashboard");
  } else if (id.startsWith("kalk")) {
    setTimeout(() => callOasGlobal("setupNumberInputs"), 200);
  }

  if (id === "jurnal-umum") {
    callOasGlobal("renderJurnalUmum");
  } else if (id === "settings") {
    callOasGlobal("settingsResetTo", ["root"]);
  } else if (id === "jurnal-kas") {
    callOasGlobal("renderJurnalKas");
  } else if (id === "jurnal-penjualan") {
    callOasGlobal("renderJurnalPenjualan");
  } else if (id === "jurnal-pembelian") {
    callOasGlobal("renderJurnalPembelian");
  } else if (id === "buku-besar") {
    callOasGlobal("renderBukuBesar");
  } else if (id === "neraca-saldo") {
    callOasGlobal("renderNeracaSaldo");
  } else if (id === "laba-rugi") {
    callOasGlobal("renderLabaRugi");
  } else if (id === "neraca") {
    callOasGlobal("renderNeraca");
  } else if (id === "arus-kas") {
    callOasGlobal("renderArusKas");
  } else if (id === "perubahan-ekuitas") {
    callOasGlobal("renderPerubahanEkuitas");
  } else if (id === "aset-tetap") {
    setTimeout(() => {
      callOasGlobal("renderAsetTetap");
      callOasGlobal("renderAsetTetapKPI");
    }, 60);
  } else if (id === "kontak") {
    setTimeout(() => {
      callOasGlobal("renderKontak");
      callOasGlobal("renderKontakKPI");
    }, 60);
  } else if (id === "kalk-persediaan") {
    setTimeout(() => {
      const ksStore = getLegacyKsStore();
      const ids = ksStore?.getActiveIds?.() ?? { cardId: null, katId: null };
      const mks = readMultiKartuStock();
      let cardId = ids.cardId;
      let katId = ids.katId;
      if (!cardId) {
        const firstCard = Object.values(mks)[0];
        if (firstCard) {
          cardId = firstCard.id;
          katId = firstCard.kategori ? Object.keys(firstCard.kategori)[0] : null;
        }
      }
      if (!katId && cardId) {
        const card = mks[cardId];
        if (card?.kategori) katId = Object.keys(card.kategori)[0] ?? null;
      }
      if (cardId) ksStore?.setActiveKartuStock?.(cardId, katId);
      callOasGlobal("syncKartuStockDataFromKategori");
      callOasGlobal("renderKartuStockSelector");
      callOasGlobal("renderKartuStock");
    }, 60);
  } else if (id === "akun") {
    callOasGlobal("renderAkun");
  } else if (id === "pembelian") {
    setTimeout(() => callOasGlobal("renderPembelianPage"), 50);
  } else if (id === "pesanan-pembelian") {
    setTimeout(() => callOasGlobal("renderPesananPembelianPage"), 50);
  } else if (id === "penjualan") {
    setTimeout(() => callOasGlobal("renderPenjualanPage"), 50);
  } else if (id === "pengiriman") {
    setTimeout(() => callOasGlobal("renderPengirimanPage"), 50);
  } else if (id === "transaksi") {
    callOasGlobal("initTransaksiForm");
  } else if (id === "analitik") {
    setTimeout(() => callOasGlobal("renderAnalitik"), 60);
  } else if (id === "jurnal-berulang") {
    setTimeout(() => callOasGlobal("renderJurnalBerulang"), 60);
  } else if (id === "invoice") {
    setTimeout(() => {
      callOasGlobal("renderInvoiceList");
      callOasGlobal("renderInvoiceKPI");
    }, 60);
  } else if (id === "pesanan-jual") {
    const win = getWin();
    if (typeof win?.renderPesananList === "function") {
      callOasGlobal("renderPesananList");
    } else {
      callOasGlobal("renderPesananJual");
    }
  } else if (id === "anggaran") {
    setTimeout(() => callOasGlobal("renderAnggaranPage"), 60);
  } else if (id === "pajak") {
    setTimeout(() => callOasGlobal("renderPajakOtomatis"), 60);
  } else if (id === "audit-trail") {
    setTimeout(() => callOasGlobal("initAuditPage"), 60);
  }
}

export function handleAddBtn(): void {
  showPage("pembelian");
}

export function populateAkunSelect(
  selId: string,
  filter?: ((a: Akun) => boolean) | null
): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(selId) as HTMLSelectElement | null;
  if (!el || (el as unknown as HTMLInputElement).type === "hidden") return;
  el.innerHTML = "";
  readAkuns()
    .filter((a) => !filter || filter(a))
    .forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.kode;
      opt.textContent = `${escapeHtml(a.kode)} - ${escapeHtml(a.nama)}`;
      el.appendChild(opt);
    });
}

// ── THEME SYSTEM ────────────────────────────────────────────────────────

export function syncPwaThemeChrome(mode: "light" | "dark"): void {
  if (typeof document === "undefined") return;
  try {
    const isLight = mode === "light";
    const bg = isLight ? "#EEF1F4" : "#0D0D0D";
    const metaTC = document.getElementById("meta-theme-color");
    if (metaTC) metaTC.setAttribute("content", bg);
    const metaCS = document.getElementById("meta-color-scheme");
    if (metaCS) metaCS.setAttribute("content", isLight ? "light" : "dark");
  } catch {
    // ignore
  }
}

export function applyTheme(rawMode: string): void {
  if (typeof document === "undefined") return;
  const mode: "light" | "dark" = rawMode === "light" ? "light" : "dark";
  const body = document.body;
  const thumb = document.getElementById("theme-thumb");
  const navIcon = document.getElementById("theme-nav-icon");
  const navLabel = document.getElementById("theme-nav-label");
  const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;

  if (mode === "light") {
    document.documentElement.classList.add("light-mode");
    body.classList.add("light-mode");
    if (thumb) thumb.innerHTML = sunSVG;
    if (navIcon) navIcon.innerHTML = sunSVG;
    if (navLabel) navLabel.textContent = "Tema Terang";
  } else {
    document.documentElement.classList.remove("light-mode");
    body.classList.remove("light-mode");
    if (thumb) thumb.innerHTML = moonSVG;
    if (navIcon) navIcon.innerHTML = moonSVG;
    if (navLabel) navLabel.textContent = "Tema Gelap";
  }

  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // ignore
  }
  syncPwaThemeChrome(mode);
  setTimeout(() => callOasGlobal("renderChart"), 50);
}

export function initTheme(): void {
  if (typeof window === "undefined") return;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // ignore
  }
  if (saved) {
    applyTheme(saved);
  } else {
    const preferLight =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(preferLight ? "light" : "dark");
  }
}

export function toggleTheme(): void {
  if (typeof document === "undefined") return;
  const isLight = document.body.classList.contains("light-mode");
  applyTheme(isLight ? "dark" : "light");
}

// ── PENYESUAIAN & TUTORIAL SHORTCUTS ────────────────────────────────────

export function openJurnalPenyesuaian(): void {
  callOasGlobal("deteksiPenyesuaianOtomatis");
}

export function dismissAndOpenPenyesuaian(dismissKey?: string): void {
  if (dismissKey && typeof window !== "undefined") {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      // ignore
    }
  }
  openJurnalPenyesuaian();
}

export function startTutorial(): void {
  showPage("tutorial");
}

// ── LIFECYCLE INIT (popstate + initial hash) ────────────────────────────

export function initNavigationLifecycle(): void {
  if (typeof window === "undefined" || navLifecycleBound) return;
  navLifecycleBound = true;

  initTheme();

  if (!isInIframe()) {
    window.addEventListener("popstate", (e) => {
      isNavigating = true;
      const state = e.state as { page?: string } | null;
      if (state?.page) {
        showPage(state.page);
        const idx = pageHistory.lastIndexOf(state.page);
        if (idx >= 0) pageHistory = pageHistory.slice(0, idx + 1);
      } else if (pageHistory.length > 1) {
        pageHistory.pop();
        const prev = pageHistory[pageHistory.length - 1];
        showPage(prev);
        safeHistoryPush({ page: prev }, "", "#" + prev);
      } else {
        safeHistoryPush({ page: "dashboard" }, "", "#dashboard");
        showPage("dashboard");
      }
      isNavigating = false;
    });

    const hash = window.location.hash.replace("#", "");
    const validPages = Object.keys(PAGE_TITLES);
    const initial = hash && validPages.includes(hash) ? hash : "dashboard";
    if (initial !== "dashboard") {
      showPage(initial);
    }
    safeHistoryReplace({ page: initial }, "", "#" + initial);
    pageHistory = [initial];
  }
}
