import * as adminAuth from "../admin-auth";
import * as aging from "../aging";
import * as asetTetap from "../aset-tetap";
import * as bill from "../bill";
import * as defaultAkuns from "../default-akuns";
import * as dok from "../dok";
import { registerNpmExportGlobals } from "../export";
import { registerKalkulatorWindowGlobals } from "../kalkulator";
import * as kartuStock from "../kartu-stock";
import * as laporan from "../laporan";
import {
  catatPembayaranState,
  hapusBillByIdState,
  hapusDokByIdState,
  nomorBillBerikutState,
  nomorDokBerikutState,
  perbaruiBillState,
  perbaruiDokState,
  readAkuns,
  readAkunsTrash,
  readJurnalEntries,
  setOasWindowFn,
  simpanBillState,
  simpanDokState,
  simpanPembayaranState,
  tambahBillState,
  tambahDokState,
  terapkanHapusPembayaranState,
} from "../legacy-store";
import * as pembayaran from "../pembayaran";
import * as penawaranPesanan from "../penawaran-pesanan";
import * as penomoran from "../penomoran";
import * as urutJurnal from "../urut-jurnal";
import { OAS_PURE_LIB } from "./constants";

export function registerOasCoreBridge(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  win.__oasLib = OAS_PURE_LIB;
  win.DOK_JENIS = dok.DOK_JENIS;
  win.AGING_BUCKETS = aging.AGING_BUCKETS;
  win.PEMBAYARAN_JENIS = pembayaran.PEMBAYARAN_JENIS;
  win.PEMBAYARAN_STATUS_LANJUT = pembayaran.PEMBAYARAN_STATUS_LANJUT;

  // Shared domain helpers migrated out of legacy Domain 1, Domain 2 & Domain 3A scripts
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
    "jeninsBadge",
    laporan.jeninsBadge as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "getPpnSubBadge",
    ((j: Parameters<typeof laporan.getPpnSubBadge>[0]) =>
      laporan.getPpnSubBadge(j, readAkuns())) as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "getSaldoAkun",
    ((kode: string) =>
      laporan.getSaldoAkunPure(readJurnalEntries(), readAkuns(), kode)) as (
      ...args: never[]
    ) => unknown
  );
  setOasWindowFn(
    "getFilteredSaldo",
    ((periodVal?: string, opts?: { tanpaPenutup?: boolean }) =>
      laporan.getFilteredSaldoPure(
        readJurnalEntries(),
        periodVal || "all",
        opts
      )) as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "urutkanJurnalUmum",
    urutJurnal.urutkanJurnalUmum as (...args: never[]) => unknown
  );

  // Domain 3A pure & store helpers for any legacy caller (15-storage, 22-cloud-records, etc.)
  setOasWindowFn(
    "hitungAging",
    aging.hitungAging as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "bucketAging",
    aging.bucketAging as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "billUntukAging",
    aging.billUntukAging as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "pembelianKreditTanpaBill",
    aging.pembelianKreditTanpaBill as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "hitungTotalBill",
    bill.hitungTotalBill as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "susunBill",
    bill.susunBill as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "buatJurnalBill",
    bill.buatJurnalBill as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "jurnalBillStatus",
    bill.jurnalBillStatus as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "nomorBillBerikut",
    nomorBillBerikutState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "simpanBillState",
    simpanBillState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "tambahBill",
    tambahBillState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "perbaruiBill",
    perbaruiBillState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "hapusBillById",
    hapusBillByIdState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "pembayaranDokumen",
    pembayaran.pembayaranDokumen as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "totalDibayar",
    pembayaran.totalDibayar as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "sisaTagihan",
    pembayaran.sisaTagihan as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "statusDariPembayaran",
    pembayaran.statusDariPembayaran as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "simpanPembayaranState",
    simpanPembayaranState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "catatPembayaran",
    catatPembayaranState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "terapkanHapusPembayaran",
    terapkanHapusPembayaranState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "susunDok",
    dok.susunDok as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "transisiDok",
    dok.transisiDok as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "hitungTotalDok",
    dok.hitungTotalDok as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "nomorDokBerikut",
    nomorDokBerikutState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "simpanDokState",
    simpanDokState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "tambahDok",
    tambahDokState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "perbaruiDok",
    perbaruiDokState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "hapusDokById",
    hapusDokByIdState as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "pesananKeInvoice",
    penawaranPesanan.pesananKeInvoice as (...args: never[]) => unknown
  );

  // Domain 3B Kartu Stock engine globals
  win.KS_METODE_DIAKUI = kartuStock.KS_METODE_DIAKUI;
  setOasWindowFn(
    "ksMetodeDiakui",
    kartuStock.ksMetodeDiakui as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "ksAdaDataLifo",
    kartuStock.ksAdaDataLifo as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "initMultiKartuStock",
    kartuStock.initMultiKartuStockStore as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "saveMKS",
    kartuStock.saveMksStore as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "getKsSaldoKat",
    kartuStock.hitungSaldoKat as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "getCardSaldo",
    kartuStock.hitungSaldoCard as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "rebuildStockFromKartu",
    kartuStock.rebuildStockFromKartu as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "addKartuStockOnBuy",
    kartuStock.addKartuStockOnBuyStore as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "deductKartuStockOnSale",
    kartuStock.deductKartuStockOnSaleStore as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "getHppLayersForSale",
    kartuStock.getHppLayersForSale as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "buildHppJurnalLines",
    kartuStock.buildHppJurnalLines as (...args: never[]) => unknown
  );

  // Domain 4C Penomoran, Daftar Bisnis & OAuth URL globals (retired 23-, 26-, 27-)
  win.PERAN_BISNIS_LABEL = adminAuth.PERAN_BISNIS_LABEL;
  win.MODUL_HALAMAN = adminAuth.MODUL_HALAMAN;
  win.PERAN_BOLEH_TULIS = adminAuth.PERAN_BOLEH_TULIS;
  setOasWindowFn("parseNomor", penomoran.parseNomor as (...args: never[]) => unknown);
  setOasWindowFn("nomorBerikut", penomoran.nomorBerikut as (...args: never[]) => unknown);
  setOasWindowFn("counterSetelahPakai", penomoran.counterSetelahPakai as (...args: never[]) => unknown);
  setOasWindowFn("counterTanpaJenis", penomoran.counterTanpaJenis as (...args: never[]) => unknown);
  setOasWindowFn("selesaikanBentrokNomorInvoice", penomoran.selesaikanBentrokNomorInvoice as (...args: never[]) => unknown);
  setOasWindowFn("nomorInvoiceBerikut", adminAuth.nomorInvoiceBerikutState as (...args: never[]) => unknown);
  setOasWindowFn("catatNomorInvoice", adminAuth.catatNomorInvoiceState as (...args: never[]) => unknown);
  setOasWindowFn("resetCounterJenis", adminAuth.resetCounterJenisState as (...args: never[]) => unknown);
  setOasWindowFn("periksaDanSelesaikanBentrokInvoice", adminAuth.periksaDanSelesaikanBentrokInvoiceState as (...args: never[]) => unknown);
  setOasWindowFn("labelPeranBisnis", adminAuth.labelPeranBisnis as (...args: never[]) => unknown);
  setOasWindowFn("adalahPemilikBisnis", adminAuth.adalahPemilikBisnis as (...args: never[]) => unknown);
  setOasWindowFn("modulUntukHalaman", adminAuth.modulUntukHalaman as (...args: never[]) => unknown);
  setOasWindowFn("peranBolehMenulis", adminAuth.peranBolehMenulis as (...args: never[]) => unknown);
  setOasWindowFn("peranAktifBisnis", adminAuth.peranAktifBisnis as (...args: never[]) => unknown);
  setOasWindowFn("bisnisHanyaBaca", adminAuth.bisnisHanyaBaca as (...args: never[]) => unknown);
  setOasWindowFn("susunDaftarBisnis", adminAuth.susunDaftarBisnis as (...args: never[]) => unknown);
  setOasWindowFn("ringkasHasilGabung", adminAuth.ringkasHasilGabung as (...args: never[]) => unknown);
  setOasWindowFn("bacaParamOAuth", adminAuth.bacaParamOAuth as (...args: never[]) => unknown);

  setOasWindowFn(
    "closeModal",
    ((id: string) => {
      const el = document.getElementById(id);
      if (el) {
        if (el instanceof HTMLDialogElement && el.open) el.close();
        else el.classList.remove("open");
      }
      const closePop = win.closeInfoPopover;
      if (typeof closePop === "function") closePop();
    }) as (...args: never[]) => unknown
  );

  registerKalkulatorWindowGlobals();
  registerNpmExportGlobals();
}
