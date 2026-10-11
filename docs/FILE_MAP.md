# FILE_MAP

Dibuat otomatis oleh `node tools/gen-file-map.js`. Jangan diedit manual.
Berisi deklarasi top-level tiap file di `js/` beserta rentang barisnya.

## js/00-db-adapter.js (72 baris, 3.6 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 7-26 | `_authStorage` | arrow |

## js/01-state.js (228 baris, 15.0 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 23-27 | `resolveAkunSetting` | function |
| 166-197 | `seedData` | function |

## js/02-utils.js (400 baris, 19.3 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 6-9 | `fmtRp` | function |
| 10-15 | `fmtDate` | function |
| 18 | `rpNum` | function |
| 20-22 | `getAkunNama` | function |
| 65 | `isJurnalPenutup` | function |
| 68-73 | `getReversalOf` | function |
| 74 | `isJurnalPembalik` | function |
| 77-81 | `getReversedMap` | function |
| 82 | `isJurnalDibalik` | function |
| 85 | `ketTanpaPrefixPembalik` | function |
| 88-90 | `isPeriodeTerkunci` | function |
| 92-98 | `guardPeriode` | function |
| 99 | `PeriodeTerkunciError` | class |
| 103-110 | `getBulanAwalTahunBuku` | function |
| 111 | `_pad2` | function |
| 112 | `_ymd` | function |
| 114-124 | `getTahunBukuRange` | function |
| 131-137 | `plNatural` | function |
| 139-143 | `saldoAlamiPL` | function |
| 144 | `saldoBersihPL` | function |
| 147 | `getJurnalTanpaPenutup` | function |
| 151-160 | `computeSaldoAll` | function |
| 162-168 | `computeSaldoBersih` | function |
| 187-190 | `hitungPpn` | function |
| 193-196 | `akunPpnKeluaranKode` | function |
| 200-207 | `_tarifPpnJurnal` | function |
| 211-231 | `ppnDariJurnal` | function |
| 234-249 | `rekapPpnJurnal` | function |
| 251-254 | `setVal` | function |
| 256-259 | `setSelectVal` | function |
| 261 | `sleep` | function |
| 269-277 | `_buildInfoPopover` | function |
| 280-292 | `toggleInfoPopover` | function |
| 293-300 | `closeInfoPopover` | function |
| 301-307 | `_onDocClickCloseInfoPopover` | function |
| 329-338 | `_positionInfoPopover` | function |
| 340-343 | `emptyState` | function |
| 345-353 | `escapeHtml` | function |
| 363-366 | `escapeForJsAttr` | function |
| 368-399 | `parseJurnalFromAI` | function |

## js/03-widgets.js (2718 baris, 154.2 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 4-20 | `setupNumberInputs` | function |
| 22-25 | `formatRibuan` | function |
| 27-43 | `updateFormatDisplay` | function |
| 45-48 | `hideFormatDisplay` | function |
| 50-56 | `showFormatDisplay` | function |
| 60-135 | `showCustomConfirmGeneral` | function |
| 138-221 | `showCustomInputModal` | function |
| 224-320 | `showCustomSelectModal` | function |
| 324-377 | `showAIRateLimitInfo` | function |
| 379-388 | `retryAfterCooldown` | function |
| 391-434 | `startCooldownDisplay` | function |
| 440-448 | `showAlert` | function |
| 450-454 | `_isSuccessMsg` | function |
| 459-494 | `showSuccessMorph` | function |
| 746 | `rp` | arrow |
| 747 | `pct` | arrow |
| 748 | `num` | arrow |
| 749-751 | `resRow` | function |
| 752-761 | `rasioRow` | function |
| 763-769 | `selectOptPickerByIndex` | function |
| 771-806 | `selectOptPicker` | function |
| 808-812 | `closeOptPicker` | function |
| 814-816 | `optPickerBackdropClick` | function |
| 820-878 | `upgradeSelectToOptPicker` | function |
| 882-909 | `upgradeAllPeriodPickers` | function |
| 912-1010 | `upgradeFormPickers` | function |
| 1013-1460 | `upgradePajakPickers` | function |
| 1487-1491 | `closePhotoViewer` | function |
| 1492 | `_pvKeyClose` | function |
| 1499-1533 | `openCropModal` | function |
| 1535-1568 | `_initCropLayout` | function |
| 1570-1581 | `_clampOffset` | function |
| 1583-1592 | `_renderCrop` | function |
| 1594-1610 | `onCropZoomSlider` | function |
| 1612-1720 | `_attachCropEvents` | function |
| 1722-1726 | `_pinchDist` | function |
| 1728-1760 | `confirmCrop` | function |
| 1762-1765 | `cancelCrop` | function |
| 1770-1790 | `_applyProfilePhoto` | function |
| 1792-1802 | `_applyCompanyLogo` | function |
| 2694-2717 | `updatePwaBtn` | function |

## js/04-navigasi-tema.js (704 baris, 32.4 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 3-6 | `toggleSidebar` | function |
| 7-10 | `closeSidebar` | function |
| 19-21 | `inIframe` | arrow |
| 63-158 | `showPage` | function |
| 160-162 | `handleAddBtn` | function |
| 165-175 | `switchTab` | function |
| 178-189 | `populateAkunSelect` | function |
| 192-195 | `safeHistoryPush` | function |
| 196-199 | `safeHistoryReplace` | function |
| 242-251 | `initTheme` | function |
| 253-281 | `applyTheme` | function |
| 294-303 | `syncPwaThemeChrome` | function |
| 305-309 | `toggleTheme` | function |
| 311-383 | `initTutDrag` | function |
| 385-397 | `tutMinimize` | function |
| 399-406 | `tutRestore` | function |
| 415-419 | `dismissAndOpenPenyesuaian` | function |
| 421-423 | `openJurnalPenyesuaian` | function |
| 425 | `openInlineTemplatePenyesuaian` | function |
| 426 | `toggleTemplatePenyesuaian` | function |
| 427 | `fillPenyesuaianInline` | function |
| 428 | `openModalPenyesuaian` | function |
| 433-466 | `renderArusKas` | function |
| 468-477 | `runSequential` | function |
| 479-487 | `exitTutorial` | function |
| 489-496 | `clearTutHighlight` | function |
| 498-589 | `renderTutStep` | function |
| 591-606 | `tutNext` | function |
| 608-610 | `tutSkipSection` | function |
| 612-634 | `positionTutTooltip` | function |
| 636-647 | `positionTutTooltipCenter` | function |
| 649-651 | `showTutComplete` | function |
| 654 | `startTutorial` | function |
| 673-698 | `openOptPicker` | function |

