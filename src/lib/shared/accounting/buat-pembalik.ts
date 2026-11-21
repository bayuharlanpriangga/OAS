import type { JurnalEntry, JurnalLine } from "@/types";
import { JENIS_JURNAL } from "./constants";

export function buatJurnalPembalik(
  j: JurnalEntry | null | undefined,
  tanggalPembalik: string
):
  | {
      ok: true;
      entry: {
        tanggal: string;
        jenis: string;
        ket: string;
        ref: string;
        reversalOf: string;
        lines: JurnalLine[];
      };
    }
  | { ok: false; pesan: string } {
  if (!j || typeof j !== "object" || !j.no) {
    return { ok: false, pesan: "Jurnal asal tidak valid." };
  }
  const tgl = typeof tanggalPembalik === "string" ? tanggalPembalik.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
    return { ok: false, pesan: "Tanggal jurnal pembalik tidak valid." };
  }
  if (j.tanggal && tgl < j.tanggal.slice(0, 10)) {
    return {
      ok: false,
      pesan: `Tanggal jurnal pembalik tidak boleh sebelum tanggal jurnal asal (${j.tanggal}).`,
    };
  }
  const lines = (Array.isArray(j.lines) ? j.lines : []).map((l) => ({
    akun: l.akun,
    ket: l.ket || "",
    debit: Number(l.kredit) || 0,
    kredit: Number(l.debit) || 0,
  }));
  if (!lines.length) {
    return { ok: false, pesan: "Jurnal asal tidak memiliki baris akun." };
  }
  const ketAsal = String(j.ket || j.keterangan || "").trim();
  return {
    ok: true,
    entry: {
      tanggal: tgl,
      jenis: j.jenis || JENIS_JURNAL.MANUAL,
      ket: `[Pembalik ${j.no}] ${ketAsal}`,
      ref: j.ref || j.no,
      reversalOf: j.no,
      lines,
    },
  };
}
