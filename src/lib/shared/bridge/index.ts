import {
  catatPembayaranState,
  readAkuns,
  readAkunsTrash,
  readJurnalEntries,
  setOasWindowFn,
  simpanPembayaranState,
  terapkanHapusPembayaranState,
} from "../legacy-store";
import * as accounting from "../accounting";
import * as format from "../format";
import * as penomoran from "../penomoran";
import * as urutJurnal from "../../jurnal/urut-jurnal";
import * as laporan from "../../laporan";
import * as defaultAkuns from "../../master/chart-of-accounts";
import * as asetTetap from "../../master/aset-tetap";
import * as kalkulator from "../../kalkulator";
import { registerKalkulatorWindowGlobals } from "../../kalkulator";
import * as kartuStock from "../../kalkulator/persediaan/kartu-stock";
import * as pembayaran from "../../fitur-baru/pembayaran";
import * as fiturTambahan from "../../fitur-baru/fitur-tambahan";
import * as settingsSwitcher from "../../fitur-baru/settings-switcher";
import * as adminAuth from "../../lainnya/audit-tim";
import * as cloud from "../../cloud";
import * as core from "../../core";
import { registerNpmExportGlobals } from "../../lainnya/export";

export const OAS_PURE_LIB = {
  ...format,
  ...accounting,
  ...defaultAkuns,
  ...asetTetap,
  ...urutJurnal,
  ...laporan,
  ...penomoran,
  ...pembayaran,
  ...kalkulator,
  ...kartuStock,
  ...adminAuth,
};

export type OasPureLib = typeof OAS_PURE_LIB;

