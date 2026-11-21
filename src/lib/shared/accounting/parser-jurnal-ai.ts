import type { Akun, JurnalLine, ParsedAIJurnal } from "@/types";

export function parseJurnalFromAI(
  text: string,
  akuns: readonly Akun[],
  today: string = new Date().toISOString().split("T")[0]
): ParsedAIJurnal | null {
  const lines: JurnalLine[] = [];
  const ketMatch = text.match(/(?:jurnal|mencatat|transaksi)[:\s]+([^\n.]+)/i);
  const ket = ketMatch ? ketMatch[1].trim().substring(0, 60) : "Dari AI";

  const drPattern =
    /(?:Dr\.?|Debit)[:\s]+([A-Za-z\s/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;
  const krPattern =
    /(?:Kr\.?|Kredit)[:\s]+([A-Za-z\s/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;

  let m: RegExpExecArray | null;
  while ((m = drPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val =
      parseFloat(m[2].replace(/[.,]/g, "").replace(/(\d{3})$/, "$1")) ||
      parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    const akun = akuns.find((a) =>
      a.nama.toLowerCase().includes(nama.toLowerCase().split(" ")[0])
    );
    if (val > 0) {
      lines.push({ akun: akun?.kode || "1101", ket: nama, debit: val, kredit: 0 });
    }
  }
  while ((m = krPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val =
      parseFloat(m[2].replace(/[.,]/g, "").replace(/(\d{3})$/, "$1")) ||
      parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    const akun = akuns.find((a) =>
      a.nama.toLowerCase().includes(nama.toLowerCase().split(" ")[0])
    );
    if (val > 0) {
      lines.push({ akun: akun?.kode || "1101", ket: nama, debit: 0, kredit: val });
    }
  }

  if (lines.length < 2) return null;
  const td = lines.reduce((s, l) => s + l.debit, 0);
  const tk = lines.reduce((s, l) => s + l.kredit, 0);
  if (Math.abs(td - tk) > 1) return null;

  return { tanggal: today, ket, jenis: "AI", lines };
}
