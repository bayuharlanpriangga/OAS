import * as accounting from "./accounting";
import * as aging from "./aging";
import * as asetTetap from "./aset-tetap";
import * as bill from "./bill";
import * as defaultAkuns from "./default-akuns";
import * as dok from "./dok";
import * as format from "./format";
import * as kalkulator from "./kalkulator";
import { registerKalkulatorWindowGlobals } from "./kalkulator-actions";
import { readAkuns, readAkunsTrash, setOasWindowFn } from "./legacy-store";
import * as pembayaran from "./pembayaran";
import * as penomoran from "./penomoran";

export const OAS_PURE_LIB = {
  ...format,
  ...accounting,
  ...defaultAkuns,
  ...asetTetap,
  ...penomoran,
  ...bill,
  ...dok,
  ...aging,
  ...pembayaran,
  ...kalkulator,
};

export type OasPureLib = typeof OAS_PURE_LIB;

export function registerOasCoreBridge(): void {
  if (typeof window === "undefined") return;
  (window as unknown as { __oasLib?: OasPureLib }).__oasLib = OAS_PURE_LIB;

  // Shared domain helpers migrated out of legacy 05-akun.js, 10-aset-tetap.js, and 12-kalkulator.js
  setOasWindowFn("getDefaultAkuns", defaultAkuns.getDefaultAkuns);
  setOasWindowFn(
    "tipeBadge",
    defaultAkuns.tipeBadgeClass as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "guessAkunPersediaanDefault",
    defaultAkuns.guessAkunPersediaanDefault as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "akunNamaTampil",
    ((kode: string) =>
      defaultAkuns.formatAkunNamaTampil(
        kode,
        readAkuns(),
        readAkunsTrash()
      )) as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "hitungPenyusutanAset",
    asetTetap.hitungPenyusutanAset as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "closeModal",
    ((id: string) => {
      const el = document.getElementById(id);
      if (el) {
        if (el instanceof HTMLDialogElement && el.open) el.close();
        else el.classList.remove("open");
      }
      const win = window as unknown as { closeInfoPopover?: () => void };
      if (typeof win.closeInfoPopover === "function") win.closeInfoPopover();
    }) as (...args: never[]) => unknown
  );

  registerKalkulatorWindowGlobals();
}
