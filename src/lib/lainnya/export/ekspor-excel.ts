import * as XLSX from "xlsx";
import { computeSaldoAll, rekapPpnJurnal } from "../../shared/accounting";
import { computeArusKas } from "../../laporan/arus-kas/kalkulasi";
import { computeLabaRugi } from "../../laporan/laba-rugi/kalkulasi";
import { computeNeraca } from "../../laporan/neraca/kalkulasi";
import { computeNeracaSaldo } from "../../laporan/neraca-saldo/kalkulasi";
import { getFilteredSaldoPure } from "../../laporan/shared";
import { readAkuns, readBillList, readInvoiceList, readJurnalEntries, readKontakList } from "../../shared/legacy-store";
import { safeFileSlug, type ExportOptions } from "./tema-helper";

function autoFitCols(ws: XLSX.WorkSheet, rows: unknown[][]): void {
  const widths: number[] = [];
  rows.forEach((r) => {
    r.forEach((cell, i) => {
      const len = String(cell ?? "").length + 3;
      if (!widths[i] || len > widths[i]) widths[i] = Math.min(len, 42);
    });
  });
  ws["!cols"] = widths.map((wch) => ({ wch: Math.max(wch, 10) }));
}

export function exportExcelWorkbook(opts: ExportOptions): string {
  const wb = XLSX.utils.book_new();
  const akuns = readAkuns();
  const jurnals = readJurnalEntries();
  const invoices = readInvoiceList();
  const bills = readBillList();
  const kontaks = readKontakList();
  const saldoAll = computeSaldoAll(jurnals);
  const saldoPl = getFilteredSaldoPure(jurnals, "all", { tanpaPenutup: true });
  const ns = computeNeracaSaldo(akuns, saldoAll);
  const lr = computeLabaRugi(akuns, saldoPl);
  const ner = computeNeraca(jurnals, akuns);
  const ak = computeArusKas(akuns, saldoPl);
  const ppn = rekapPpnJurnal(jurnals, akuns);
  const namaAkun = (kode: string) =>
    akuns.find((a) => a.kode === kode)?.nama || kode;
  const s = opts.sections;
  const useFormula = opts.excelTemplate === "formula";

  const addSheet = (title: string, rows: unknown[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    autoFitCols(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    return ws;
  };

  if (s.dashboard) {
    addSheet("Ringkasan", [
      [opts.nama.toUpperCase()],
      ["RINGKASAN LAPORAN KEUANGAN", opts.periode],
      ...(opts.proyek ? [["Proyek / Catatan", opts.proyek]] : []),
      [],
      ["Indikator Keuangan", "Nilai (Rp)"],
      ["Total Pendapatan", lr.totalPendapatan],
      ["Total HPP", lr.totalHpp],
      ["Laba Kotor", lr.labaKotor],
      ["Total Beban Operasional", lr.totalBeban],
      ["Laba Bersih", lr.labaBersih],
      ["Total Aset", ner.aset],
      ["Total Liabilitas", ner.liab],
      ["Total Ekuitas", ner.totalEkuitas],
      ["Arus Kas Bersih", ak.kenaikan],
      ["Total Jurnal", jurnals.length],
      ["Total Kontak", kontaks.length],
    ]);
  }

  if (s.jurnalUmum || useFormula) {
    const header = [
      "No Jurnal",
      "Tanggal",
      "Jenis",
      "Keterangan",
      "Kode Akun",
      "Nama Akun",
      "Debit",
      "Kredit",
    ];
    const rows: unknown[][] = [
      [opts.nama, "JURNAL UMUM", opts.periode],
      [],
      header,
    ];
    jurnals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        rows.push([
          j.no || "",
          j.tanggal || "",
          j.jenis || "Manual",
          l.ket || j.ket || "",
          l.akun,
          namaAkun(l.akun),
          Number(l.debit) || 0,
          Number(l.kredit) || 0,
        ]);
      });
    });
    const lastRow = rows.length;
    if (useFormula && lastRow >= 4) {
      rows.push([
        "",
        "",
        "",
        "TOTAL",
        "",
        "",
        { f: `SUM(G4:G${lastRow})` },
        { f: `SUM(H4:H${lastRow})` },
      ]);
    } else {
      const totD = jurnals.reduce(
        (sum, j) => sum + (j.lines || []).reduce((a, l) => a + (l.debit || 0), 0),
        0
      );
      const totK = jurnals.reduce(
        (sum, j) =>
          sum + (j.lines || []).reduce((a, l) => a + (l.kredit || 0), 0),
        0
      );
      rows.push(["", "", "", "TOTAL", "", "", totD, totK]);
    }
    addSheet(useFormula ? "INPUT_JURNAL" : "Jurnal Umum", rows);
  }

  const addFilteredJurnal = (sheetName: string, jenis: string) => {
    const filtered = jurnals.filter((j) => j.jenis === jenis);
    const rows: unknown[][] = [
      [opts.nama, sheetName.toUpperCase(), opts.periode],
      [],
      ["No", "Tanggal", "Keterangan", "Kode", "Nama Akun", "Debit", "Kredit"],
    ];
    filtered.forEach((j) => {
      (j.lines || []).forEach((l) => {
        rows.push([
          j.no || "",
          j.tanggal || "",
          l.ket || j.ket || "",
          l.akun,
          namaAkun(l.akun),
          Number(l.debit) || 0,
          Number(l.kredit) || 0,
        ]);
      });
    });
    addSheet(sheetName, rows);
  };

  if (s.jurnalKas) addFilteredJurnal("Jurnal Kas", "Kas");
  if (s.jurnalJual) addFilteredJurnal("Jurnal Penjualan", "Penjualan");
  if (s.jurnalBeli) addFilteredJurnal("Jurnal Pembelian", "Pembelian");

  if (s.neracaSaldo) {
    const rows: unknown[][] = [
      [opts.nama, "NERACA SALDO", opts.periode],
      [],
      ["Kode", "Nama Akun", "Tipe", "Debit", "Kredit"],
    ];
    if (useFormula) {
      akuns.forEach((a, i) => {
        const r = i + 4;
        rows.push([
          a.kode,
          a.nama,
          a.tipe,
          { f: `SUMIF(INPUT_JURNAL!$E$4:$E$5000,A${r},INPUT_JURNAL!$G$4:$G$5000)` },
          { f: `SUMIF(INPUT_JURNAL!$E$4:$E$5000,A${r},INPUT_JURNAL!$H$4:$H$5000)` },
        ]);
      });
      const last = rows.length;
      rows.push([
        "",
        "TOTAL",
        "",
        { f: `SUM(D4:D${last})` },
        { f: `SUM(E4:E${last})` },
      ]);
    } else {
      ns.rows.forEach((r) => {
        rows.push([r.kode, r.nama, r.tipe, r.debit, r.kredit]);
      });
      rows.push(["", "TOTAL", "", ns.totalDebit, ns.totalKredit]);
    }
    addSheet("Neraca Saldo", rows);
  }

  if (s.labaRugi) {
    const rows: unknown[][] = [
      [opts.nama, "LAPORAN LABA RUGI", opts.periode],
      [],
      ["Kode", "Keterangan", "Nominal (Rp)"],
      ["", "PENDAPATAN", ""],
      ...lr.pRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total Pendapatan", lr.totalPendapatan],
      [],
      ["", "HARGA POKOK PENJUALAN (HPP)", ""],
      ...lr.hRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total HPP", lr.totalHpp],
      ["", "LABA KOTOR", lr.labaKotor],
      [],
      ["", "BEBAN OPERASIONAL", ""],
      ...lr.bRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total Beban", lr.totalBeban],
      [],
      ["", "LABA BERSIH", lr.labaBersih],
    ];
    addSheet("Laba Rugi", rows);
  }

  if (s.neraca) {
    const rows: unknown[][] = [
      [opts.nama, "NERACA (POSISI KEUANGAN)", opts.periode],
      [],
      ["Kode", "Akun", "Saldo (Rp)"],
      ["", "ASET", ""],
      ...ner.asetRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "TOTAL ASET", ner.aset],
      [],
      ["", "LIABILITAS", ""],
      ...ner.liabRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "TOTAL LIABILITAS", ner.liab],
      [],
      ["", "EKUITAS", ""],
      ...ner.ekRows.map((r) => [r.kode, r.nama, r.isPrive ? -r.nilai : r.nilai]),
      ["", "Laba Tahun Berjalan", ner.labaBersih],
      ["", "TOTAL EKUITAS", ner.totalEkuitas],
      ["", "TOTAL LIABILITAS & EKUITAS", ner.liab + ner.totalEkuitas],
    ];
    addSheet("Neraca", rows);
  }

  if (s.arusKas) {
    const rows: unknown[][] = [
      [opts.nama, "LAPORAN ARUS KAS (PSAK 2)", opts.periode],
      [],
      ["Kategori", "Keterangan", "Nominal (Rp)"],
      ...ak.operasiRows.map((r) => ["Operasi", r.label, r.nilai]),
      ["", "Arus Kas Operasi Bersih", ak.totalOperasi],
      ...ak.investasiRows.map((r) => ["Investasi", r.label, r.nilai]),
      ["", "Arus Kas Investasi Bersih", ak.totalInvestasi],
      ...ak.pendanaanRows.map((r) => ["Pendanaan", r.label, r.nilai]),
      ["", "Arus Kas Pendanaan Bersih", ak.totalPendanaan],
      ["", "KENAIKAN / (PENURUNAN) KAS BERSIH", ak.kenaikan],
    ];
    addSheet("Arus Kas", rows);
  }

  if (s.coa) {
    addSheet("Chart of Accounts", [
      ["Kode", "Nama Akun", "Tipe", "Kategori", "Saldo Normal"],
      ...akuns.map((a) => [a.kode, a.nama, a.tipe, a.kat || "", a.normal]),
    ]);
  }

  if (s.invoice && invoices.length) {
    addSheet("Invoice & Piutang", [
      ["No Invoice", "Pelanggan", "Tanggal", "Jatuh Tempo", "Total", "Sisa", "Status"],
      ...invoices.map((i) => [
        i.noInvoice,
        i.pelanggan,
        i.tanggal,
        i.jatuhTempo,
        i.total,
        i.sisaTagihan,
        i.status,
      ]),
    ]);
  }

  if (s.bill && bills.length) {
    addSheet("Tagihan Pembelian", [
      ["No Bill", "Supplier", "Tanggal", "Jatuh Tempo", "Total", "Sisa", "Status"],
      ...bills.map((b) => [
        b.noBill,
        b.supplier,
        b.tanggal,
        b.jatuhTempo,
        b.total,
        b.sisaTagihan,
        b.status,
      ]),
    ]);
  }

  if (s.pajak) {
    addSheet("Rekap PPN", [
      [opts.nama, "REKAP PPN KELUARAN & MASUKAN", opts.periode],
      [],
      ["Komponen", "Nominal (Rp)"],
      ["Total PPN Keluaran", ppn.keluaran],
      ["Total PPN Masukan", ppn.masukan],
      ["PPN Kurang / (Lebih) Bayar", ppn.kurangBayar],
    ]);
  }

  if (wb.SheetNames.length === 0) {
    addSheet("Ringkasan", [["Tidak ada seksi yang dipilih."]]);
  }

  const fileName = `OAS_${safeFileSlug(opts.nama)}_${safeFileSlug(opts.periode)}${useFormula ? "_Formula" : ""}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
