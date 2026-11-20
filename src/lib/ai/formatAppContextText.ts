import type { OasAppContext } from "./types";

function fmtIdNumber(n: number): string {
  const num = Number.isFinite(n) ? n : 0;
  return num.toLocaleString("id-ID");
}

export function formatAppContextText(ctx: OasAppContext): string {
  const recent =
    ctx.recentJurnals.length > 0
      ? ctx.recentJurnals.slice(-10).join("\n")
      : "(belum ada)";
  const akunList =
    ctx.akunsSummary.length > 0
      ? ctx.akunsSummary.slice(0, 200).join(", ")
      : "(daftar akun kosong)";

  return `KONTEKS DATA KEUANGAN SAAT INI:
- Total Aset: Rp ${fmtIdNumber(ctx.totalAset)}
- Total Pendapatan: Rp ${fmtIdNumber(ctx.totalPendapatan)}
- Total Beban: Rp ${fmtIdNumber(ctx.totalBeban)}
- Laba Bersih: Rp ${fmtIdNumber(ctx.labaBersih)}
- Jumlah Jurnal: ${Math.max(0, Math.floor(ctx.jumlahJurnal || 0))} entri
- Jurnal Terbaru:
${recent}

DAFTAR AKUN TERSEDIA:
${akunList}`;
}
