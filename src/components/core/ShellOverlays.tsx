"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { showPage } from "@/lib/core/navigation-theme";
import {
  registerShellOverlayCallbacks,
  type CropModalConfig,
  type OptPickerConfig,
  type OptPickerOption,
} from "@/lib/core/ui-widgets";
import { fmtRp } from "@/lib/shared/format";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
} from "@/lib/shared/legacy-store";

interface SearchItem {
  icon: string;
  title: string;
  sub: string;
  type: "page" | "aksi" | "jurnal" | "akun";
  badge?: string;
  action: () => void;
}

const STATIC_SEARCH_PAGES: Array<{
  icon: string;
  title: string;
  sub: string;
  page: string;
}> = [
  { icon: "ti-layout-dashboard", title: "Dashboard", sub: "Ringkasan keuangan", page: "dashboard" },
  { icon: "ti-shopping-cart", title: "Pembelian", sub: "Pesanan pembelian & pembelian langsung", page: "pembelian" },
  { icon: "ti-clipboard-list", title: "Pesanan Pembelian", sub: "Daftar PO & penerimaan barang", page: "pesanan-pembelian" },
  { icon: "ti-receipt", title: "Penjualan", sub: "Pesanan penjualan & penjualan langsung", page: "penjualan" },
  { icon: "ti-clipboard-list", title: "Pesanan Penjualan", sub: "Daftar pesanan dikemas, menunggu & selesai", page: "pesanan-jual" },
  { icon: "ti-truck", title: "Pengiriman", sub: "Kategori jasa pengiriman & ekspedisi", page: "pengiriman" },
  { icon: "ti-book", title: "Jurnal Umum", sub: "Semua entri jurnal", page: "jurnal-umum" },
  { icon: "ti-cash", title: "Jurnal Kas", sub: "Mutasi kas", page: "jurnal-kas" },
  { icon: "ti-receipt", title: "Jurnal Penjualan", sub: "Transaksi penjualan", page: "jurnal-penjualan" },
  { icon: "ti-shopping-cart", title: "Jurnal Pembelian", sub: "Transaksi pembelian", page: "jurnal-pembelian" },
  { icon: "ti-books", title: "Buku Besar", sub: "Mutasi per akun", page: "buku-besar" },
  { icon: "ti-scale", title: "Neraca Saldo", sub: "Saldo semua akun", page: "neraca-saldo" },
  { icon: "ti-trending-up", title: "Laba Rugi", sub: "Laporan laba rugi", page: "laba-rugi" },
  { icon: "ti-building-bank", title: "Neraca", sub: "Balance sheet", page: "neraca" },
  { icon: "ti-arrows-exchange", title: "Arus Kas", sub: "Laporan arus kas", page: "arus-kas" },
  { icon: "ti-chart-area", title: "Perubahan Ekuitas", sub: "Laporan perubahan ekuitas", page: "perubahan-ekuitas" },
  { icon: "ti-chart-bar", title: "Analitik", sub: "Grafik analitik bisnis", page: "analitik" },
  { icon: "ti-package", title: "Persediaan", sub: "Multi gudang, rak & transfer stok", page: "kalk-persediaan" },
  { icon: "ti-list", title: "Chart of Accounts", sub: "Daftar akun", page: "akun" },
  { icon: "ti-building-factory", title: "Aset Tetap", sub: "Daftar aset tetap", page: "aset-tetap" },
  { icon: "ti-users", title: "Kontak", sub: "Pelanggan & pemasok", page: "kontak" },
  { icon: "ti-building-factory-2", title: "Kalkulator Penyusutan", sub: "Hitung depresiasi aset", page: "kalk-penyusutan" },
  { icon: "ti-chart-candle", title: "Kalkulator Bunga", sub: "Anuitas, cicilan, PV/FV", page: "kalk-bunga" },
  { icon: "ti-ruler", title: "Kalkulator Rasio", sub: "Analisis rasio keuangan", page: "kalk-rasio" },
  { icon: "ti-bolt", title: "Kalkulator BEP", sub: "Break even point", page: "kalk-bep" },
  { icon: "ti-refresh", title: "Jurnal Berulang", sub: "Template transaksi otomatis", page: "jurnal-berulang" },
  { icon: "ti-file-invoice", title: "Invoice", sub: "Invoice & piutang", page: "invoice" },
  { icon: "ti-git-compare", title: "Rekonsiliasi", sub: "Rekonsiliasi bank", page: "rekonsiliasi" },
  { icon: "ti-target", title: "Anggaran", sub: "Anggaran vs aktual", page: "anggaran" },
  { icon: "ti-receipt-tax", title: "Pajak Auto", sub: "Kalkulasi pajak otomatis", page: "pajak" },
  { icon: "ti-robot", title: "Orias Assisten", sub: "AI akuntansi", page: "ai-assistant" },
  { icon: "ti-school", title: "Tutorial", sub: "Panduan penggunaan", page: "tutorial" },
  { icon: "ti-shield-check", title: "Audit Trail", sub: "Riwayat aktivitas", page: "audit-trail" },
  { icon: "ti-settings", title: "Settings", sub: "Pengaturan akun & transaksi", page: "settings" },
];

