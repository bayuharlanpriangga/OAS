import { peranAktifBisnis } from "./peranAktifBisnis";
import { peranBolehMenulis } from "./peranBolehMenulis";
import type { CompanyLike } from "./types";

export function bisnisHanyaBaca(
  company: CompanyLike | null | undefined,
  userId?: string | null,
  memberRole?: string | null
): boolean {
  const p = peranAktifBisnis(company, userId, memberRole);
  return p !== null && !peranBolehMenulis(p);
}
