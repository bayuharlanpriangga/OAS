import * as accounting from "./accounting";
import * as aging from "./aging";
import * as bill from "./bill";
import * as dok from "./dok";
import * as format from "./format";
import * as kalkulator from "./kalkulator";
import * as pembayaran from "./pembayaran";
import * as penomoran from "./penomoran";

export const OAS_PURE_LIB = {
  ...format,
  ...accounting,
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
}
