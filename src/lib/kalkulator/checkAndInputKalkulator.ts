import type { JurnalEntry } from "@/types";
import { callOasGlobal } from "../legacy-store/callOasGlobal";
import { isDuplicateKode } from "./isDuplicateKode";

export function checkAndInputKalkulator(
  kode: string,
  jurnals: JurnalEntry[],
  successMsg: string,
  onSuccess?: (kode: string) => void
): void {
  if (isDuplicateKode(kode)) {
    if (
      !window.confirm(
        `Kode "${kode}" sudah pernah diinput sebelumnya!\n\nApakah kamu yakin ingin input ulang? (Bisa menyebabkan jurnal ganda)`
      )
    ) {
      return;
    }
  }
  const terkunci = jurnals.find((j) =>
    Boolean(callOasGlobal("isPeriodeTerkunci", j.tanggal))
  );
  if (terkunci) {
    callOasGlobal("guardPeriode", terkunci.tanggal, "diposting");
    return;
  }
  jurnals.forEach((j) => {
    j.kodeRef = kode;
    callOasGlobal("addJurnal", j);
  });
  callOasGlobal("renderDashboard");
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${successMsg} [${kode}]`
  );
  if (onSuccess) onSuccess(kode);
}
