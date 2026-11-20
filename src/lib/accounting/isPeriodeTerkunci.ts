export function isPeriodeTerkunci(
  tanggal: string | null | undefined,
  periodeKunciSampai: string | null | undefined
): boolean {
  return (
    !!periodeKunciSampai &&
    !!tanggal &&
    String(tanggal).slice(0, 10) <= periodeKunciSampai
  );
}
