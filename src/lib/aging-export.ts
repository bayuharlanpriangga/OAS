import type { AgingResult } from "@/types";
import { AGING_BUCKETS } from "./aging";
import { escapeHtml } from "./format";

export function agingHariIni(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function agingCsvCell(v: unknown): string {
  const s = String(v === null || v === undefined ? "" : v);
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function agingCsv(
  hasil: AgingResult,
  kolomKontak = "Pelanggan"
): string {
  const head = [
    kolomKontak,
    "Belum Jatuh Tempo",
    "1-30 Hari",
    "31-60 Hari",
    "61-90 Hari",
    "> 90 Hari",
    "Total",
  ];
  const rows = hasil.perKontak.map((k) => [
    k.kontak,
    k.lancar,
    k.b0_30,
    k.b31_60,
    k.b61_90,
    k.b90plus,
    k.total,
  ]);
  const t = hasil.total;
  rows.push([
    "TOTAL",
    t.lancar,
    t.b0_30,
    t.b31_60,
    t.b61_90,
    t.b90plus,
    t.total,
  ]);
  return (
    "\uFEFF" +
    [head].concat(rows as string[][]).map((r) => r.map(agingCsvCell).join(",")).join("\r\n")
  );
}

export function agingCetakHtml(
  hasil: AgingResult,
  opsi?: { judul?: string; kolomKontak?: string; namaPerusahaan?: string }
): string {
  const judul = (opsi && opsi.judul) || "Laporan Umur Piutang";
  const kolomKontak = (opsi && opsi.kolomKontak) || "Pelanggan";
  const nama = (opsi && opsi.namaPerusahaan) || "";
  const rp = (n: number) =>
    n ? "Rp " + Math.round(n).toLocaleString("id-ID") : "—";

  const rows = hasil.perKontak.length
    ? hasil.perKontak
        .map(
          (k) =>
            `<tr><td>${escapeHtml(k.kontak)}</td>` +
            AGING_BUCKETS.map(
              (b) => `<td class="r">${rp(k[b])}</td>`
            ).join("") +
            `<td class="r"><b>${rp(k.total)}</b></td></tr>`
        )
        .join("")
    : `<tr><td colspan="7" class="c">Tidak ada ${kolomKontak === "Supplier" ? "hutang" : "piutang"} belum lunas.</td></tr>`;

  const t = hasil.total;
  const foot =
    `<tr class="tot"><td>TOTAL</td>` +
    AGING_BUCKETS.map((b) => `<td class="r">${rp(t[b])}</td>`).join("") +
    `<td class="r">${rp(t.total)}</td></tr>`;

  return (
    `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>${escapeHtml(judul)}</title>` +
    `<style>body{font-family:system-ui,-apple-system,sans-serif;color:#111;padding:24px;font-size:12px}` +
    `h1{font-size:18px;margin:0 0 4px}.sub{color:#555;margin-bottom:16px}` +
    `table{width:100%;border-collapse:collapse}th,td{border:1px solid #d1d5db;padding:6px 8px;text-align:left}` +
    `th{background:#f3f4f6;font-weight:600}.r{text-align:right;font-variant-numeric:tabular-nums}.c{text-align:center;color:#666}` +
    `.tot td{background:#f9fafb;font-weight:700}@media print{body{padding:0}}</style></head><body>` +
    `<h1>${escapeHtml(judul)}</h1>` +
    `<div class="sub">${nama ? escapeHtml(nama) + " · " : ""}Per tanggal ${escapeHtml(hasil.tanggalAcuan)}</div>` +
    `<table><thead><tr><th>${escapeHtml(kolomKontak)}</th><th class="r">Belum Jatuh Tempo</th>` +
    `<th class="r">1–30 Hari</th><th class="r">31–60 Hari</th><th class="r">61–90 Hari</th>` +
    `<th class="r">&gt; 90 Hari</th><th class="r">Total</th></tr></thead>` +
    `<tbody>${rows}</tbody><tfoot>${foot}</tfoot></table>` +
    `<script>window.onload=function(){window.print();};</script></body></html>`
  );
}