## js/05-akun.js (522 baris, 29.9 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 5-11 | `akunNamaTampil` | function |
| 27-33 | `guessAkunPersediaanDefault` | function |
| 35-44 | `openSimplePicker` | function |
| 47-54 | `tipeBadge` | function |
| 58-138 | `renderAkun` | function |
| 140-158 | `buildAkunRow` | function |
| 160-190 | `hapusAkun` | function |
| 197-201 | `_akunTrashSisaHari` | function |
| 204-209 | `purgeExpiredAkunTrash` | function |
| 211-215 | `openModalAkunTrash` | function |
| 217-246 | `renderAkunTrashList` | function |
| 248-263 | `restoreAkunTrash` | function |
| 265 | `openModalAkun` | function |
| 266 | `closeModal` | function |
| 271-282 | `openAkunPicker` | function |
| 284-291 | `closeAkunPicker` | function |
| 293-304 | `filterAkunPicker` | function |
| 306-336 | `renderAkunPickerList` | function |
| 338-347 | `selectAkunFromPicker` | function |
| 349-355 | `syncAkunTrigger` | function |
| 356-372 | `simpanAkun` | function |
| 379-397 | `openExportModal` | function |
| 399-518 | `getDefaultAkuns` | function |

## js/06-transaksi.js (1294 baris, 65.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-29 | `renderFilteredPickerList` | function |
| 31-59 | `selectSimplePicker` | function |
| 61-79 | `initTransaksiForm` | function |
| 82-101 | `previewKas` | function |
| 103-125 | `simpanKas` | function |
| 128-136 | `getAkunPendapatanDefault` | function |
| 155-172 | `openJualAkunPicker` | function |
| 174-185 | `initJualAkunPendapatan` | function |
| 188-213 | `previewJual` | function |
| 222-235 | `_toggleBeliBarangJadiMode` | function |
| 238-274 | `openBeliAkunPicker` | function |
| 277-280 | `addBeliBahanBakuRow` | function |
| 283-287 | `removeBeliBahanBakuRow` | function |
| 290-330 | `openBeliBahanBakuPicker` | function |
| 333-337 | `onBeliBahanBakuQtyChange` | function |
| 340-371 | `renderBeliBahanBakuList` | function |
| 374-395 | `_updateBeliBahanBakuTotal` | function |
| 398-435 | `openBeliProdukPicker` | function |
| 438-458 | `_applyBeliProduk` | function |
| 461-470 | `_updateBeliTotalHint` | function |
| 472 | `onBeliQtyChange` | function |
| 473 | `onBeliJumlahChange` | function |
| 476-485 | `_getBeliJurnalLines` | function |
| 487-569 | `previewBeli` | function |
| 571-698 | `simpanPenjualan` | function |
| 701-874 | `simpanPembelian` | function |
| 878-882 | `initManualLines` | function |
| 883-897 | `addManualLine` | function |
| 898-901 | `removeLine` | function |
| 902-912 | `updateBalance` | function |
| 913-934 | `simpanManual` | function |
| 937-944 | `getSaldoAkun` | function |
| 947-968 | `onJualJenisChange` | function |
| 970-974 | `_toggleJualJumlahRow` | function |
| 977-1012 | `_setJualJumlahMode` | function |
| 1037-1048 | `openSimpelJenisPembelianPicker` | function |
| 1055-1074 | `_updateSimpelJumlahLabel` | function |
| 1076-1097 | `openSimpelJenisPenjualanPicker` | function |
| 1099-1113 | `openSimpelTipePicker` | function |
| 1115-1128 | `setSimpelTipe` | function |
| 1130-1148 | `getSimpelJurnalLines` | function |
| 1150-1167 | `previewSimpel` | function |
| 1169-1192 | `simpanSimpel` | function |
| 1198-1293 | `renderDashBebanPajak` | function |

## js/07-jurnal-laporan.js (491 baris, 32.3 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 5-11 | `jeninsBadge` | function |
| 14-18 | `_isAkunPpnKeluar` | function |
| 19-23 | `_isAkunPpnMasuk` | function |
| 25-32 | `getPpnSubBadge` | function |
| 38-41 | `updateSaldoAwalBtnVisibility` | function |
| 45-64 | `syncJurnalTypeFilter` | function |
| 67-122 | `renderJurnalUmum` | function |
| 125-153 | `renderJurnalKas` | function |
| 156-175 | `renderJurnalPenjualan` | function |
| 178-197 | `renderJurnalPembelian` | function |
| 200-231 | `renderBukuBesar` | function |
| 233-243 | `openBukuBesarPicker` | function |
| 252-309 | `renderNeraca` | function |
| 310-337 | `exportArusKasPDF` | function |
| 338 | `exportPerubahanEkuitasPDF` | function |
| 343-354 | `openModalAsetTetap` | function |
| 356-364 | `renderReportWithPeriod` | function |
| 369-385 | `getFilteredSaldo` | function |
| 387-413 | `renderLabaRugiFiltered` | function |
| 415-432 | `renderNeracaSaldoFiltered` | function |
| 435 | `renderLabaRugi` | function |
| 436 | `renderNeracaSaldo` | function |
| 439-490 | `showAIConfirm` | function |

