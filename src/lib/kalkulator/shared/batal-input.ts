import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { kalkulatorState } from "./state";

export function undoLastKalkInput(): void {
  if (!kalkulatorState.lastInput) {
    callOasGlobal("showAlert", "Tidak ada input yang bisa di-undo");
    return;
  }
  const { kode, jurnalIndices } = kalkulatorState.lastInput;
  if (
    !window.confirm(
      `Batalkan jurnal dari "${kode}"?\n\nJurnal asli tidak dihapus: sistem membuat jurnal pembalik bertanggal hari ini.`
    )
  ) {
    return;
  }
  const entries = readJurnalEntries();
  const asal = jurnalIndices.map((i) => entries[i]).filter(Boolean);
  let dibalik = 0;
  try {
    asal.forEach((e) => {
      if (
        callOasGlobal("buatJurnalPembalik", e, {
          alasan: `Undo input kalkulator ${kode}`,
        })
      ) {
        dibalik++;
      }
    });
  } catch (err) {
    const win = window as unknown as {
      PeriodeTerkunciError?: new (...args: unknown[]) => Error;
    };
    if (!win.PeriodeTerkunciError || !(err instanceof win.PeriodeTerkunciError)) {
      throw err;
    }
  }
  if (!dibalik) return;
  kalkulatorState.lastInput = null;
  callOasGlobal("renderDashboard");
  callOasGlobal("renderJurnalUmum");
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input "${kode}" dibatalkan lewat ${dibalik} jurnal pembalik`
  );
  document.querySelectorAll<HTMLElement>(".kalk-undo-btn").forEach((b) => {
    b.style.display = "none";
  });
}
