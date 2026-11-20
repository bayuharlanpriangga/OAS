import type { ParsedAIJurnal } from "@/types";
import { JENIS_JURNAL, SUMBER_JURNAL } from "../accounting/constants";
import { callOasGlobal } from "../legacy-store/callOasGlobal";
import { getJurnalSumberAktif } from "../legacy-store/getJurnalSumberAktif";
import { setJurnalSumberAktif } from "../legacy-store/setJurnalSumberAktif";

export async function saveParsedJurnalFromAi(parsed: ParsedAIJurnal): Promise<boolean> {
  if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length < 2) {
    callOasGlobal("showAlert", "Format jurnal dari AI tidak lengkap.");
    return false;
  }
  const allowed = callOasGlobal("guardPeriode", parsed.tanggal, "diposting");
  if (allowed === false) return false;

  const prev = getJurnalSumberAktif();
  setJurnalSumberAktif(SUMBER_JURNAL.ORIAS_AI);
  try {
    callOasGlobal("addJurnal", {
      ...parsed,
      jenis: parsed.jenis || JENIS_JURNAL.MANUAL,
      sumber: SUMBER_JURNAL.ORIAS_AI,
    });
    callOasGlobal("renderDashboard");
    callOasGlobal("showAlert", `✓ Jurnal "${parsed.ket}" disimpan ke sistem!`);
    return true;
  } finally {
    setJurnalSumberAktif(prev);
  }
}