## js/08-kartu-stock.js (3398 baris, 162.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-235 | `deteksiPenyesuaianOtomatis` | function |
| 237-306 | `renderAutoDetectModal` | function |
| 308-325 | `_syncAdjLines` | function |
| 327-330 | `_toggleAdjPreview` | function |
| 332-349 | `inputSatuAutoDetect` | function |
| 351-379 | `inputSemuaAutoDetect` | function |
| 381-402 | `_buatJurnalPenyesuaianAuto` | function |
| 404-510 | `fillPenyesuaian` | function |
| 519 | `ksMetodeDiakui` | function |
| 521-528 | `ksAdaDataLifo` | function |
| 543-545 | `_ksDefaultData` | function |
| 548-552 | `getActiveKategori` | function |
| 555-561 | `syncKartuStockDataFromKategori` | function |
| 564-571 | `syncKategoriFromKartuStockData` | function |
| 574-580 | `getKsSaldoKat` | function |
| 583-594 | `getCardSaldo` | function |
| 597-656 | `initMultiKartuStock` | function |
| 658-667 | `saveMKS` | function |
| 673-698 | `switchActiveKS` | function |
| 700-706 | `switchActiveKategori` | function |
| 708-763 | `renderKartuStockSelector` | function |
| 765-935 | `_renderExtraKsCards` | function |
| 937-955 | `openKsExtraKatPicker` | function |
| 957-959 | `openModalKelolaKSExtra` | function |
| 962-991 | `openModalKelolaKategoriCard` | function |
| 993-999 | `hapusKategori` | function |
| 1000-1012 | `_doHapusKategori` | function |
| 1014-1040 | `clearExtraCard` | function |
| 1042-1045 | `hapusExtraCardPicker` | function |
| 1048-1074 | `openModalKelolaSemuaKartuStock` | function |
| 1076-1083 | `hapusCardDenganValidasi` | function |
| 1084-1111 | `_doHapusCard` | function |
| 1113-1132 | `openKsSelectorPicker` | function |
| 1134-1158 | `openKsExtraMetodePicker` | function |
| 1160-1170 | `openModalTambahKS` | function |
| 1172-1183 | `openModalTambahKategori` | function |
| 1185-1195 | `openModalEditCard` | function |
| 1197-1200 | `openModalEditKS` | function |
| 1202-1213 | `openModalEditKategori` | function |
| 1215-1277 | `simpanModalKS` | function |
| 1279-1299 | `openModalKelolaKS` | function |
| 1301-1311 | `hapusKS` | function |
| 1314-1378 | `showPilihKartuStockPopup` | function |
| 1380-1386 | `_doSelectKartuForInput` | function |
| 1398-1418 | `openKonversiKartuStock` | function |
| 1420-1434 | `selectKsConvDari` | function |
| 1436-1453 | `selectKsConvKe` | function |
| 1455-1473 | `selectKsConvOpt` | function |
| 1475-1479 | `toggleKsHapusLama` | function |
| 1481-1496 | `_updateKsHapusLamaUI` | function |
| 1498-1512 | `updateKsConvPreview` | function |
| 1515-1519 | `_getEntriesMasukFromSource` | function |
| 1526-1544 | `_buildMergedMasuk` | function |
| 1551-1584 | `_rekalkulasiKartuStock` | function |
| 1586-1608 | `previewKonversiKS` | function |
| 1610-1672 | `eksekusiKonversiKS` | function |
| 1674-1713 | `switchKartuStockTab` | function |
| 1715-1726 | `inputKeKartuStock` | function |
| 1728-1807 | `_doInputKeKartuStock` | function |
| 1809-1826 | `rebuildStockFromKartu` | function |
| 1828-1912 | `_buildKartuStockTable` | function |
| 1916-1932 | `fixKsTableStickyHeaders` | function |
| 1933-2080 | `renderKartuStock` | function |
| 2082-2101 | `_ksConfirm` | function |
| 2103-2122 | `_attachKartuStockEvents` | function |
| 2124-2142 | `clearKartuStock` | function |
| 2144-2166 | `bukaPopupJurnalSingle` | function |
| 2168-2192 | `bukaPopupJurnalSemua` | function |
| 2194-2244 | `konfirmasiInputJurnalKartu` | function |
| 2253-2296 | `addKartuStockOnBuy` | function |
| 2298-2366 | `deductKartuStockOnSale` | function |
| 2368-2391 | `getHppLayersForSale` | function |
| 2397-2402 | `buildHppJurnalLines` | function |
| 2407-2423 | `openProdukFilterCardPicker` | function |
| 2428-2459 | `openKsMetodePicker` | function |
| 2461-2465 | `_makeKsTabEl` | function |
| 2492-2507 | `_findKatByNama` | function |
| 2509-2514 | `_findKatById` | function |
| 2515-2548 | `openProdukPickerJual` | function |
| 2550-2575 | `_openProdukPickerLevel2Jual` | function |
| 2577-2590 | `_selectProdukJual` | function |
| 2593-2617 | `_updateJualHargaDisplay` | function |
| 2619-2629 | `onJualQtyChange` | function |
| 2633-2640 | `toggleKartuStockLock` | function |
| 2642-2657 | `_updateLockHeaderBtn` | function |
| 2664-3379 | `_installAuditHooks` | function |

## js/09-produk.js (347 baris, 16.9 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-20 | `openProdukFilterKatPicker` | function |
| 22-155 | `renderProduk` | function |
| 160-198 | `openModalEditProdukHarga` | function |
| 201-220 | `updateProdukPpnBreakdown` | function |
| 222-250 | `simpanProduk` | function |
| 252-254 | `hapusProduk` | function |
| 258-312 | `openProdukPicker` | function |
| 314-332 | `_applySimpelKategori` | function |
| 333-346 | `onSimpelQtyChange` | function |

## js/10-aset-tetap.js (254 baris, 22.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-10 | `hitungPenyusutanAset` | function |
| 12-29 | `simpanAsetTetap` | function |
| 32 | `atGetAutoEnabled` | function |
| 33 | `atToggleAuto` | function |
| 34-40 | `atUpdateAutoUI` | function |
| 41-62 | `atCheckAndRunAutoPenyusutan` | function |
| 63 | `buatJurnalPenyusutanBulanan` | function |
| 64 | `disposalAset` | function |
| 65-89 | `hapusAset` | function |
| 90 | `atInitOnLoad` | function |
| 94-101 | `atSetView` | function |
| 104-118 | `renderAsetTetapKPI` | function |
| 122 | `atGetFotoAll` | function |
| 123 | `atSaveFotoAll` | function |
| 124 | `atGetFoto` | function |
| 126-131 | `openFotoAset` | function |
| 132-142 | `renderFotoGrid` | function |
| 143-156 | `handleAtFotoUpload` | function |
| 157-160 | `atDelFoto` | function |
| 161-165 | `atViewFoto` | function |
| 171-192 | `renderAsetTetap` | function |
| 194-246 | `atRenderCard` | function |
| 253 | `filterKontak` | function |

