"use client";

export interface RasioBenchmark {
  ok?: number;
  warn?: number;
}

export interface RasioTableRowProps {
  nama: string;
  nilai: string;
  satuan?: string;
  benchmark?: RasioBenchmark | null;
  keterangan?: string;
  rawText?: string;
}

export function RasioTableRow({
  nama,
  nilai,
  satuan = "",
  benchmark,
  keterangan = "",
  rawText,
}: RasioTableRowProps) {
  if (rawText !== undefined) {
    return (
      <tr className="rasio-row">
        <td>{nama}</td>
        <td>{rawText}</td>
        <td>{keterangan}</td>
      </tr>
    );
  }

  const parsed = parseFloat(nilai);
  let cls = "";
  if (benchmark) {
    if (benchmark.ok !== undefined && parsed >= benchmark.ok) cls = "rasio-ok";
    else if (benchmark.warn !== undefined && parsed >= benchmark.warn)
      cls = "rasio-warn";
    else if (!Number.isNaN(parsed)) cls = "rasio-bad";
  }
  const formatted =
    Number.isNaN(parsed) || !Number.isFinite(parsed)
      ? "-"
      : `${nilai} ${satuan}`.trimEnd();

  return (
    <tr className="rasio-row">
      <td>{nama}</td>
      <td className={cls}>{formatted}</td>
      <td>{keterangan}</td>
    </tr>
  );
}
