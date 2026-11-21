import * as accounting from "../accounting";
import * as format from "../format";
import * as penomoran from "../penomoran";
import * as urutJurnal from "../../jurnal/urut-jurnal";
import * as laporan from "../../laporan";
import * as defaultAkuns from "../../master/chart-of-accounts";
import * as asetTetap from "../../master/aset-tetap";
import * as kalkulator from "../../kalkulator";
import * as kartuStock from "../../kalkulator/persediaan/kartu-stock";
import * as bill from "../../fitur-baru/tagihan-beli";
import * as aging from "../../fitur-baru/umur";
import * as kartuKontak from "../../fitur-baru/kartu";
import * as dok from "../../fitur-baru/penawaran";
import * as penawaranPesanan from "../../fitur-baru/pesanan-jual";
import * as pembayaran from "../../fitur-baru/pembayaran";
import * as adminAuth from "../../lainnya/audit-tim";

export const OAS_PURE_LIB = {
  ...format,
  ...accounting,
  ...defaultAkuns,
  ...asetTetap,
  ...urutJurnal,
  ...laporan,
  ...penomoran,
  ...bill,
  ...dok,
  ...aging,
  ...kartuKontak,
  ...penawaranPesanan,
  ...pembayaran,
  ...kalkulator,
  ...kartuStock,
  ...adminAuth,
};