## js/11-kontak-invoice.js (367 baris, 27.6 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 1-11 | `openModalKontak` | function |
| 12 | `simpanKontak` | function |
| 13 | `hapusKontak` | function |
| 14 | `lihatDetailKontak` | function |
| 15 | `renderKontakKPI` | function |
| 16 | `renderKontak` | function |
| 24-35 | `updateKontakTotalTrx` | function |
| 38-52 | `recalcKontakTotalTrx` | function |
| 58-67 | `openKontakPicker` | function |
| 69-98 | `renderKontakPickerList` | function |
| 100-115 | `selectKontakPicker` | function |
| 117-122 | `closeKontakPicker` | function |
| 124 | `onJualKontakChange` | function |
| 125 | `refreshKontakPickers` | function |
| 154-163 | `makeDefaultPerms` | function |
| 165-175 | `renderInvoiceItems` | function |
| 177 | `tambahItemInvoice` | function |
| 180-183 | `_invPpnTarif` | function |
| 185-193 | `hitungTotalInvoice` | function |
| 195-241 | `simpanInvoice` | function |
| 243-260 | `renderInvoiceKPI` | function |
| 262-290 | `renderInvoiceList` | function |
| 292-306 | `openModalLunasInvoice` | function |
| 308-332 | `konfirmasiLunasInvoice` | function |
| 334-342 | `hapusInvoice` | function |
| 347-366 | `handleRekonCSV` | function |

## js/12-kalkulator.js (2268 baris, 113.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 5-7 | `getKodeCounter` | function |
| 9-16 | `nextKode` | function |
| 18-20 | `isDuplicateKode` | function |
| 22-38 | `checkAndInputKalkulator` | function |
| 43-58 | `undoLastKalkInput` | function |
| 63-155 | `inputPenyusutanJurnal` | function |
| 158-211 | `inputBEPJurnal` | function |
| 214-258 | `inputAnuitasJurnal` | function |
| 261-269 | `inputPersediaanJurnal` | function |
| 272-302 | `inputPPNJurnal` | function |
| 305-345 | `inputPPH21Jurnal` | function |
| 348-372 | `showKalkUndoBar` | function |
| 375 | `addKalkInputButtons` | function |
| 376-412 | `_addKalkInputButtonsUnused` | function |
| 414-421 | `createKalkBar` | function |
| 424-435 | `addPajakInputBtns` | function |
| 439-465 | `addKalkButtonsIfNeeded` | function |
| 466-479 | `addPajakButtonsIfNeeded` | function |
| 493-499 | `addInputBtnToPenyusutan` | function |
| 500-510 | `addInputBtnToBEP` | function |
| 511-517 | `addInputBtnToAnuitas` | function |
| 518-524 | `addInputBtnToPersediaan` | function |
| 525-531 | `addInputBtnToPPN` | function |
| 532-538 | `addInputBtnToPPH21` | function |
| 541-634 | `hitungPenyusutan` | function |
| 639-654 | `addInvRow` | function |
| 655-667 | `resetInv` | function |
| 668-879 | `hitungPersediaan` | function |
| 884-889 | `switchBungaTab` | function |
| 891-945 | `hitungBunga` | function |
| 947-1007 | `hitungAnuitas` | function |
| 1009-1040 | `hitungPV` | function |
| 1042-1060 | `hitungDiskonto` | function |
| 1063-1172 | `hitungRasio` | function |
| 1175-1234 | `hitungBEP` | function |
| 1237-1244 | `switchPajakTab` | function |
| 1255-1279 | `hitungPPN` | function |
| 1285-1314 | `setBukanPegawaiMode` | function |
| 1317-1332 | `p21OnBulanChange` | function |
| 1344-1369 | `switchP21Kategori` | function |
| 1512-1524 | `getTERHarian` | function |
| 1525-1532 | `getTERKategori` | function |
| 1533-1537 | `getTERTable` | function |
| 1538-1544 | `getTERTarif` | function |
| 1546-1710 | `hitungPPh21` | function |
| 1713-1719 | `getTarifPs17Marginal` | function |
| 1721-1731 | `hitungTarifProgresif` | function |
| 1732-1744 | `hitungTarifProgresifDetail` | function |
| 1746-1765 | `setTTMode` | function |
| 1767-1788 | `hitungPPh21TidakTetapBulanan` | function |
| 1790-1854 | `hitungPPh21TidakTetap` | function |
| 1856-1885 | `hitungPPh21Komisaris` | function |
| 1887-1949 | `hitungPPh21BukanPegawai` | function |
| 1951-1994 | `hitungPPh21PesertaKegiatan` | function |
| 1996-2033 | `hitungPPh21Pensiun` | function |
| 2035-2078 | `hitungPPh21MantanPegawai` | function |
| 2081-2186 | `hitungPPh21PNS` | function |
| 2189-2205 | `hitungPPh23` | function |
| 2207-2244 | `hitungBadan` | function |

