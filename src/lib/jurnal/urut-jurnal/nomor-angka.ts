export function nomorJurnalAngka(no: string | number | null | undefined): number | null {
  const m = /(\d+)\s*$/.exec(String(no == null ? "" : no));
  return m ? parseInt(m[1], 10) : null;
}