export function ShellOverlays() {
  // ── 1. Option Picker state ──
  const [optConfig, setOptConfig] = useState<OptPickerConfig | null>(null);
  const optConfigRef = useRef<OptPickerConfig | null>(null);
  optConfigRef.current = optConfig;

  // ── 2. Global Search state ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIdx, setSearchIdx] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // ── 3. Photo Viewer state ──
  const [photoViewer, setPhotoViewer] = useState<{
    src: string;
    shape: "circle" | "rounded";
  } | null>(null);

  // ── 4. Image Crop state ──
  const [cropConfig, setCropConfig] = useState<CropModalConfig | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const cropWinRef = useRef<HTMLDivElement | null>(null);
  const cropGeoRef = useRef({
    naturalW: 0,
    naturalH: 0,
    fittedW: 0,
    fittedH: 0,
    winSize: 0,
    winLeft: 0,
    winTop: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinchDist: null as number | null,
  });

  const closeOpt = useCallback(() => {
    const cfg = optConfigRef.current;
    if (cfg?.btnEl) cfg.btnEl.classList.remove("open");
    document.body.style.overflow = "";
    setOptConfig(null);
  }, []);

  const handleSelectOpt = useCallback(
    (opt: OptPickerOption) => {
      const cfg = optConfigRef.current;
      if (!cfg) return;
      if (cfg.selectEl) {
        cfg.selectEl.value = opt.value;
        cfg.selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (cfg.btnEl) {
        const lbl = cfg.btnEl.querySelector(".opt-picker-label");
        if (lbl) lbl.textContent = opt.label;
        cfg.btnEl.dataset.value = opt.value;
      }
      const prevOpts = cfg.options;
      cfg.onSelect?.(opt.value, opt.label);
      // Jika callback langsung membuka chained picker baru (options berubah), jangan tutup
      if (optConfigRef.current && optConfigRef.current.options !== prevOpts) {
        return;
      }
      setTimeout(() => {
        if (optConfigRef.current?.options === prevOpts) {
          closeOpt();
        }
      }, 140);
    },
    [closeOpt]
  );

  // Register callbacks ke ui-widgets.ts
  useEffect(() => {
    registerShellOverlayCallbacks({
      openOptPicker: (config) => {
        document.body.style.overflow = "hidden";
        setOptConfig(config);
      },
      closeOptPicker: closeOpt,
      openGlobalSearch: () => {
        setSearchQuery("");
        setSearchIdx(-1);
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 60);
      },
      closeGlobalSearch: () => {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchIdx(-1);
      },
      openPhotoViewer: (src, shape) => {
        setPhotoViewer({
          src,
          shape: shape === "circle" ? "circle" : "rounded",
        });
      },
      closePhotoViewer: () => setPhotoViewer(null),
      openCropModal: (config) => {
        setCropZoom(1);
        setCropConfig(config);
      },
    });
    return () => registerShellOverlayCallbacks(null);
  }, [closeOpt]);

  // Escape key untuk photoViewer & globalSearch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (photoViewer) setPhotoViewer(null);
      else if (searchOpen) setSearchOpen(false);
      else if (optConfig) closeOpt();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeOpt, optConfig, photoViewer, searchOpen]);

  // ── Global Search items ──
  const searchItems = useMemo<SearchItem[]>(() => {
    if (!searchOpen) return [];
    const q = searchQuery.toLowerCase().trim();
    const list: SearchItem[] = [];

    STATIC_SEARCH_PAGES.forEach((p) => {
      if (
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.sub.toLowerCase().includes(q)
      ) {
        list.push({
          icon: p.icon,
          title: p.title,
          sub: p.sub,
          type: "page",
          action: () => {
            showPage(p.page);
            setSearchOpen(false);
          },
        });
      }
    });

    const quickActions = [
      {
        icon: "ti-upload",
        title: "Export",
        sub: "Export laporan keuangan",
        fn: () => callOasGlobal("openExportModal"),
      },
      {
        icon: "ti-users",
        title: "Kelola Tim",
        sub: "Manajemen pengguna & izin akses",
        fn: () => callOasGlobal("openUserMgmtModal"),
      },
      {
        icon: "ti-login",
        title: "Gabung Bisnis",
        sub: "Gabung dengan kode undangan",
        fn: () => callOasGlobal("openJoinWithCodeModal"),
      },
    ];
    quickActions.forEach((a) => {
      if (
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.sub.toLowerCase().includes(q)
      ) {
        list.push({
          icon: a.icon,
          title: a.title,
          sub: a.sub,
          type: "aksi",
          action: () => {
            setSearchOpen(false);
            a.fn();
          },
        });
      }
    });

    if (q.length >= 2) {
      readJurnalEntries()
        .filter(
          (j) =>
            (j.ket || "").toLowerCase().includes(q) ||
            (j.no || "").toLowerCase().includes(q)
        )
        .slice(0, 5)
        .forEach((j) => {
          const tot = (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
          list.push({
            icon: "ti-book",
            title: j.ket || j.no || "Jurnal",
            sub: `${j.tanggal || ""} · ${j.no || ""} · ${fmtRp(tot)}`,
            type: "jurnal",
            badge: j.jenis,
            action: () => {
              showPage("jurnal-umum");
              setSearchOpen(false);
            },
          });
        });

      readAkuns()
        .filter(
          (a) =>
            a.nama.toLowerCase().includes(q) || a.kode.toLowerCase().includes(q)
        )
        .slice(0, 4)
        .forEach((a) => {
          list.push({
            icon: "ti-list",
            title: `${a.kode} · ${a.nama}`,
            sub: `${a.tipe} · ${a.kat || ""}`,
            type: "akun",
            action: () => {
              showPage("buku-besar");
              setSearchOpen(false);
            },
          });
        });
    }

    return list;
  }, [searchOpen, searchQuery]);

  // ── Cropper helpers ──
  const clampCrop = () => {
    const g = cropGeoRef.current;
    const iw = g.fittedW * g.scale;
    const ih = g.fittedH * g.scale;
    const minX = g.winLeft + g.winSize - iw;
    const maxX = g.winLeft;
    const minY = g.winTop + g.winSize - ih;
    const maxY = g.winTop;
    g.offsetX = Math.min(maxX, Math.max(minX, g.offsetX));
    g.offsetY = Math.min(maxY, Math.max(minY, g.offsetY));
  };

  const renderCrop = () => {
    const img = cropImgRef.current;
    if (!img) return;
    const g = cropGeoRef.current;
    img.style.width = `${g.fittedW * g.scale}px`;
    img.style.height = `${g.fittedH * g.scale}px`;
    img.style.transform = `translate(${g.offsetX}px, ${g.offsetY}px)`;
  };

  const initCropLayout = () => {
    const container = cropContainerRef.current;
    const winEl = cropWinRef.current;
    const imgEl = cropImgRef.current;
    if (!container || !winEl || !imgEl) return;

    const rect = container.getBoundingClientRect();
    const cW = rect.width || container.offsetWidth || 300;
    const cH = rect.height || container.offsetHeight || 300;
    const winSize = Math.round(Math.min(cW, cH) * 0.75);
    const winLeft = (cW - winSize) / 2;
    const winTop = (cH - winSize) / 2;

    winEl.style.width = `${winSize}px`;
    winEl.style.height = `${winSize}px`;
    winEl.style.left = `${Math.round(winLeft)}px`;
    winEl.style.top = `${Math.round(winTop)}px`;

    const nW = imgEl.naturalWidth || 1;
    const nH = imgEl.naturalHeight || 1;
    const fitScale = Math.max(winSize / nW, winSize / nH);
    const fw = nW * fitScale;
    const fh = nH * fitScale;

    const g = cropGeoRef.current;
    g.naturalW = nW;
    g.naturalH = nH;
    g.fittedW = fw;
    g.fittedH = fh;
    g.winSize = winSize;
    g.winLeft = winLeft;
    g.winTop = winTop;
    g.scale = 1;
    g.offsetX = winLeft + (winSize - fw) / 2;
    g.offsetY = winTop + (winSize - fh) / 2;
    renderCrop();
  };

  const applyCropZoom = (newScale: number, cx?: number, cy?: number) => {
    const g = cropGeoRef.current;
    const clamped = Math.min(4, Math.max(1, newScale));
    const centerX = cx ?? g.winLeft + g.winSize / 2;
    const centerY = cy ?? g.winTop + g.winSize / 2;
    const relX = centerX - g.offsetX;
    const relY = centerY - g.offsetY;
    const ratio = clamped / g.scale;
    g.offsetX = centerX - relX * ratio;
    g.offsetY = centerY - relY * ratio;
    g.scale = clamped;
    clampCrop();
    renderCrop();
    setCropZoom(clamped);
  };

  const handleConfirmCrop = () => {
    const imgEl = cropImgRef.current;
    if (!cropConfig || !imgEl) return;
    const g = cropGeoRef.current;
    const outputSize = cropConfig.outputSize || 300;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const iw = g.fittedW * g.scale;
    const scaleToNatural = g.naturalW / (iw || 1);
    const cropSrcX = (g.winLeft - g.offsetX) * scaleToNatural;
    const cropSrcY = (g.winTop - g.offsetY) * scaleToNatural;
    const cropSrcSize = g.winSize * scaleToNatural;

    ctx.drawImage(
      imgEl,
      cropSrcX,
      cropSrcY,
      cropSrcSize,
      cropSrcSize,
      0,
      0,
      outputSize,
      outputSize
    );
    const format = cropConfig.shape === "circle" ? "image/jpeg" : "image/png";
    const result = canvas.toDataURL(format, 0.88);
    const cb = cropConfig.onConfirm;
    setCropConfig(null);
    cb?.(result);
  };

  return (
    <>
      {/* 1. ALERT TOAST */}
      <div className="alert" id="alert-box" />

      {/* 2. AUTOSAVE TOAST */}
      <div
        id="autosave-toast"
        style={{
          position: "fixed",
          bottom: 80,
          right: 24,
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          borderRadius: 8,
          padding: "8px 14px",
          fontSize: 12,
          color: "var(--accent-text)",
          zIndex: 998,
          transform: "translateY(40px)",
          opacity: 0,
          transition: "all 0.3s",
          display: "flex",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        <span id="autosave-toast-icon">
          <i
            className="ti ti-device-floppy"
            style={{ fontSize: 14, verticalAlign: -2 }}
          />
        </span>
        <span id="autosave-toast-msg">Data tersimpan otomatis</span>
      </div>

      {/* 3. GLOBAL OPERATION SPINNER OVERLAY */}
      <div id="op-spinner-overlay">
        <div id="op-spinner-card">
          <div id="op-spinner-ring">
            <svg className="op-spin-svg" viewBox="0 0 44 44">
              <circle className="track" cx="22" cy="22" r="18" />
              <circle
                className="arc"
                cx="22"
                cy="22"
                r="18"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <svg className="op-check-svg" viewBox="0 0 44 44">
              <circle className="op-check-circle" cx="22" cy="22" r="18" />
              <path
                className="op-check-path"
                d="M13 22.5l6.5 6.5L31 15.5"
              />
            </svg>
          </div>
          <div id="op-spinner-label">Memproses...</div>
          <div id="op-spinner-sub" />
          <div id="op-spinner-dots">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* 4. PULL-TO-REFRESH INDICATOR */}
      <div id="ptr-indicator">
        <div id="ptr-pill">
          <div id="ptr-arrow">↓</div>
          <div id="ptr-spinner-ring">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle className="ptr-track" cx="12" cy="12" r="9" />
              <circle
                className="ptr-arc"
                cx="12"
                cy="12"
                r="9"
                strokeDashoffset="0"
              />
            </svg>
          </div>
          <span id="ptr-label">Tarik untuk refresh</span>
        </div>
      </div>

      {/* 5. GLOBAL SEARCH (Ctrl+K) */}
      <div
        id="global-search-wrap"
        className={searchOpen ? "open" : ""}
        onClick={(e) => {
          if (e.target === e.currentTarget) setSearchOpen(false);
        }}
      >
        <div id="global-search-box">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 16px 0",
            }}
          >
            <i
              className="ti ti-search"
              style={{ fontSize: 18, marginRight: 8, color: "var(--muted)" }}
            />
            <input
              ref={searchInputRef}
              id="global-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchIdx(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSearchIdx((i) => Math.min(i + 1, searchItems.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSearchIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  if (searchIdx >= 0 && searchItems[searchIdx]) {
                    searchItems[searchIdx].action();
                  }
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              placeholder="Cari jurnal, akun, menu, kalkulator..."
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: 16,
                padding: "4px 8px",
              }}
            >
              ✕
            </button>
          </div>

          <div
            id="global-search-results"
            style={{ maxHeight: 400, overflowY: "auto", padding: "8px 0" }}
          >
            {searchItems.length === 0 ? (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                {searchQuery
                  ? `Tidak ada hasil untuk "${searchQuery}"`
                  : "Ketik untuk mencari jurnal, akun, atau menu..."}
              </div>
            ) : (
              searchItems.map((item, i) => (
                <div
                  key={`${item.type}-${item.title}-${i}`}
                  className={`search-result-item${
                    i === searchIdx ? " active" : ""
                  }`}
                  onClick={item.action}
                >
                  <span className="sri-icon">
                    <i className={`ti ${item.icon} ti-inline`} />
                  </span>
                  <div className="sri-text">
                    <div className="sri-title">{item.title}</div>
                    <div className="sri-sub">{item.sub}</div>
                  </div>
                  {item.badge && (
                    <span className="badge badge-blue sri-badge">
                      {item.badge}
                    </span>
                  )}
                  {item.type === "page" && (
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>
                      Halaman
                    </span>
                  )}
                  {item.type === "aksi" && (
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>
                      Aksi
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 12,
              fontSize: 11,
              color: "var(--muted)",
            }}
          >
            <span>
              <kbd className="kbd">↑↓</kbd> navigasi
            </span>
            <span>
              <kbd className="kbd">Enter</kbd> pilih
            </span>
            <span>
              <kbd className="kbd">Esc</kbd> tutup
            </span>
          </div>
        </div>
      </div>

      {/* 6. CUSTOM OPTION PICKER SHEET */}
      <div
        id="opt-picker-backdrop"
        className={optConfig ? "open" : ""}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeOpt();
        }}
      >
        <div id="opt-picker-sheet">
          <div id="opt-picker-handle" />
          <div id="opt-picker-header">
            <span
              id="opt-picker-title"
              dangerouslySetInnerHTML={{
                __html: optConfig?.title || "Pilih Opsi",
              }}
            />
            <button type="button" id="opt-picker-close" onClick={closeOpt}>
              ✕
            </button>
          </div>
          <div id="opt-picker-list">
            {(optConfig?.options || []).map((opt, idx) => {
              const isSel = opt.value === optConfig?.currentValue;
              return (
                <div
                  key={`${opt.value}-${idx}`}
                  className={`opt-picker-item${isSel ? " selected" : ""}`}
                  onClick={() => handleSelectOpt(opt)}
                >
                  {opt.icon && (
                    <div
                      className="opt-picker-item-icon"
                      dangerouslySetInnerHTML={{ __html: opt.icon }}
                    />
                  )}
                  <div className="opt-picker-item-text">
                    <div className="opt-picker-item-name">{opt.label}</div>
                    {opt.sub && (
                      <div className="opt-picker-item-sub">{opt.sub}</div>
                    )}
                  </div>
                  <div className="opt-picker-radio" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. PHOTO VIEWER OVERLAY */}
      <div
        id="photo-viewer-overlay"
        className={photoViewer ? "open" : ""}
        onClick={() => setPhotoViewer(null)}
      >
        <div
          id="photo-viewer-frame"
          className={photoViewer?.shape || "circle"}
        >
          {photoViewer && (
            <img id="photo-viewer-img" src={photoViewer.src} alt="Preview" />
          )}
        </div>
        <button
          type="button"
          id="photo-viewer-close"
          onClick={() => setPhotoViewer(null)}
          title="Tutup"
        >
          ✕
        </button>
      </div>

      {/* 8. IMAGE CROP MODAL */}
      <OasModalDialog
        id="modal-image-crop"
        open={!!cropConfig}
        onClose={() => setCropConfig(null)}
        maxWidth="420px"
        title={
          <>
            <i className="ti ti-crop ti-inline" />{" "}
            {cropConfig?.title || "Sesuaikan Foto"}
          </>
        }
        footer={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setCropConfig(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmCrop}
            >
              <i
                className="ti ti-check"
                style={{ fontSize: 14, verticalAlign: -2, marginRight: 4 }}
              />
              Gunakan Foto
            </button>
          </>
        }
      >
        {cropConfig && (
          <div>
            <div
              ref={cropContainerRef}
              className="crop-container"
              style={{ cursor: "grab" }}
              onMouseDown={(e) => {
                const g = cropGeoRef.current;
                g.dragging = true;
                g.lastX = e.clientX;
                g.lastY = e.clientY;
                e.preventDefault();
              }}
              onMouseMove={(e) => {
                const g = cropGeoRef.current;
                if (!g.dragging) return;
                g.offsetX += e.clientX - g.lastX;
                g.offsetY += e.clientY - g.lastY;
                g.lastX = e.clientX;
                g.lastY = e.clientY;
                clampCrop();
                renderCrop();
              }}
              onMouseUp={() => {
                cropGeoRef.current.dragging = false;
              }}
              onMouseLeave={() => {
                cropGeoRef.current.dragging = false;
              }}
              onWheel={(e) => {
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const delta = e.deltaY > 0 ? -0.08 : 0.08;
                applyCropZoom(
                  cropGeoRef.current.scale + delta,
                  e.clientX - rect.left,
                  e.clientY - rect.top
                );
              }}
              onTouchStart={(e) => {
                const g = cropGeoRef.current;
                if (e.touches.length === 1) {
                  g.dragging = true;
                  g.lastX = e.touches[0].clientX;
                  g.lastY = e.touches[0].clientY;
                  g.pinchDist = null;
                } else if (e.touches.length === 2) {
                  g.dragging = false;
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  g.pinchDist = Math.hypot(dx, dy);
                }
              }}
              onTouchMove={(e) => {
                const g = cropGeoRef.current;
                if (e.touches.length === 1 && g.dragging) {
                  g.offsetX += e.touches[0].clientX - g.lastX;
                  g.offsetY += e.touches[0].clientY - g.lastY;
                  g.lastX = e.touches[0].clientX;
                  g.lastY = e.touches[0].clientY;
                  clampCrop();
                  renderCrop();
                } else if (e.touches.length === 2) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const dist = Math.hypot(dx, dy);
                  if (g.pinchDist) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midX =
                      (e.touches[0].clientX + e.touches[1].clientX) / 2 -
                      rect.left;
                    const midY =
                      (e.touches[0].clientY + e.touches[1].clientY) / 2 -
                      rect.top;
                    applyCropZoom(
                      g.scale * (dist / g.pinchDist),
                      midX,
                      midY
                    );
                  }
                  g.pinchDist = dist;
                }
              }}
              onTouchEnd={() => {
                cropGeoRef.current.dragging = false;
              }}
            >
              <img
                ref={cropImgRef}
                className="crop-img-layer"
                src={cropConfig.imgSrc}
                alt="Crop"
                draggable={false}
                onLoad={initCropLayout}
              />
              <div
                ref={cropWinRef}
                className={`crop-window ${
                  cropConfig.shape === "circle" ? "circle" : "rounded"
                }`}
              />
            </div>
            <p className="crop-hint">
              Geser foto untuk mengatur posisi • Pinch/scroll untuk zoom
            </p>
            <div className="crop-zoom-row">
              <i className="ti ti-zoom-in" style={{ fontSize: 15 }} />
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={cropZoom}
                onChange={(e) => applyCropZoom(parseFloat(e.target.value))}
              />
              <span className="crop-zoom-label">{cropZoom.toFixed(1)}×</span>
            </div>
          </div>
        )}
      </OasModalDialog>
    </>
  );
}
