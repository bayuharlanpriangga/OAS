import type { CompanyLike } from "./types";

export function susunDaftarBisnis<T extends CompanyLike>(
  owned: readonly T[] | null | undefined,
  memberships:
    | readonly { company_id: string; role?: string; status?: string }[]
    | null
    | undefined,
  memberCompanies: readonly T[] | null | undefined,
  userId?: string | null
): Array<T & { _role: string }> {
  const hasil: Array<T & { _role: string }> = [];
  const sudah = new Set<string>();
  (Array.isArray(owned) ? owned : []).forEach((c) => {
    if (!c || sudah.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: "owner" });
  });
  const peranPerBisnis = new Map<string, string>();
  (Array.isArray(memberships) ? memberships : []).forEach((m) => {
    if (m && m.status === "active") {
      peranPerBisnis.set(m.company_id, m.role || "viewer");
    }
  });
  (Array.isArray(memberCompanies) ? memberCompanies : []).forEach((c) => {
    if (!c || sudah.has(c.id) || c.user_id === userId) return;
    if (!peranPerBisnis.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: peranPerBisnis.get(c.id) || "viewer" });
  });
  return hasil;
}
