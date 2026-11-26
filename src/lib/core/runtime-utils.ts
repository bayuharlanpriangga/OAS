import {
  JENIS_JURNAL,
  JENIS_PENUTUP,
  PPN_TARIF_STANDAR,
  PeriodeTerkunciError,
  SUMBER_JURNAL,
  adalahJurnalPembelian,
  akunPpnKeluaranKode,
  computeSaldoAll,
  computeSaldoBersih,
  getAkunNama,
  getBulanAwalTahunBuku,
  getJurnalTanpaPenutup,
  getReversalOf,
  getReversedMap,
  getTahunBukuRange,
  hitungPpn,
  isJurnalDibalik,
  isJurnalPembalik,
  isJurnalPenutup,
  isPeriodeTerkunci,
  jurnalPembelianAktif,
  ketTanpaPrefixPembalik,
  parseJurnalFromAI,
  plNatural,
  ppnDariJurnal,
  rekapPpnJurnal,
  ringkasJurnalPembelian,
  saldoAlamiPL,
  saldoBersihPL,
} from "@/lib/shared/accounting";
import {
  escapeForJsAttr,
  escapeHtml,
  fmtDate,
  fmtRp,
  rpNum,
} from "@/lib/shared/format";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  readPeriodeKunciSampai,
} from "@/lib/shared/legacy-store";
import type { ComputeSaldoOptions, JurnalEntry, TahunBukuRange } from "@/types";

export {
  JENIS_JURNAL,
  JENIS_PENUTUP,
  PPN_TARIF_STANDAR,
  PeriodeTerkunciError,
  SUMBER_JURNAL,
  adalahJurnalPembelian,
  escapeForJsAttr,
  escapeHtml,
  fmtDate,
  fmtRp,
  getReversalOf,
  hitungPpn,
  isJurnalPembalik,
  isJurnalPenutup,
  ketTanpaPrefixPembalik,
  plNatural,
  ringkasJurnalPembelian,
  rpNum,
};

export function getAkunNamaRuntime(kode: string): string {
  return getAkunNama(readAkuns(), kode);
}

export function getReversedMapRuntime(
  list?: JurnalEntry[]
): Map<string, string> {
  return getReversedMap(Array.isArray(list) ? list : readJurnalEntries());
}

export function isJurnalDibalikRuntime(
  j: JurnalEntry | null | undefined,
  list?: JurnalEntry[]
): boolean {
  return isJurnalDibalik(j, Array.isArray(list) ? list : readJurnalEntries());
}

export function jurnalPembelianAktifRuntime(
  daftar?: JurnalEntry[]
): JurnalEntry[] {
  const all = readJurnalEntries();
  return jurnalPembelianAktif(Array.isArray(daftar) ? daftar : all, all);
}

export function isPeriodeTerkunciRuntime(
  tanggal: string | null | undefined
): boolean {
  return isPeriodeTerkunci(tanggal, readPeriodeKunciSampai());
}