## js/13-analitik-dashboard.js (1996 baris, 96.3 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 3-33 | `getPeriodRange` | function |
| 35-43 | `filterJurnalByPeriod` | function |
| 50-52 | `openAnPeriodPopup` | function |
| 53-55 | `closeAnPeriodPopup` | function |
| 56-58 | `closeAnPeriodPopupDirect` | function |
| 59-69 | `setAnPeriodPopup` | function |
| 72-80 | `triggerAnalitikRefresh` | function |
| 88-100 | `showOpSpinner` | function |
| 101-115 | `hideOpSpinner` | function |
| 117-312 | `renderAnalitik` | function |
| 314-316 | `renderAnalitikEmpty` | function |
| 326-329 | `anBaseHeight` | function |
| 331-375 | `anDrawGroupedBar` | function |
| 377-433 | `anDrawLine` | function |
| 435-477 | `anDrawBarSignedColor` | function |
| 479-524 | `anDrawBebanDonut` | function |
| 526-549 | `anDrawRasio` | function |
| 551-599 | `anDrawWaterfall` | function |
| 601-644 | `anDrawTopAkun` | function |
| 646-715 | `anDrawProyeksi` | function |
| 717-740 | `anDrawHeatmap` | function |
| 742-778 | `anDrawPeriodCompare` | function |
| 780-785 | `anFmtShort` | function |
| 786-789 | `hexToRgba` | function |
| 792-806 | `anFillLabel2` | function |
| 809-857 | `openAnChartModal` | function |
| 859-863 | `closeAnChartModal` | function |
| 881-898 | `saveFiturBaru` | function |
| 900-920 | `hitungPPh21Otomatis` | function |
| 922-933 | `hitungPPh23Otomatis` | function |
| 935-962 | `buatJurnalPPh21` | function |
| 964-991 | `buatJurnalPPh23` | function |
| 1015-1063 | `getReminders` | function |
| 1066-1237 | `renderDashPiutangUtang` | function |
| 1241-1314 | `renderChart` | function |
| 1317-1441 | `renderDashboard` | function |
| 1453-1471 | `_cariTahunBukuBelumDitutup` | function |
| 1473-1550 | `buatJurnalPenutup` | function |
| 1553-1616 | `cekRekonsiliasi` | function |
| 1621-1625 | `openGlobalSearch` | function |
| 1626-1630 | `closeGlobalSearch` | function |
| 1632-1737 | `doGlobalSearch` | function |
| 1739-1745 | `handleSearchKey` | function |
| 1746-1750 | `highlightSearch` | function |
| 1778-1800 | `addPeriodFilterToReports` | function |
| 1806-1826 | `initRekapPajakBulanSelect` | function |
| 1828-1843 | `openPajakBulanPicker` | function |
| 1845-1948 | `renderRekapSiapSetor` | function |
| 1950-1952 | `exportRekapPajakPDF` | function |

## js/14-export.js (3198 baris, 184.2 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-8 | `selectExportFmt` | function |
| 10-22 | `updateExportSections` | function |
| 24-35 | `selectExcelTemplate` | function |
| 41-52 | `removeLogo` | function |
| 54-59 | `expStatus` | function |
| 61-87 | `openPdfPreview` | function |
| 90-116 | `_pvInjectThemeAndExport` | function |
| 118-187 | `doExport` | function |
| 217-232 | `_getActorRole` | function |
| 239-255 | `_patchHapusJurnalBtn` | function |
| 409-419 | `_pvLoadSaved` | function |
| 420-427 | `_pvSaveTheme` | function |
| 428-446 | `pvResetToDefault` | function |
| 447-458 | `_pvUpdateExportModalBadge` | function |
| 462 | `pvGetColor` | function |
| 463 | `pvGetC1` | function |
| 464 | `pvGetC2` | function |
| 465 | `pvGetC3` | function |
| 466 | `pvHex2rgb` | function |
| 467 | `pvRgb2hex` | function |
| 468 | `pvHsv2hex` | function |
| 469 | `pvHex2hsv` | function |
| 470 | `pvLuminance` | function |
| 471 | `pvContrast` | function |
| 472 | `pvLighten` | function |
| 473 | `pvRgbStr` | function |
| 475 | `closePdfPreview` | function |
| 476-482 | `pvTogglePanel` | function |
| 483 | `pvSelectTmpl` | function |
| 484-487 | `pvRenderPalList` | function |
| 488 | `pvOnPalHex` | function |
| 489-495 | `pvApply` | function |
| 497-521 | `pvBuildPages` | function |
| 523-634 | `pvStyles` | function |
| 636-691 | `pvWrap` | function |
| 693-807 | `pvMakeCover` | function |
| 809 | `pvSaldo` | function |
| 811-820 | `pvMakeDash` | function |
| 822-832 | `pvMakeJurnal` | function |
| 834-840 | `pvMakeLR` | function |
| 842-848 | `pvMakeNeraca` | function |
| 850-854 | `pvMakeSaldo` | function |
| 856-861 | `pvMakePajak` | function |
| 863-882 | `pvRenderPage` | function |
| 884-887 | `pvBuildThumbs` | function |
| 889 | `pvGoTo` | function |
| 897-905 | `pvCalcFitZoom` | function |
| 908-935 | `pvInitZoom` | function |
| 937-942 | `pvZoom` | function |
| 945-948 | `pvZoomReset` | function |
| 950-1020 | `pvApplyZoom` | function |
| 1021 | `pvNav` | function |
| 1034-1042 | `pvUpdateNav` | function |
| 1044-1150 | `pvExportNow` | function |
| 1153-1170 | `pvOpenCP` | function |
| 1171-1181 | `pvDrawSL` | function |
| 1182-1189 | `pvOnSL` | function |
| 1190 | `pvOnHue` | function |
| 1191 | `pvOnHexInput` | function |
| 1192 | `pvUpdateSwatch` | function |
| 1193-1201 | `pvUpdateContrast` | function |
| 1202 | `pvPickPreset` | function |
| 1203-1211 | `pvConfirmCP` | function |
| 1212 | `pvCloseCP` | function |
| 1213-1217 | `pvRenderRecent` | function |
| 1218 | `pvPickRecentColor` | function |
| 1222-1229 | `exportExcel` | function |
| 1231-1699 | `exportExcelData` | function |
| 1704-2316 | `exportExcelFormula` | function |
| 2318-2816 | `exportPDF` | function |
| 2819-2882 | `exportCSV` | function |
| 2887-2892 | `executeAIActions` | async function |
| 2894-3197 | `_executeAIActionsInner` | async function |

## js/15-storage.js (448 baris, 18.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 4 | `getStorageKey` | function |
| 5 | `getMetaKey` | function |
| 18-25 | `initStorage` | function |
| 27-31 | `markDirty` | function |
| 33-40 | `scheduleAutoSave` | function |
| 43-67 | `saveToStorage` | function |
| 69-73 | `manualSave` | function |
| 76-111 | `loadFromStorage` | function |
| 114-127 | `serializeData` | function |
| 130-134 | `getSlots` | function |
| 136-149 | `saveToSlot` | function |
| 151-175 | `loadFromSlot` | function |
| 177-185 | `deleteSlot` | function |
| 187-249 | `renderStorageSlots` | function |
| 251 | `escHtml` | function |
| 253-256 | `getSizeKB` | function |
| 258-261 | `openStorageModal` | function |
| 264-271 | `toggleAutoSave` | function |
| 274-291 | `updateSaveIndicator` | function |
| 295-308 | `showAutoSaveToast` | function |
| 311-323 | `exportBackupJSON` | function |
| 325-358 | `importBackupJSON` | function |
| 362-396 | `doResetAll` | async function |

