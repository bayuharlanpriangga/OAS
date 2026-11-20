import { setOasWindowFn } from "../legacy-store/setOasWindowFn";
import { checkAndInputKalkulator } from "./checkAndInputKalkulator";
import { inputAnuitasJurnal } from "./inputAnuitasJurnal";
import { inputBEPJurnal } from "./inputBEPJurnal";
import { inputPenyusutanJurnal } from "./inputPenyusutanJurnal";
import { inputPersediaanJurnal } from "./inputPersediaanJurnal";
import { isDuplicateKode } from "./isDuplicateKode";
import { nextKode } from "./nextKode";
import { showKalkUndoBar } from "./showKalkUndoBar";
import { undoLastKalkInput } from "./undoLastKalkInput";

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
