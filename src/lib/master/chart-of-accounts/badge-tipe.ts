export function tipeBadgeClass(tipe: string): string {
  if (tipe === "Aset") return "badge-green";
  if (tipe === "Liabilitas") return "badge-red";
  if (tipe === "Ekuitas") return "badge-blue";
  if (tipe === "Pendapatan") return "badge-blue";
  if (tipe === "HPP") return "badge-yellow";
  return "badge-yellow";
}