export function guardPeriodeRuntime(
  tanggal: string | null | undefined,
  aksi?: string
): boolean {
  const kunci = readPeriodeKunciSampai();
  if (!isPeriodeTerkunci(tanggal, kunci)) return true;
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-lock" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Periode sampai ${fmtDate(
      kunci
    )} sudah dikunci, jadi jurnal bertanggal ${fmtDate(
      String(tanggal || "").slice(0, 10)
    )} tidak bisa ${aksi || "diproses"}. Pakai tanggal setelah ${fmtDate(
      kunci
    )}, atau buka kunci di Settings > Transaksi > Kunci Periode.`
  );
  return false;
}

function getTahunBukuKodeLocal(): string {
  if (typeof window === "undefined") return "jan";
  try {
    const raw =
      localStorage.getItem("oas_profil") ||
      localStorage.getItem("oas_profil_v1") ||
      "{}";
    const p = JSON.parse(raw) as { tahunBuku?: string };
    if (p?.tahunBuku) return p.tahunBuku;
  } catch {
    // ignore
  }
  return "jan";
}

export function getBulanAwalTahunBukuRuntime(): number {
  return getBulanAwalTahunBuku(getTahunBukuKodeLocal());
}

export function getTahunBukuRangeRuntime(tanggal: string): TahunBukuRange {
  return getTahunBukuRange(tanggal, getTahunBukuKodeLocal());
}

export function saldoAlamiPLRuntime(
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  return saldoAlamiPL(
    readAkuns(),
    readJurnalEntries(),
    kode,
    opts || { tanpaPenutup: true }
  );
}

export function saldoBersihPLRuntime(kode: string): number {
  return saldoBersihPL(readAkuns(), readJurnalEntries(), kode);
}

export function getJurnalTanpaPenutupRuntime(): JurnalEntry[] {
  return getJurnalTanpaPenutup(readJurnalEntries());
}

export function computeSaldoAllRuntime(opts?: ComputeSaldoOptions) {
  return computeSaldoAll(readJurnalEntries(), opts);
}

export function computeSaldoBersihRuntime(
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  return computeSaldoBersih(readAkuns(), readJurnalEntries(), kode, opts);
}

export function akunPpnKeluaranKodeRuntime(): string {
  return akunPpnKeluaranKode(readAkuns());
}

export function ppnDariJurnalRuntime(j: JurnalEntry | null | undefined) {
  return ppnDariJurnal(j, readAkuns());
}

export function rekapPpnJurnalRuntime(fromStr?: string, toStr?: string) {
  return rekapPpnJurnal(readJurnalEntries(), readAkuns(), fromStr, toStr);
}

export function parseJurnalFromAIRuntime(text: string) {
  return parseJurnalFromAI(text, readAkuns());
}

export function setVal(id: string, val: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | null;
  if (el) {
    el.value = val;
    el.dispatchEvent(new Event("input"));
  }
}

export function setSelectVal(id: string, val: string): void {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id) as HTMLSelectElement | null;
  if (el) {
    el.value = val;
    el.dispatchEvent(new Event("change"));
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function emptyState(msg: string, desc?: string): string {
  const descText =
    desc !== undefined ? desc : "Tambah transaksi baru untuk memulai";
  return `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.35"><rect x="4" y="8" width="28" height="20" rx="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 14h28" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="21" r="2" fill="currentColor"/><rect x="15" y="20" width="10" height="2" rx="1" fill="currentColor"/></svg></div><div class="empty-title">${msg}</div>${
    descText ? `<div class="empty-desc">${descText}</div>` : ""
  }</div>`;
}

// ── INFO ICON POPOVER ───────────────────────────────────────────────────

interface PopoverDiv extends HTMLDivElement {
  _btn?: HTMLElement;
  _pinned?: boolean;
}

let activeInfoPopover: PopoverDiv | null = null;
let infoHoverBound = false;

function positionInfoPopover(pop: HTMLElement, btn: HTMLElement): void {
  const rect = btn.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - popRect.width / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
  let top = rect.bottom + 8;
  if (top + popRect.height > window.innerHeight - 8) {
    top = rect.top - popRect.height - 8;
  }
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function buildInfoPopover(btn: HTMLElement, html: string): PopoverDiv {
  const pop = document.createElement("div") as PopoverDiv;
  pop.className = "info-popover";
  pop.innerHTML = html;
  pop._btn = btn;
  document.body.appendChild(pop);
  positionInfoPopover(pop, btn);
  return pop;
}

function onDocClickCloseInfoPopover(e: Event): void {
  if (!activeInfoPopover) return;
  const target = e.target as Node | null;
  const btn = activeInfoPopover._btn;
  if (
    target &&
    !activeInfoPopover.contains(target) &&
    target !== btn &&
    !(btn && btn.contains(target))
  ) {
    closeInfoPopover();
  }
}

export function closeInfoPopover(): void {
  if (!activeInfoPopover) return;
  activeInfoPopover.remove();
  activeInfoPopover = null;
  document.removeEventListener("click", onDocClickCloseInfoPopover, true);
  window.removeEventListener("scroll", closeInfoPopover, true);
  window.removeEventListener("resize", closeInfoPopover, true);
}

export function toggleInfoPopover(btn: HTMLElement, html: string): void {
  const already =
    activeInfoPopover &&
    activeInfoPopover._btn === btn &&
    activeInfoPopover._pinned;
  closeInfoPopover();
  if (already) return;
  const pop = buildInfoPopover(btn, html);
  pop._pinned = true;
  activeInfoPopover = pop;
  setTimeout(() => {
    document.addEventListener("click", onDocClickCloseInfoPopover, true);
    window.addEventListener("scroll", closeInfoPopover, true);
    window.addEventListener("resize", closeInfoPopover, true);
  }, 0);
}

export function initInfoPopoverHover(): void {
  if (typeof window === "undefined" || infoHoverBound) return;
  infoHoverBound = true;
  const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.addEventListener(
    "mouseenter",
    (e) => {
      if (!mq.matches) return;
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.(".info-icon-btn") as HTMLElement | null;
      if (!btn || (activeInfoPopover && activeInfoPopover._btn === btn)) return;
      const html = btn.dataset.infoHtml;
      if (!html) return;
      closeInfoPopover();
      const pop = buildInfoPopover(btn, html);
      pop._pinned = false;
      activeInfoPopover = pop;
    },
    true
  );
  document.addEventListener(
    "mouseleave",
    (e) => {
      if (!mq.matches) return;
      const target = e.target as HTMLElement | null;
      const btn = target?.closest?.(".info-icon-btn") as HTMLElement | null;
      if (!btn) return;
      if (
        activeInfoPopover &&
        activeInfoPopover._btn === btn &&
        !activeInfoPopover._pinned
      ) {
        closeInfoPopover();
      }
    },
    true
  );
}
