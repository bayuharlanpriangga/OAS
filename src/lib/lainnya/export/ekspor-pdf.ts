import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeSaldoAll, rekapPpnJurnal } from "../../shared/accounting";
import { fmtRp } from "../../shared/format";
import { computeArusKas } from "../../laporan/arus-kas/kalkulasi";
import { computeLabaRugi } from "../../laporan/laba-rugi/kalkulasi";
import { computeNeraca } from "../../laporan/neraca/kalkulasi";
import { computeNeracaSaldo } from "../../laporan/neraca-saldo/kalkulasi";
import { getFilteredSaldoPure } from "../../laporan/shared";
import { readAkuns, readInvoiceList, readJurnalEntries } from "../../shared/legacy-store";
import { loadSavedPdfTheme, safeFileSlug, type ExportOptions } from "./tema-helper";

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || "#1e3a8a").replace("#", "");
  if (clean.length !== 6) return [30, 58, 138];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

export function exportPdfReport(opts: ExportOptions): string {
  const themeCfg = opts.pdfTheme || loadSavedPdfTheme();
  const palette = themeCfg.colors[themeCfg.template];
  const primaryRgb = hexToRgbTuple(palette.primary);
  const accentRgb = hexToRgbTuple(palette.accent);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const akuns = readAkuns();
  const jurnals = readJurnalEntries();
  const invoices = readInvoiceList();
  const saldoAll = computeSaldoAll(jurnals);
  const saldoPl = getFilteredSaldoPure(jurnals, "all", { tanpaPenutup: true });
  const ns = computeNeracaSaldo(akuns, saldoAll);
  const lr = computeLabaRugi(akuns, saldoPl);
  const ner = computeNeraca(jurnals, akuns);
  const ak = computeArusKas(akuns, saldoPl);
  const ppn = rekapPpnJurnal(jurnals, akuns);
  const s = opts.sections;

  const drawHeader = (subtitle: string) => {
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, 210, 24, "F");
    let textX = 14;
    if (opts.logoDataUrl) {
      try {
        doc.addImage(opts.logoDataUrl, "PNG", 12, 4, 16, 16);
        textX = 32;
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(opts.nama || "OAS Akuntansi", textX, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${subtitle}  ·  Periode: ${opts.periode}${opts.proyek ? `  ·  ${opts.proyek}` : ""}`,
      textX,
      18
    );
    doc.setTextColor(30, 41, 59);
  };

  let hasFirstPage = false;
  const startSection = (title: string): number => {
    if (hasFirstPage) doc.addPage();
    hasFirstPage = true;
    drawHeader(title);
    return 32;
  };

  if (s.dashboard) {
    const y = startSection("Ringkasan Keuangan");
    autoTable(doc, {
      startY: y,
      head: [["Indikator Keuangan", "Nominal"]],
      body: [
        ["Total Pendapatan", fmtRp(lr.totalPendapatan)],
        ["Total HPP", fmtRp(lr.totalHpp)],
        ["Laba Kotor", fmtRp(lr.labaKotor)],
        ["Total Beban Operasional", fmtRp(lr.totalBeban)],
        ["Laba Bersih", fmtRp(lr.labaBersih)],
        ["Total Aset", fmtRp(ner.aset)],
        ["Total Liabilitas", fmtRp(ner.liab)],
        ["Total Ekuitas", fmtRp(ner.totalEkuitas)],
        ["Arus Kas Bersih", fmtRp(ak.kenaikan)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      styles: { fontSize: 9.5 },
    });
  }

  if (s.labaRugi) {
    const y = startSection("Laporan Laba Rugi");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Akun / Keterangan", "Nominal"]],
      body: [
        ...lr.pRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "Total Pendapatan", fmtRp(lr.totalPendapatan)],
        ...lr.hRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "Laba Kotor", fmtRp(lr.labaKotor)],
        ...lr.bRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "LABA BERSIH", fmtRp(lr.labaBersih)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" } },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        const txt = String(data.row.cells[1]?.raw || "");
        if (txt === "LABA BERSIH" || txt === "Laba Kotor" || txt === "Total Pendapatan") {
          data.cell.styles.fontStyle = "bold";
          if (txt === "LABA BERSIH") {
            data.cell.styles.fillColor = accentRgb;
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      },
    });
  }

  if (s.neraca) {
    const y = startSection("Neraca (Posisi Keuangan)");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Akun", "Saldo"]],
      body: [
        ...ner.asetRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "TOTAL ASET", fmtRp(ner.aset)],
        ...ner.liabRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "TOTAL LIABILITAS", fmtRp(ner.liab)],
        ...ner.ekRows.map((r) => [r.kode, r.nama, fmtRp(r.isPrive ? -r.nilai : r.nilai)]),
        ["", "Laba Tahun Berjalan", fmtRp(ner.labaBersih)],
        ["", "TOTAL EKUITAS", fmtRp(ner.totalEkuitas)],
        ["", "TOTAL LIABILITAS & EKUITAS", fmtRp(ner.liab + ner.totalEkuitas)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" } },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        const txt = String(data.row.cells[1]?.raw || "");
        if (txt.startsWith("TOTAL ")) data.cell.styles.fontStyle = "bold";
      },
    });
  }

  if (s.neracaSaldo) {
    const y = startSection("Neraca Saldo");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Nama Akun", "Debit", "Kredit"]],
      body: [
        ...ns.rows.map((r) => [
          r.kode,
          r.nama,
          r.debit ? fmtRp(r.debit) : "-",
          r.kredit ? fmtRp(r.kredit) : "-",
        ]),
        ["", "TOTAL", fmtRp(ns.totalDebit), fmtRp(ns.totalKredit)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 8.5 },
    });
  }

  if (s.jurnalUmum) {
    const y = startSection("Jurnal Umum");
    const body: string[][] = [];
    jurnals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        body.push([
          j.tanggal || "",
          j.no || "",
          l.akun,
          (l.ket || j.ket || "").slice(0, 48),
          l.debit ? fmtRp(l.debit) : "-",
          l.kredit ? fmtRp(l.kredit) : "-",
        ]);
      });
    });
    autoTable(doc, {
      startY: y,
      head: [["Tanggal", "No", "Akun", "Keterangan", "Debit", "Kredit"]],
      body: body.length ? body : [["-", "-", "-", "Belum ada jurnal", "-", "-"]],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } },
      styles: { fontSize: 8 },
    });
  }

  if (s.invoice && invoices.length) {
    const y = startSection("Daftar Invoice & Piutang");
    autoTable(doc, {
      startY: y,
      head: [["No Invoice", "Pelanggan", "Tanggal", "Total", "Sisa", "Status"]],
      body: invoices.map((i) => [
        i.noInvoice,
        i.pelanggan,
        i.tanggal,
        fmtRp(i.total),
        fmtRp(i.sisaTagihan),
        i.status,
      ]),
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
      styles: { fontSize: 8.5 },
    });
  }

  if (s.pajak) {
    const y = startSection("Rekap Pajak PPN");
    autoTable(doc, {
      startY: y,
      head: [["Komponen Pajak", "Nominal"]],
      body: [
        ["PPN Keluaran", fmtRp(ppn.keluaran)],
        ["PPN Masukan", fmtRp(ppn.masukan)],
        ["PPN Kurang / (Lebih) Bayar", fmtRp(ppn.kurangBayar)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      styles: { fontSize: 9.5 },
    });
  }

  if (!hasFirstPage) {
    startSection("Laporan Keuangan");
    doc.text("Tidak ada seksi laporan yang dipilih.", 14, 40);
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dicetak oleh OAS Akuntansi · Halaman ${p} dari ${totalPages}`,
      14,
      290
    );
  }

  const fileName = `OAS_${safeFileSlug(opts.nama)}_${safeFileSlug(opts.periode)}.pdf`;
  doc.save(fileName);
  return fileName;
}
