import * as accounting from "../accounting";
import * as adminAuth from "../admin-auth";
import * as aging from "../aging";
import * as asetTetap from "../aset-tetap";
import * as bill from "../bill";
import * as defaultAkuns from "../default-akuns";
import * as dok from "../dok";
import * as format from "../format";
import * as kalkulator from "../kalkulator";
import * as kartuKontak from "../kartu-kontak";
import * as kartuStock from "../kartu-stock";
import * as laporan from "../laporan";
import * as pembayaran from "../pembayaran";
import * as penawaranPesanan from "../penawaran-pesanan";
import * as penomoran from "../penomoran";
import * as urutJurnal from "../urut-jurnal";

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
