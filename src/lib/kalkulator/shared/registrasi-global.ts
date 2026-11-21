import { setOasWindowFn } from "../../shared/legacy-store/daftar-fungsi-global";
import { checkAndInputKalkulator } from "./validasi-input";
import { inputAnuitasJurnal } from "../bunga/posting-anuitas";
import { inputBEPJurnal } from "../bep-margin/posting-jurnal";
import { inputPenyusutanJurnal } from "../penyusutan/posting-jurnal";
import { inputPersediaanJurnal } from "../persediaan/posting-jurnal";
import { isDuplicateKode } from "./cek-duplikat";
import { nextKode } from "./kode-berikut";
import { showKalkUndoBar } from "./banner-undo";
import { undoLastKalkInput } from "./batal-input";

function dispatchKalkSync(detail: { kind: string; tab?: string }): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("oas:kalk-sync", { detail }));
}

export function registerKalkulatorWindowGlobals(): void {
  setOasWindowFn("nextKode", nextKode as (...args: never[]) => unknown);
  setOasWindowFn("isDuplicateKode", isDuplicateKode as (...args: never[]) => unknown);
  setOasWindowFn(
    "checkAndInputKalkulator",
    checkAndInputKalkulator as (...args: never[]) => unknown
  );
  setOasWindowFn("undoLastKalkInput", undoLastKalkInput);
  setOasWindowFn("showKalkUndoBar", showKalkUndoBar as (...args: never[]) => unknown);
  setOasWindowFn("inputPenyusutanJurnal", inputPenyusutanJurnal);
  setOasWindowFn("inputBEPJurnal", inputBEPJurnal);
  setOasWindowFn("inputAnuitasJurnal", inputAnuitasJurnal);
  setOasWindowFn("inputPersediaanJurnal", inputPersediaanJurnal);
  setOasWindowFn("addKalkButtonsIfNeeded", () => {});
  setOasWindowFn("addKalkInputButtons", () => {});

  setOasWindowFn("hitungPenyusutan", () => dispatchKalkSync({ kind: "penyusutan" }));
  setOasWindowFn("hitungBunga", () => dispatchKalkSync({ kind: "bunga" }));
  setOasWindowFn("hitungAnuitas", () => dispatchKalkSync({ kind: "anuitas" }));
  setOasWindowFn("hitungPV", () => dispatchKalkSync({ kind: "pv" }));
  setOasWindowFn("hitungDiskonto", () => dispatchKalkSync({ kind: "diskonto" }));
  setOasWindowFn("hitungRasio", () => dispatchKalkSync({ kind: "rasio" }));
  setOasWindowFn("hitungBEP", () => dispatchKalkSync({ kind: "bep" }));
  setOasWindowFn(
    "switchBungaTab",
    ((tab: string) => dispatchKalkSync({ kind: "bunga-tab", tab })) as (
      ...args: never[]
    ) => unknown
  );
  setOasWindowFn("hitungPersediaan", () => dispatchKalkSync({ kind: "persediaan-calc" }));
  setOasWindowFn("resetInv", () => dispatchKalkSync({ kind: "persediaan-reset" }));
  setOasWindowFn(
    "addInvRow",
    ((jenis: string) =>
      dispatchKalkSync({ kind: "persediaan-add", tab: jenis })) as (
      ...args: never[]
    ) => unknown
  );
}
