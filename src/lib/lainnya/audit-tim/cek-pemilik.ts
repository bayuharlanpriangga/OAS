import type { CompanyLike } from "./types";

export function adalahPemilikBisnis(
  company: CompanyLike | null | undefined,
  userId?: string | null
): boolean {
  if (!company || !userId) return false;
  return company._role === "owner" || company.user_id === userId;
}