## js/16-auth-company.js (1885 baris, 83.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 4-120 | `initSupabase` | async function |
| 124-158 | `enterGuestMode` | function |
| 160-179 | `updateGuestChip` | function |
| 181-197 | `showGuestBanner` | function |
| 203-324 | `showAuthModal` | function |
| 327-359 | `initAuthTabDrag` | function |
| 362-378 | `typeText` | function |
| 381-396 | `untypeText` | function |
| 398-400 | `_authDelay` | function |
| 408-493 | `playAuthIntro` | async function |
| 495-501 | `hideAuthModal` | function |
| 503-511 | `switchModalAuthTab` | function |
| 513-521 | `showModalAuthMsg` | function |
| 523-526 | `clearModalAuthMsg` | function |
| 528-535 | `setModalAuthLoading` | function |
| 537-546 | `doModalLogin` | async function |
| 548-563 | `doModalRegister` | async function |
| 565-571 | `doModalForgotPassword` | async function |
| 575-600 | `offerGuestDataMigration` | async function |
| 604-607 | `showAuthScreen` | function |
| 609-611 | `hideAuthScreen` | function |
| 613-619 | `switchAuthTab` | function |
| 621-628 | `showAuthMsg` | function |
| 630-633 | `clearAuthMsg` | function |
| 635-642 | `setAuthLoading` | function |
| 644-647 | `toggleAuthPw` | function |
| 649-659 | `doLogin` | async function |
| 661-676 | `doRegister` | async function |
| 678-713 | `doGoogleLogin` | async function |
| 716-749 | `showGoogleSetupGuide` | function |
| 751-757 | `doForgotPassword` | async function |
| 759-768 | `doLogout` | async function |
| 772-780 | `handleChipClick` | function |
| 784-872 | `afterLogin` | async function |
| 877-894 | `showCompanyPicker` | async function |
| 896-922 | `showCompanyPickerScreen` | function |
| 924-961 | `renderCompanyList` | function |
| 966-1032 | `attachCompanyCardHandlers` | function |
| 1037-1051 | `showCompanyActionSheet` | function |
| 1053-1056 | `closeCompanyActionSheet` | function |
| 1058-1063 | `cpActionOpen` | function |
| 1065-1070 | `cpActionDelete` | function |
| 1075-1081 | `showDeleteCompanyConfirm` | function |
| 1083-1093 | `closeDeleteCompanyConfirm` | function |
| 1095-1121 | `confirmDeleteCompany` | async function |
| 1123-1125 | `deleteCompany` | async function |
| 1127-1158 | `getMyCompanies` | async function |
| 1161-1172 | `blockNonNumeric` | function |
| 1173-1179 | `sanitizePaste` | function |
| 1181-1189 | `selectBizType` | function |
| 1191-1247 | `createCompany` | async function |
| 1249-1276 | `selectCompany` | async function |
| 1278-1317 | `updateUserChip` | function |
| 1322-1405 | `loadDataFromSupabase` | async function |
| 1418-1422 | `_jurnalMetaDari` | function |
| 1423-1425 | `_errKolomMeta` | function |
| 1427-1449 | `saveJurnalToSupabase` | async function |
| 1451-1468 | `updateJurnalInSupabase` | async function |
| 1470-1480 | `deleteJurnalFromSupabase` | async function |
| 1483-1492 | `saveAkunsToSupabase` | async function |
| 1495-1511 | `saveProfilToSupabase` | async function |
| 1514-1530 | `savePeriodeKunciToCloud` | async function |
| 1533-1555 | `saveKartuStockToCloud` | async function |
| 1557-1603 | `loadKartuStockFromData` | function |
| 1606-1609 | `saveAttachmentToSupabase` | async function |
| 1660-1683 | `addJurnal` | function |
| 1689-1697 | `postJurnalLegacy` | function |
| 1744-1773 | `handleAttachFile` | function |
| 1777-1805 | `diagnosSupabase` | async function |
| 1807-1884 | `showSupabaseSetup` | function |

## js/17-profil-perusahaan.js (490 baris, 23.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 12-14 | `getProfil` | function |
| 16-34 | `switchProfilMode` | function |
| 36-61 | `renderProfilView` | function |
| 63-87 | `loadProfilToEditForm` | function |
| 89-97 | `loadProfil` | function |
| 99-135 | `handleLogoUpload` | function |
| 136-170 | `saveProfil` | function |
| 172-191 | `showSaveProfilSuccess` | function |
| 192 | `openModal` | function |
| 198-204 | `checkShowOnboarding` | function |
| 206-241 | `obNext` | function |
| 242-256 | `obBack` | function |
| 257-262 | `selectObType` | function |
| 264-267 | `loadProfilToSidebar` | function |
| 269-280 | `showDemoModeBanner` | function |
| 349-361 | `openInvMetodeSheet` | function |
| 363-372 | `selectInvMetode` | function |
| 374-379 | `closeInvMetodeSheet` | function |
| 389-404 | `openTahunBukuPicker` | function |
| 405-410 | `selectTahunBuku` | function |
| 411-415 | `closeTahunBukuPicker` | function |
| 424-439 | `openMataUangPicker` | function |
| 440-445 | `selectMataUang` | function |
| 446-450 | `closeMataUangPicker` | function |
| 479-489 | `openPhotoViewer` | function |