export function registerOasCoreBridge(): void {
  if (typeof window === "undefined") return;
  // Inisialisasi runtime state store (__oasStore & __oasKsStore) lebih dulu (pengganti 01-state.js)
  core.initOasRuntimeStore();

  const win = window as unknown as Record<string, unknown>;
  win.__oasLib = OAS_PURE_LIB;
  win.PEMBAYARAN_JENIS = pembayaran.PEMBAYARAN_JENIS;
  win.PEMBAYARAN_STATUS_LANJUT = pembayaran.PEMBAYARAN_STATUS_LANJUT;

  // Core State, Utils, Navigation, Theme & Shell Widgets (migrated from 01, 02, 03, 04, 99)
  win.JENIS_PENUTUP = core.JENIS_PENUTUP;
  win.JENIS_JURNAL = core.JENIS_JURNAL;
  win.SUMBER_JURNAL = core.SUMBER_JURNAL;
  win.PPN_TARIF_STANDAR = core.PPN_TARIF_STANDAR;
  win.PeriodeTerkunciError = core.PeriodeTerkunciError;
  win.pageTitles = core.PAGE_TITLES;

  setOasWindowFn("seedData", core.seedData as (...args: never[]) => unknown);
  setOasWindowFn("resolveAkunSetting", core.resolveAkunSettingRuntime as (...args: never[]) => unknown);
  setOasWindowFn("fmtRp", core.fmtRp as (...args: never[]) => unknown);
  setOasWindowFn("fmtDate", core.fmtDate as (...args: never[]) => unknown);
  setOasWindowFn("rpNum", core.rpNum as (...args: never[]) => unknown);
  setOasWindowFn("getAkunNama", core.getAkunNamaRuntime as (...args: never[]) => unknown);
  setOasWindowFn("isJurnalPenutup", core.isJurnalPenutup as (...args: never[]) => unknown);
  setOasWindowFn("getReversalOf", core.getReversalOf as (...args: never[]) => unknown);
  setOasWindowFn("isJurnalPembalik", core.isJurnalPembalik as (...args: never[]) => unknown);
  setOasWindowFn("getReversedMap", core.getReversedMapRuntime as (...args: never[]) => unknown);
  setOasWindowFn("isJurnalDibalik", core.isJurnalDibalikRuntime as (...args: never[]) => unknown);
  setOasWindowFn("adalahJurnalPembelian", core.adalahJurnalPembelian as (...args: never[]) => unknown);
  setOasWindowFn("jurnalPembelianAktif", core.jurnalPembelianAktifRuntime as (...args: never[]) => unknown);
  setOasWindowFn("ringkasJurnalPembelian", core.ringkasJurnalPembelian as (...args: never[]) => unknown);
  setOasWindowFn("ketTanpaPrefixPembalik", core.ketTanpaPrefixPembalik as (...args: never[]) => unknown);
  setOasWindowFn("isPeriodeTerkunci", core.isPeriodeTerkunciRuntime as (...args: never[]) => unknown);
  setOasWindowFn("guardPeriode", core.guardPeriodeRuntime as (...args: never[]) => unknown);
  setOasWindowFn("getBulanAwalTahunBuku", core.getBulanAwalTahunBukuRuntime as (...args: never[]) => unknown);
  setOasWindowFn("getTahunBukuRange", core.getTahunBukuRangeRuntime as (...args: never[]) => unknown);
  setOasWindowFn("plNatural", core.plNatural as (...args: never[]) => unknown);
  setOasWindowFn("saldoAlamiPL", core.saldoAlamiPLRuntime as (...args: never[]) => unknown);
  setOasWindowFn("saldoBersihPL", core.saldoBersihPLRuntime as (...args: never[]) => unknown);
  setOasWindowFn("getJurnalTanpaPenutup", core.getJurnalTanpaPenutupRuntime as (...args: never[]) => unknown);
  setOasWindowFn("computeSaldoAll", core.computeSaldoAllRuntime as (...args: never[]) => unknown);
  setOasWindowFn("computeSaldoBersih", core.computeSaldoBersihRuntime as (...args: never[]) => unknown);
  setOasWindowFn("hitungPpn", core.hitungPpn as (...args: never[]) => unknown);
  setOasWindowFn("akunPpnKeluaranKode", core.akunPpnKeluaranKodeRuntime as (...args: never[]) => unknown);
  setOasWindowFn("ppnDariJurnal", core.ppnDariJurnalRuntime as (...args: never[]) => unknown);
  setOasWindowFn("rekapPpnJurnal", core.rekapPpnJurnalRuntime as (...args: never[]) => unknown);
  setOasWindowFn("parseJurnalFromAI", core.parseJurnalFromAIRuntime as (...args: never[]) => unknown);
  setOasWindowFn("setVal", core.setVal as (...args: never[]) => unknown);
  setOasWindowFn("setSelectVal", core.setSelectVal as (...args: never[]) => unknown);
  setOasWindowFn("sleep", core.sleep as (...args: never[]) => unknown);
  setOasWindowFn("emptyState", core.emptyState as (...args: never[]) => unknown);
  setOasWindowFn("escapeHtml", core.escapeHtml as (...args: never[]) => unknown);
  setOasWindowFn("escapeForJsAttr", core.escapeForJsAttr as (...args: never[]) => unknown);
  setOasWindowFn("toggleInfoPopover", core.toggleInfoPopover as (...args: never[]) => unknown);
  setOasWindowFn("closeInfoPopover", core.closeInfoPopover as (...args: never[]) => unknown);

  setOasWindowFn("toggleSidebar", core.toggleSidebar as (...args: never[]) => unknown);
  setOasWindowFn("closeSidebar", core.closeSidebar as (...args: never[]) => unknown);
  setOasWindowFn("showPage", core.showPage as (...args: never[]) => unknown);
  setOasWindowFn("handleAddBtn", core.handleAddBtn as (...args: never[]) => unknown);
  setOasWindowFn("populateAkunSelect", core.populateAkunSelect as (...args: never[]) => unknown);
  setOasWindowFn("safeHistoryPush", core.safeHistoryPush as (...args: never[]) => unknown);
  setOasWindowFn("safeHistoryReplace", core.safeHistoryReplace as (...args: never[]) => unknown);
  setOasWindowFn("initTheme", core.initTheme as (...args: never[]) => unknown);
  setOasWindowFn("applyTheme", core.applyTheme as (...args: never[]) => unknown);
  setOasWindowFn("syncPwaThemeChrome", core.syncPwaThemeChrome as (...args: never[]) => unknown);
  setOasWindowFn("toggleTheme", core.toggleTheme as (...args: never[]) => unknown);
  setOasWindowFn("dismissAndOpenPenyesuaian", core.dismissAndOpenPenyesuaian as (...args: never[]) => unknown);
  setOasWindowFn("openJurnalPenyesuaian", core.openJurnalPenyesuaian as (...args: never[]) => unknown);
  setOasWindowFn("openModalPenyesuaian", core.openJurnalPenyesuaian as (...args: never[]) => unknown);
  setOasWindowFn("startTutorial", core.startTutorial as (...args: never[]) => unknown);

  setOasWindowFn("setupNumberInputs", core.setupNumberInputs as (...args: never[]) => unknown);
  setOasWindowFn("formatRibuan", core.formatRibuan as (...args: never[]) => unknown);
  setOasWindowFn("showAlert", core.showAlert as (...args: never[]) => unknown);
  setOasWindowFn("showSuccessMorph", core.showSuccessMorph as (...args: never[]) => unknown);
  setOasWindowFn("showOpSpinner", core.showOpSpinner as (...args: never[]) => unknown);
  setOasWindowFn("hideOpSpinner", core.hideOpSpinner as (...args: never[]) => unknown);
  setOasWindowFn("showCustomConfirmGeneral", core.showCustomConfirmGeneral as (...args: never[]) => unknown);
  setOasWindowFn("showCustomInputModal", core.showCustomInputModal as (...args: never[]) => unknown);
  setOasWindowFn("showCustomSelectModal", core.showCustomSelectModal as (...args: never[]) => unknown);
  setOasWindowFn("openOptPicker", core.openOptPicker as (...args: never[]) => unknown);
  setOasWindowFn("closeOptPicker", core.closeOptPicker as (...args: never[]) => unknown);
  setOasWindowFn("openGlobalSearch", core.openGlobalSearch as (...args: never[]) => unknown);
  setOasWindowFn("closeGlobalSearch", core.closeGlobalSearch as (...args: never[]) => unknown);
  setOasWindowFn("openCropModal", core.openCropModal as (...args: never[]) => unknown);
  setOasWindowFn("closePhotoViewer", core.closePhotoViewer as (...args: never[]) => unknown);
  setOasWindowFn("_applyProfilePhoto", core.applyProfilePhoto as (...args: never[]) => unknown);
  setOasWindowFn("_applyCompanyLogo", core.applyCompanyLogo as (...args: never[]) => unknown);

  // Shared domain helpers
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

  // Pembayaran Invoice globals
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

  // Persediaan / Gudang engine globals
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

  // Penomoran, Daftar Bisnis & OAuth URL globals
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
    "openModal",
    cloud.openModal as (...args: never[]) => unknown
  );
  setOasWindowFn(
    "closeModal",
    ((id: string) => {
      cloud.closeModalReactAware(id);
      const el = document.getElementById(id);
      if (el) {
        if (el instanceof HTMLDialogElement && el.open) el.close();
        else el.classList.remove("open");
      }
      const closePop = win.closeInfoPopover;
      if (typeof closePop === "function") closePop();
    }) as (...args: never[]) => unknown
  );

  // Cloud, Auth, Storage, Profil, Audit & Permission globals (migrated from 00, 15, 16, 17, 18, 22)
  win.SUPABASE_URL = cloud.SUPABASE_URL;
  win.SUPABASE_ANON_KEY = cloud.SUPABASE_ANON_KEY;
  win.PROFIL_KEY = cloud.PROFIL_KEY;
  win.AUDIT_KEY = cloud.AUDIT_KEY;
  win.MODULES_CRUD = cloud.MODULES_CRUD;
  win.CLOUD_RECORD_KINDS = cloud.CLOUD_RECORD_KINDS;

  setOasWindowFn("initDbAdapter", cloud.initDbAdapter as (...args: never[]) => unknown);
  setOasWindowFn("cloudResetRecordsState", cloud.cloudResetRecordsState as (...args: never[]) => unknown);
  setOasWindowFn("_cloudLoadFromCache", cloud.cloudLoadFromCache as (...args: never[]) => unknown);
  setOasWindowFn("cloudDeleteRecords", cloud.cloudDeleteRecords as (...args: never[]) => unknown);
  setOasWindowFn("cloudOfferLocalMigration", cloud.cloudOfferLocalMigration as (...args: never[]) => unknown);
  setOasWindowFn("cloudLoadRecords", cloud.cloudLoadRecords as (...args: never[]) => unknown);
  setOasWindowFn("cloudSyncRecords", cloud.cloudSyncRecords as (...args: never[]) => unknown);

  setOasWindowFn("serializeData", cloud.serializeData as (...args: never[]) => unknown);
  setOasWindowFn("updateSaveIndicator", cloud.updateSaveIndicator as (...args: never[]) => unknown);
  setOasWindowFn("showAutoSaveToast", cloud.showAutoSaveToast as (...args: never[]) => unknown);
  setOasWindowFn("scheduleAutoSave", cloud.scheduleAutoSave as (...args: never[]) => unknown);
  setOasWindowFn("markDirty", cloud.markDirty as (...args: never[]) => unknown);
  setOasWindowFn("loadFromStorage", cloud.loadFromStorage as (...args: never[]) => unknown);
  setOasWindowFn("initStorage", cloud.initLocalStorageFull as (...args: never[]) => unknown);
  setOasWindowFn("getSlots", cloud.getSlots as (...args: never[]) => unknown);
  setOasWindowFn("saveToSlot", cloud.saveToSlot as (...args: never[]) => unknown);
  setOasWindowFn("loadFromSlot", cloud.loadFromSlot as (...args: never[]) => unknown);
  setOasWindowFn("deleteSlot", cloud.deleteSlot as (...args: never[]) => unknown);
  setOasWindowFn("exportBackupJSON", cloud.exportBackupJSON as (...args: never[]) => unknown);
  setOasWindowFn("toggleAutoSave", cloud.toggleAutoSave as (...args: never[]) => unknown);

  setOasWindowFn("getProfil", cloud.getProfil as (...args: never[]) => unknown);
  setOasWindowFn("handleLogoUpload", cloud.handleLogoUpload as (...args: never[]) => unknown);
  setOasWindowFn("loadProfilToSidebar", cloud.loadProfilToSidebar as (...args: never[]) => unknown);
  setOasWindowFn("showDemoModeBanner", cloud.showDemoModeBanner as (...args: never[]) => unknown);
  setOasWindowFn("closeInvMetodeSheet", cloud.closeInvMetodeSheet as (...args: never[]) => unknown);
  setOasWindowFn("openPhotoViewer", core.openPhotoViewerShell as (...args: never[]) => unknown);

  setOasWindowFn("makeDefaultPerms", cloud.makeDefaultPerms as (...args: never[]) => unknown);
  setOasWindowFn("_getActorRole", cloud.getActorRole as (...args: never[]) => unknown);
  setOasWindowFn("auditLog", cloud.auditLog as (...args: never[]) => unknown);
  setOasWindowFn("auditGetAll", cloud.auditGetAll as (...args: never[]) => unknown);
  setOasWindowFn("renderAuditTrail", cloud.renderAuditTrail as (...args: never[]) => unknown);
  setOasWindowFn("initAuditPage", cloud.initAuditPage as (...args: never[]) => unknown);
  setOasWindowFn("auditExportCSV", cloud.auditExportCSV as (...args: never[]) => unknown);
  setOasWindowFn("auditClearOld", cloud.auditClearOld as (...args: never[]) => unknown);
  setOasWindowFn("auditLogLogin", cloud.auditLogLogin as (...args: never[]) => unknown);
  setOasWindowFn("auditLogLogout", cloud.auditLogLogout as (...args: never[]) => unknown);
  setOasWindowFn("loadOrgMembers", cloud.loadOrgMembers as (...args: never[]) => unknown);
  setOasWindowFn("isAdmin", cloud.isAdmin as (...args: never[]) => unknown);
  setOasWindowFn("isReadOnly", cloud.isReadOnly as (...args: never[]) => unknown);
  setOasWindowFn("guardHanyaBaca", cloud.guardHanyaBaca as (...args: never[]) => unknown);
  setOasWindowFn("hasPerm", cloud.hasPerm as (...args: never[]) => unknown);
  setOasWindowFn("enforcePermissions", cloud.enforcePermissions as (...args: never[]) => unknown);
  setOasWindowFn("getOrCreateJoinCode", cloud.getOrCreateJoinCode as (...args: never[]) => unknown);
  setOasWindowFn("checkJoinCodeInURL", cloud.checkJoinCodeInURL as (...args: never[]) => unknown);
  setOasWindowFn("_processJoinCode", cloud.processJoinCode as (...args: never[]) => unknown);

  setOasWindowFn("initSupabase", cloud.initSupabase as (...args: never[]) => unknown);
  setOasWindowFn("enterGuestMode", cloud.enterGuestMode as (...args: never[]) => unknown);
  setOasWindowFn("updateGuestChip", cloud.updateGuestChip as (...args: never[]) => unknown);
  setOasWindowFn("showGuestBanner", cloud.showGuestBanner as (...args: never[]) => unknown);
  setOasWindowFn("showAuthModal", cloud.showAuthModal as (...args: never[]) => unknown);
  setOasWindowFn("hideAuthModal", cloud.hideAuthModal as (...args: never[]) => unknown);
  setOasWindowFn("showAuthScreen", cloud.showAuthModal as (...args: never[]) => unknown);
  setOasWindowFn("hideAuthScreen", cloud.hideAuthModal as (...args: never[]) => unknown);
  setOasWindowFn("doGoogleLogin", cloud.doGoogleLogin as (...args: never[]) => unknown);
  setOasWindowFn("doLogout", cloud.doLogout as (...args: never[]) => unknown);
  setOasWindowFn("handleChipClick", cloud.handleChipClick as (...args: never[]) => unknown);
  setOasWindowFn("afterLogin", cloud.afterLogin as (...args: never[]) => unknown);
  setOasWindowFn("showCompanyPicker", cloud.showCompanyPicker as (...args: never[]) => unknown);
  setOasWindowFn("showCompanyPickerScreen", cloud.showCompanyPickerScreen as (...args: never[]) => unknown);
  setOasWindowFn("getMyCompanies", cloud.getMyCompanies as (...args: never[]) => unknown);
  setOasWindowFn("selectCompany", cloud.selectCompany as (...args: never[]) => unknown);
  setOasWindowFn("deleteCompany", cloud.deleteCompany as (...args: never[]) => unknown);
  setOasWindowFn("updateUserChip", cloud.updateUserChip as (...args: never[]) => unknown);
  setOasWindowFn("offerGuestDataMigration", cloud.offerGuestDataMigration as (...args: never[]) => unknown);
  setOasWindowFn("loadDataFromSupabase", cloud.loadDataFromSupabase as (...args: never[]) => unknown);
  setOasWindowFn("saveJurnalToSupabase", cloud.saveJurnalToSupabase as (...args: never[]) => unknown);
  setOasWindowFn("updateJurnalInSupabase", cloud.updateJurnalInSupabase as (...args: never[]) => unknown);
  setOasWindowFn("deleteJurnalFromSupabase", cloud.deleteJurnalFromSupabase as (...args: never[]) => unknown);
  setOasWindowFn("saveAkunsToSupabase", cloud.saveAkunsToSupabase as (...args: never[]) => unknown);
  setOasWindowFn("saveProfilToSupabase", cloud.saveProfilToSupabase as (...args: never[]) => unknown);
  setOasWindowFn("savePeriodeKunciToCloud", cloud.savePeriodeKunciToCloud as (...args: never[]) => unknown);
  setOasWindowFn("saveKartuStockToCloud", cloud.saveKartuStockToCloud as (...args: never[]) => unknown);
  setOasWindowFn("loadKartuStockFromData", cloud.loadKartuStockFromData as (...args: never[]) => unknown);
  setOasWindowFn("saveAttachmentToSupabase", cloud.saveAttachmentToSupabase as (...args: never[]) => unknown);
  setOasWindowFn("saveToStorage", cloud.saveToStorage as (...args: never[]) => unknown);
  setOasWindowFn("manualSave", cloud.manualSave as (...args: never[]) => unknown);
  setOasWindowFn("addJurnal", cloud.addJurnal as (...args: never[]) => unknown);
  setOasWindowFn("postJurnalLegacy", cloud.postJurnalLegacy as (...args: never[]) => unknown);
  setOasWindowFn("blockNonNumeric", cloud.blockNonNumeric as (...args: never[]) => unknown);
  setOasWindowFn("sanitizePaste", cloud.sanitizePaste as (...args: never[]) => unknown);
  setOasWindowFn("diagnosSupabase", cloud.diagnosSupabase as (...args: never[]) => unknown);
  setOasWindowFn("showSupabaseSetup", cloud.showSupabaseSetup as (...args: never[]) => unknown);
  setOasWindowFn("showGoogleSetupGuide", cloud.showGoogleSetupGuide as (...args: never[]) => unknown);

  registerKalkulatorWindowGlobals();
  registerNpmExportGlobals();

  // Fitur Tambahan & Settings runtime globals (migrated from 19-fitur-tambahan.js & 21-settings.js)
  win.ATTACHMENTS_KEY = fiturTambahan.ATTACHMENTS_KEY;
  setOasWindowFn("saveFiturBaru", fiturTambahan.saveFiturBaru as (...args: never[]) => unknown);
  setOasWindowFn("autoNo", fiturTambahan.autoNo as (...args: never[]) => unknown);
  setOasWindowFn("hitungTanggalBerikutnya", fiturTambahan.hitungTanggalBerikutnya as (...args: never[]) => unknown);
  setOasWindowFn("cekNotifikasi", fiturTambahan.cekNotifikasi as (...args: never[]) => unknown);
  setOasWindowFn("updateNotifBadge", fiturTambahan.updateNotifBadge as (...args: never[]) => unknown);
  setOasWindowFn("getPajakNotifications", fiturTambahan.getPajakNotifications as (...args: never[]) => unknown);
  setOasWindowFn("dismissPajakNotif", fiturTambahan.dismissPajakNotif as (...args: never[]) => unknown);
  setOasWindowFn("renderPajakPanel", fiturTambahan.renderPajakPanel as (...args: never[]) => unknown);
  setOasWindowFn("buatJurnalPembalik", fiturTambahan.buatJurnalPembalikRuntime as (...args: never[]) => unknown);
  setOasWindowFn("confirmResetAll", fiturTambahan.confirmResetAll as (...args: never[]) => unknown);
  setOasWindowFn("getAttachments", fiturTambahan.getAttachmentsMap as (...args: never[]) => unknown);
  setOasWindowFn("downloadAttachment", fiturTambahan.downloadAttachmentFile as (...args: never[]) => unknown);
  setOasWindowFn("downloadAllAttachments", fiturTambahan.downloadAllAttachmentsZip as (...args: never[]) => unknown);
  setOasWindowFn("handlePwaInstall", fiturTambahan.handlePwaInstall as (...args: never[]) => unknown);
  setOasWindowFn("showPwaGuideModal", fiturTambahan.showPwaGuideModal as (...args: never[]) => unknown);
  setOasWindowFn("showOrgMembersSQL", fiturTambahan.showOrgMembersSQL as (...args: never[]) => unknown);

  setOasWindowFn("saveCurrentAccountToSwitcher", settingsSwitcher.saveCurrentAccountToSwitcher as (...args: never[]) => unknown);
  setOasWindowFn("toggleAccountSwitcher", settingsSwitcher.toggleAccountSwitcher as (...args: never[]) => unknown);
  setOasWindowFn("closeAccountSwitcher", settingsSwitcher.closeAccountSwitcher as (...args: never[]) => unknown);
  setOasWindowFn("renderAccountSwitcher", settingsSwitcher.renderAccountSwitcher as (...args: never[]) => unknown);
  setOasWindowFn("switchToAccount", settingsSwitcher.switchToAccount as (...args: never[]) => unknown);
  setOasWindowFn("addAccountFlow", settingsSwitcher.addAccountFlow as (...args: never[]) => unknown);
  setOasWindowFn("removeAccountFromSwitcher", settingsSwitcher.removeAccountFromSwitcher as (...args: never[]) => unknown);
  setOasWindowFn("cachePasswordLocally", settingsSwitcher.cachePasswordLocally as (...args: never[]) => unknown);

  fiturTambahan.initPwaListeners();
}
