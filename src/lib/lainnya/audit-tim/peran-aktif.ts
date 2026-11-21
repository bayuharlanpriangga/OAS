import { adalahPemilikBisnis } from "./cek-pemilik";
import type { CompanyLike } from "./types";

export function peranAktifBisnis(
  company: CompanyLike | null | undefined,
  userId?: string | null,
  memberRole?: string | null
): string | null {
  if (!company) return null;
  if (adalahPemilikBisnis(company, userId)) return "owner";
  return company._role || memberRole || "viewer";
}