## js/18-audit-permission.js (1193 baris, 64.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-10 | `_getCurrentActorLabel` | function |
| 13-36 | `auditLog` | function |
| 38-40 | `auditGetAll` | function |
| 43-106 | `renderAuditTrail` | function |
| 109-112 | `_renderAuditBizBar` | function |
| 114-118 | `auditSetBizFilter` | function |
| 120-142 | `_renderAuditKPI` | function |
| 144-148 | `_auditActionLabel` | function |
| 150-162 | `_auditFmtTime` | function |
| 164-171 | `_renderDiff` | function |
| 174-200 | `auditToggleRoleFilter` | function |
| 203-208 | `auditSetFilter` | function |
| 209 | `auditLoadMore` | function |
| 212-228 | `auditExportCSV` | function |
| 231-240 | `auditClearOld` | function |
| 243-250 | `initAuditPage` | function |
| 253-267 | `auditLogLogin` | function |
| 268-270 | `auditLogLogout` | function |
| 275-285 | `loadOrgMembers` | async function |
| 287-289 | `isAdmin` | function |
| 291-297 | `hasPerm` | function |
| 299-323 | `enforcePermissions` | function |
| 327-342 | `getOrCreateJoinCode` | async function |
| 344-359 | `showJoinCodeModal` | async function |
| 361-367 | `regenerateJoinCode` | async function |
| 369-376 | `copyJoinLink` | function |
| 379-396 | `checkJoinCodeInURL` | async function |
| 399-444 | `_processJoinCode` | async function |
| 447-451 | `openUserMgmtModal` | function |
| 453-511 | `renderUserMgmtList` | async function |
| 513-519 | `removeMember` | async function |
| 523-548 | `openInviteModal` | function |
| 550-572 | `kirimInvite` | async function |
| 575-601 | `openEditMember` | async function |
| 603-619 | `simpanEditMember` | async function |
| 624-664 | `renderPermTable` | function |
| 667-669 | `toggleRowAll` | function |
| 672-677 | `syncRowAll` | function |
| 680-690 | `readPermTableValues` | function |
| 744-757 | `openJoinWithCodeModal` | function |
| 759-786 | `prosesJoinCode` | async function |
| 799-884 | `getKsSaldo` | function |
| 1083-1101 | `auditOpenKatPicker` | function |
| 1104-1119 | `auditOpenAktPicker` | function |
| 1122-1156 | `auditOpenBizPicker` | function |

## js/19-fitur-tambahan.js (1842 baris, 99.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 2-34 | `openModalJurnalBerulang` | function |
| 36-70 | `simpanJurnalBerulang` | function |
| 72-84 | `hitungTanggalBerikutnya` | function |
| 86-129 | `renderJurnalBerulang` | function |
| 131-151 | `jalankanJurnalBerulang` | function |
| 153-178 | `jalankanSemuaJurnalBerulang` | function |
| 180-188 | `hapusJurnalBerulang` | function |
| 190-193 | `toggleAktifJB` | function |
| 198-225 | `openModalInvoice` | function |
| 227-242 | `parseCSVBank` | function |
| 244-275 | `prosesRekonsiliasi` | function |
| 278-285 | `filterRekon` | function |
| 287-305 | `renderRekonTable` | function |
| 307-328 | `importSatuRekon` | function |
| 330-354 | `importRekonSebagaiJurnal` | function |
| 362-366 | `renderKursPage` | function |
| 368-388 | `renderKursCards` | function |
| 390-398 | `renderKursManualInputs` | function |
| 400-411 | `simpanKursManual` | function |
| 413-425 | `refreshKursOtomatis` | function |
| 427-438 | `hitungKonversi` | function |
| 441 | `openModalAlertBaru` | function |
| 443-450 | `renderAlertForm` | function |
| 452-468 | `simpanAlertBaru` | function |
| 470-501 | `cekNotifikasi` | function |
| 503-512 | `updateNotifBadge` | function |
| 514-546 | `renderNotifikasiPage` | function |
| 548-550 | `toggleAlert` | function |
| 551-553 | `hapusAlert` | function |
| 556-570 | `openModalAnggaran` | function |
| 572-585 | `simpanAnggaran` | function |
| 587-670 | `renderAnggaranPage` | function |
| 672-674 | `hapusAnggaran` | function |
| 677-761 | `renderPajakOtomatis` | function |
| 763-792 | `parseBankStatement` | function |
| 794-799 | `parseBankStatementFromDrop` | function |
| 801-824 | `parseBankCSV` | function |
| 826-848 | `parseBankExcel` | function |
| 850-867 | `parseFlexDate` | function |
| 869-890 | `parseRp` | function |
| 892-910 | `processBankRows` | function |
| 912-932 | `showBankResults` | function |
| 934-956 | `renderBankTable` | function |
| 958 | `filterBankRows` | function |
| 960-975 | `buatJurnalDariBankRow` | async function |
| 980-982 | `getAttachments` | function |
| 984-997 | `openAttachModal` | function |
| 999-1029 | `renderAttachList` | function |
| 1031-1033 | `addAttachment` | function |
| 1038-1080 | `viewAttachment` | function |
| 1082-1103 | `deleteAttachment` | function |
| 1106-1115 | `downloadAttachment` | function |
| 1118-1150 | `downloadAllAttachments` | async function |
| 1155-1208 | `getPajakNotifications` | function |
| 1210-1215 | `dismissPajakNotif` | function |
| 1220-1237 | `renderPajakPanel` | function |
| 1245-1298 | `buatJurnalPembalik` | function |
| 1300-1349 | `konfirmasiBalikJurnal` | function |
| 1353 | `konfirmasiHapusJurnal` | function |
| 1355-1359 | `confirmResetAll` | function |
| 1364-1396 | `openModalSaldoAwal` | function |
| 1398-1413 | `updateSaldoAwalBalance` | function |
| 1415-1450 | `simpanSaldoAwal` | function |
| 1453-1456 | `autoNo` | function |
| 1458-1564 | `handlePwaInstall` | function |
| 1566-1583 | `showPwaGuideModal` | function |
| 1789-1837 | `showOrgMembersSQL` | function |

## js/20-ai-chat.js (2041 baris, 162.0 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 72-78 | `detectAIProvider` | function |
| 80-95 | `makeKeyRecord` | function |
| 97-118 | `getAIKeys` | function |
| 120-122 | `saveAIKeys` | function |
| 125 | `getGeminiKeys` | function |
| 126 | `saveGeminiKeys` | function |
| 128 | `getKeyHash` | function |
| 130-139 | `formatCountdown` | function |
| 141-149 | `formatCountdownShort` | function |
| 163-166 | `getEffectiveActiveProviderId` | function |
| 173-186 | `setActiveProvider` | function |
| 188-190 | `isRecordCoolingDown` | function |
| 192-203 | `getAvailableKeyRecord` | function |
| 205-212 | `getShortestCooldownMs` | function |
| 214-223 | `trackKeyUsage` | function |
| 227-234 | `AIProviderError` | function |
| 236-243 | `parseRateLimitError` | async function |
| 249-277 | `callGeminiOnce` | async function |
| 279-310 | `callAnthropicOnce` | async function |
| 314-344 | `callOpenAICompatOnce` | async function |
| 346-352 | `callProviderOnce` | async function |
| 354-427 | `callAIWithRotation` | async function |
| 430-432 | `callGeminiWithRotation` | async function |
| 442-451 | `openApiKeyModal` | function |
| 452 | `openGeminiKeyModal` | function |
| 454-459 | `closeApiKeyModal` | function |
| 461-470 | `startAIKeyLiveUpdates` | function |
| 472-474 | `stopAIKeyLiveUpdates` | function |
| 476-486 | `toggleGeminiInfo` | function |
| 595-610 | `renderProviderGuideGrid` | function |
| 616-651 | `openProviderGuideModal` | function |
| 653-666 | `updateDetectedProviderLabel` | function |
| 673-677 | `getEffectiveUsedCount` | function |
| 681-694 | `renderRingSVG` | function |
| 697-718 | `renderKeyRing` | function |
| 726-753 | `computeProviderStats` | function |
| 755-759 | `toggleProviderCard` | function |
| 761-764 | `toggleKeyDetail` | function |
| 766-774 | `copyKeyToClipboard` | function |
| 776-781 | `updateKeyModel` | function |
| 787-819 | `renderKeyRow` | function |
| 821-903 | `renderAIKeysList` | function |
| 904 | `loadGeminiKeys` | function |
| 906-925 | `addAIKey` | function |
| 926 | `addGeminiKey` | function |
| 928-936 | `removeAIKey` | function |
| 937 | `removeGeminiKey` | function |
| 939-953 | `updateAIKeyStatus` | function |
| 956-960 | `useChip` | function |
| 962-973 | `toggleAIChips` | function |
| 975-985 | `initChipsState` | function |
| 987-1007 | `clearAIChat` | function |
| 1009-1018 | `appendMsg` | function |
| 1020-1048 | `getAppContext` | function |
| 1050-1283 | `sendAI` | async function |
| 1285-1294 | `addQuickBtn` | function |
| 1296-1380 | `formatAIResponse` | function |
| 1382-1388 | `saveJurnalFromAI` | function |
| 2025-2040 | `startTutorialById` | function |

## js/21-settings.js (777 baris, 41.8 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 27-31 | `settingsNavigate` | function |
| 33-37 | `settingsGoBack` | function |
| 41-44 | `settingsResetTo` | function |
| 46-71 | `renderSettingsView` | function |
| 75-77 | `switchSettingsTab` | function |
| 78-80 | `switchSettingsTransTab` | function |
| 81-85 | `switchAccsTab` | function |
| 90-92 | `_settingsJualJenisList` | function |
| 93-95 | `_settingsBeliJenisList` | function |
| 97-101 | `renderSettingsTransaksi` | function |
| 103-125 | `_renderSettingsAkunList` | function |
| 127-135 | `_updateSettingsAkun` | function |
| 137-141 | `_resetSettingsAkun` | function |
| 144-172 | `renderSettingsKunci` | function |
| 173-182 | `toggleKunciInfo` | function |
| 183-192 | `simpanKunciPeriode` | async function |
| 193-200 | `bukaKunciPeriode` | async function |
| 202-226 | `_renderSettingsHppPersediaan` | function |
| 238-240 | `_getSavedAccounts` | function |
| 241-243 | `_setSavedAccounts` | function |
| 246-268 | `saveCurrentAccountToSwitcher` | function |
| 270-277 | `toggleAccountSwitcher` | function |
| 278-281 | `closeAccountSwitcher` | function |
| 282-286 | `_accSwitcherOutsideClick` | function |
| 288-315 | `renderAccountSwitcher` | function |
| 317-333 | `switchToAccount` | async function |
| 335-340 | `addAccountFlow` | async function |
| 342-345 | `removeAccountFromSwitcher` | function |
| 364-369 | `openAccountSettings` | async function |
| 371-396 | `accsLoadUserInfo` | async function |
| 398-419 | `handleProfilePhotoUpload` | function |
| 421-531 | `accsLoadProviders` | async function |
| 533-546 | `accsLinkProvider` | async function |
| 548-562 | `accsUnlinkProvider` | async function |
| 564-592 | `accsUpdateProfile` | async function |
| 598-606 | `accsHasEmailLogin` | function |
| 608-628 | `openAccsPasswordModal` | function |
| 630-684 | `accsUpdatePassword` | async function |
| 689-698 | `accsForgotPassword` | async function |
| 700-704 | `accsLogoutAll` | async function |
| 706-710 | `accsShowMsg` | function |
| 712 | `toggleAccsPw` | function |
| 715 | `_pwCacheKey` | function |
| 717-719 | `cachePasswordLocally` | function |
| 721-737 | `loadCachedPasswordDisplay` | function |
| 739-751 | `copyCurrentPassword` | function |

## js/22-cloud-records.js (299 baris, 14.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 24 | `_cloudKursDefault` | function |
| 25-30 | `_cloudKursFromList` | function |
| 32-34 | `_cloudKursLegacy` | function |
| 62 | `_cloudCacheKey` | function |
| 64-66 | `_cloudCacheLocal` | function |
| 68-73 | `_cloudReadCache` | function |
| 75 | `_cloudSeenKey` | function |
| 78-81 | `_cloudPendingOnce` | function |
| 84-87 | `_cloudLegacyAllowed` | function |
| 90-101 | `_cloudIndex` | function |
| 104-113 | `_cloudSortNewestFirst` | function |
| 115-118 | `cloudResetRecordsState` | function |
| 120-123 | `_cloudLoadFromCache` | function |
| 125-177 | `cloudLoadRecords` | async function |
| 183-246 | `cloudOfferLocalMigration` | async function |
| 249-258 | `cloudSyncRecords` | function |
| 260-298 | `_cloudSyncNow` | async function |

## js/99-init.js (15 baris, 0.6 KB)

_tidak ada deklarasi top-level_

## js/db-adapter.js (85 baris, 4.5 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 21-40 | `_authStorage` | arrow |
