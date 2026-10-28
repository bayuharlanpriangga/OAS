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

## js/03-widgets.js (2733 baris, 155.1 KB)

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
| 820-889 | `upgradeSelectToOptPicker` | function |
| 893-920 | `upgradeAllPeriodPickers` | function |
| 923-1021 | `upgradeFormPickers` | function |
| 1024-1471 | `upgradePajakPickers` | function |
| 1498-1502 | `closePhotoViewer` | function |
| 1503 | `_pvKeyClose` | function |
| 1510-1544 | `openCropModal` | function |
| 1546-1579 | `_initCropLayout` | function |
| 1581-1592 | `_clampOffset` | function |
| 1594-1603 | `_renderCrop` | function |
| 1605-1621 | `onCropZoomSlider` | function |
| 1623-1731 | `_attachCropEvents` | function |
| 1733-1737 | `_pinchDist` | function |
| 1739-1771 | `confirmCrop` | function |
| 1773-1776 | `cancelCrop` | function |
| 1781-1801 | `_applyProfilePhoto` | function |
| 1803-1813 | `_applyCompanyLogo` | function |
| 2709-2732 | `updatePwaBtn` | function |

## js/04-navigasi-tema.js (709 baris, 32.8 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 3-6 | `toggleSidebar` | function |
| 7-10 | `closeSidebar` | function |
| 19-21 | `inIframe` | arrow |
| 65-163 | `showPage` | function |
| 165-167 | `handleAddBtn` | function |
| 170-180 | `switchTab` | function |
| 183-194 | `populateAkunSelect` | function |
| 197-200 | `safeHistoryPush` | function |
| 201-204 | `safeHistoryReplace` | function |
| 247-256 | `initTheme` | function |
| 258-286 | `applyTheme` | function |
| 299-308 | `syncPwaThemeChrome` | function |
| 310-314 | `toggleTheme` | function |
| 316-388 | `initTutDrag` | function |
| 390-402 | `tutMinimize` | function |
| 404-411 | `tutRestore` | function |
| 420-424 | `dismissAndOpenPenyesuaian` | function |
| 426-428 | `openJurnalPenyesuaian` | function |
| 430 | `openInlineTemplatePenyesuaian` | function |
| 431 | `toggleTemplatePenyesuaian` | function |
| 432 | `fillPenyesuaianInline` | function |
| 433 | `openModalPenyesuaian` | function |
| 438-471 | `renderArusKas` | function |
| 473-482 | `runSequential` | function |
| 484-492 | `exitTutorial` | function |
| 494-501 | `clearTutHighlight` | function |
| 503-594 | `renderTutStep` | function |
| 596-611 | `tutNext` | function |
| 613-615 | `tutSkipSection` | function |
| 617-639 | `positionTutTooltip` | function |
| 641-652 | `positionTutTooltipCenter` | function |
| 654-656 | `showTutComplete` | function |
| 659 | `startTutorial` | function |
| 678-703 | `openOptPicker` | function |

## js/05-akun.js (524 baris, 30.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 5-11 | `akunNamaTampil` | function |
| 28-34 | `guessAkunPersediaanDefault` | function |
| 36-45 | `openSimplePicker` | function |
| 48-55 | `tipeBadge` | function |
| 59-139 | `renderAkun` | function |
| 141-159 | `buildAkunRow` | function |
| 161-191 | `hapusAkun` | function |
| 198-202 | `_akunTrashSisaHari` | function |
| 205-210 | `purgeExpiredAkunTrash` | function |
| 212-216 | `openModalAkunTrash` | function |
| 218-247 | `renderAkunTrashList` | function |
| 249-264 | `restoreAkunTrash` | function |
| 266 | `openModalAkun` | function |
| 267 | `closeModal` | function |
| 272-283 | `openAkunPicker` | function |
| 285-292 | `closeAkunPicker` | function |
| 294-305 | `filterAkunPicker` | function |
| 307-337 | `renderAkunPickerList` | function |
| 339-348 | `selectAkunFromPicker` | function |
| 350-356 | `syncAkunTrigger` | function |
| 357-373 | `simpanAkun` | function |
| 380-399 | `openExportModal` | function |
| 401-520 | `getDefaultAkuns` | function |

## js/06-transaksi.js (1294 baris, 65.4 KB)

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

## js/08-kartu-stock.js (3399 baris, 162.7 KB)

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
| 2664-3380 | `_installAuditHooks` | function |

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

## js/11-kontak-invoice.js (364 baris, 27.8 KB)

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
| 152-156 | `makeDefaultPerms` | function |
| 158-168 | `renderInvoiceItems` | function |
| 170 | `tambahItemInvoice` | function |
| 173-176 | `_invPpnTarif` | function |
| 178-186 | `hitungTotalInvoice` | function |
| 188-238 | `simpanInvoice` | function |
| 240-257 | `renderInvoiceKPI` | function |
| 259-287 | `renderInvoiceList` | function |
| 289-303 | `openModalLunasInvoice` | function |
| 305-329 | `konfirmasiLunasInvoice` | function |
| 331-339 | `hapusInvoice` | function |
| 344-363 | `handleRekonCSV` | function |

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

## js/14-export.js (3201 baris, 184.2 KB)

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
| 217-234 | `_getActorRole` | function |
| 241-257 | `_patchHapusJurnalBtn` | function |
| 411-421 | `_pvLoadSaved` | function |
| 422-429 | `_pvSaveTheme` | function |
| 430-448 | `pvResetToDefault` | function |
| 449-460 | `_pvUpdateExportModalBadge` | function |
| 464 | `pvGetColor` | function |
| 465 | `pvGetC1` | function |
| 466 | `pvGetC2` | function |
| 467 | `pvGetC3` | function |
| 468 | `pvHex2rgb` | function |
| 469 | `pvRgb2hex` | function |
| 470 | `pvHsv2hex` | function |
| 471 | `pvHex2hsv` | function |
| 472 | `pvLuminance` | function |
| 473 | `pvContrast` | function |
| 474 | `pvLighten` | function |
| 475 | `pvRgbStr` | function |
| 477 | `closePdfPreview` | function |
| 478-484 | `pvTogglePanel` | function |
| 485 | `pvSelectTmpl` | function |
| 486-489 | `pvRenderPalList` | function |
| 490 | `pvOnPalHex` | function |
| 491-497 | `pvApply` | function |
| 499-523 | `pvBuildPages` | function |
| 525-636 | `pvStyles` | function |
| 638-693 | `pvWrap` | function |
| 695-809 | `pvMakeCover` | function |
| 811 | `pvSaldo` | function |
| 813-822 | `pvMakeDash` | function |
| 824-834 | `pvMakeJurnal` | function |
| 836-842 | `pvMakeLR` | function |
| 844-850 | `pvMakeNeraca` | function |
| 852-856 | `pvMakeSaldo` | function |
| 858-863 | `pvMakePajak` | function |
| 865-884 | `pvRenderPage` | function |
| 886-889 | `pvBuildThumbs` | function |
| 891 | `pvGoTo` | function |
| 899-907 | `pvCalcFitZoom` | function |
| 910-937 | `pvInitZoom` | function |
| 939-944 | `pvZoom` | function |
| 947-950 | `pvZoomReset` | function |
| 952-1022 | `pvApplyZoom` | function |
| 1023 | `pvNav` | function |
| 1036-1044 | `pvUpdateNav` | function |
| 1046-1152 | `pvExportNow` | function |
| 1155-1172 | `pvOpenCP` | function |
| 1173-1183 | `pvDrawSL` | function |
| 1184-1191 | `pvOnSL` | function |
| 1192 | `pvOnHue` | function |
| 1193 | `pvOnHexInput` | function |
| 1194 | `pvUpdateSwatch` | function |
| 1195-1203 | `pvUpdateContrast` | function |
| 1204 | `pvPickPreset` | function |
| 1205-1213 | `pvConfirmCP` | function |
| 1214 | `pvCloseCP` | function |
| 1215-1219 | `pvRenderRecent` | function |
| 1220 | `pvPickRecentColor` | function |
| 1224-1231 | `exportExcel` | function |
| 1233-1701 | `exportExcelData` | function |
| 1706-2318 | `exportExcelFormula` | function |
| 2320-2818 | `exportPDF` | function |
| 2821-2884 | `exportCSV` | function |
| 2889-2894 | `executeAIActions` | async function |
| 2896-3200 | `_executeAIActionsInner` | async function |

## js/15-storage.js (488 baris, 21.0 KB)

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
| 258-265 | `openStorageModal` | function |
| 268-275 | `toggleAutoSave` | function |
| 278-295 | `updateSaveIndicator` | function |
| 299-312 | `showAutoSaveToast` | function |
| 315-327 | `exportBackupJSON` | function |
| 329-362 | `importBackupJSON` | function |
| 366-368 | `resetPilihSemua` | function |
| 370-436 | `doResetAll` | async function |

## js/16-auth-company.js (1955 baris, 88.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 4-143 | `initSupabase` | async function |
| 147-181 | `enterGuestMode` | function |
| 183-202 | `updateGuestChip` | function |
| 204-220 | `showGuestBanner` | function |
| 226-347 | `showAuthModal` | function |
| 350-382 | `initAuthTabDrag` | function |
| 385-401 | `typeText` | function |
| 404-419 | `untypeText` | function |
| 421-423 | `_authDelay` | function |
| 431-516 | `playAuthIntro` | async function |
| 518-524 | `hideAuthModal` | function |
| 526-534 | `switchModalAuthTab` | function |
| 536-544 | `showModalAuthMsg` | function |
| 546-549 | `clearModalAuthMsg` | function |
| 551-558 | `setModalAuthLoading` | function |
| 560-569 | `doModalLogin` | async function |
| 571-586 | `doModalRegister` | async function |
| 588-594 | `doModalForgotPassword` | async function |
| 598-623 | `offerGuestDataMigration` | async function |
| 627-630 | `showAuthScreen` | function |
| 632-634 | `hideAuthScreen` | function |
| 636-642 | `switchAuthTab` | function |
| 644-651 | `showAuthMsg` | function |
| 653-656 | `clearAuthMsg` | function |
| 658-665 | `setAuthLoading` | function |
| 667-670 | `toggleAuthPw` | function |
| 672-682 | `doLogin` | async function |
| 684-699 | `doRegister` | async function |
| 701-736 | `doGoogleLogin` | async function |
| 739-772 | `showGoogleSetupGuide` | function |
| 774-780 | `doForgotPassword` | async function |
| 782-791 | `doLogout` | async function |
| 795-803 | `handleChipClick` | function |
| 807-895 | `afterLogin` | async function |
| 900-917 | `showCompanyPicker` | async function |
| 919-947 | `showCompanyPickerScreen` | function |
| 949-984 | `renderCompanyList` | function |
| 989-1055 | `attachCompanyCardHandlers` | function |
| 1060-1077 | `showCompanyActionSheet` | function |
| 1079-1082 | `closeCompanyActionSheet` | function |
| 1084-1089 | `cpActionOpen` | function |
| 1091-1096 | `cpActionDelete` | function |
| 1101-1108 | `showDeleteCompanyConfirm` | function |
| 1110-1120 | `closeDeleteCompanyConfirm` | function |
| 1122-1150 | `confirmDeleteCompany` | async function |
| 1152-1154 | `deleteCompany` | async function |
| 1156-1194 | `getMyCompanies` | async function |
| 1197-1208 | `blockNonNumeric` | function |
| 1209-1215 | `sanitizePaste` | function |
| 1217-1225 | `selectBizType` | function |
| 1227-1283 | `createCompany` | async function |
| 1285-1322 | `selectCompany` | async function |
| 1324-1363 | `updateUserChip` | function |
| 1371-1376 | `_loadCloudGagal` | function |
| 1378-1465 | `loadDataFromSupabase` | async function |
| 1478-1482 | `_jurnalMetaDari` | function |
| 1483-1485 | `_errKolomMeta` | function |
| 1487-1510 | `saveJurnalToSupabase` | async function |
| 1512-1530 | `updateJurnalInSupabase` | async function |
| 1532-1543 | `deleteJurnalFromSupabase` | async function |
| 1546-1556 | `saveAkunsToSupabase` | async function |
| 1559-1576 | `saveProfilToSupabase` | async function |
| 1579-1596 | `savePeriodeKunciToCloud` | async function |
| 1599-1622 | `saveKartuStockToCloud` | async function |
| 1624-1670 | `loadKartuStockFromData` | function |
| 1673-1677 | `saveAttachmentToSupabase` | async function |
| 1729-1753 | `addJurnal` | function |
| 1759-1767 | `postJurnalLegacy` | function |
| 1814-1843 | `handleAttachFile` | function |
| 1847-1875 | `diagnosSupabase` | async function |
| 1877-1954 | `showSupabaseSetup` | function |

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

## js/18-audit-permission.js (1216 baris, 64.3 KB)

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
| 275-312 | `loadOrgMembers` | async function |
| 314-317 | `isAdmin` | function |
| 320-322 | `isReadOnly` | function |
| 326-335 | `guardHanyaBaca` | function |
| 337-350 | `hasPerm` | function |
| 354-358 | `_setPermLocked` | function |
| 360-378 | `enforcePermissions` | function |
| 382-391 | `getOrCreateJoinCode` | async function |
| 393-408 | `showJoinCodeModal` | async function |
| 410-416 | `regenerateJoinCode` | async function |
| 418-425 | `copyJoinLink` | function |
| 428-445 | `checkJoinCodeInURL` | async function |
| 448-471 | `_processJoinCode` | async function |
| 474-478 | `openUserMgmtModal` | function |
| 480-540 | `renderUserMgmtList` | async function |
| 542-548 | `removeMember` | async function |
| 552-578 | `openInviteModal` | function |
| 580-602 | `kirimInvite` | async function |
| 605-632 | `openEditMember` | async function |
| 634-650 | `simpanEditMember` | async function |
| 655-691 | `renderPermTable` | function |
| 694-696 | `toggleAllPerm` | function |
| 699-703 | `syncPermAll` | function |
| 706-713 | `readPermTableValues` | function |
| 767-780 | `openJoinWithCodeModal` | function |
| 782-809 | `prosesJoinCode` | async function |
| 822-907 | `getKsSaldo` | function |
| 1106-1124 | `auditOpenKatPicker` | function |
| 1127-1142 | `auditOpenAktPicker` | function |
| 1145-1179 | `auditOpenBizPicker` | function |

## js/19-fitur-tambahan.js (1848 baris, 99.7 KB)

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
| 1355-1365 | `confirmResetAll` | function |
| 1370-1402 | `openModalSaldoAwal` | function |
| 1404-1419 | `updateSaldoAwalBalance` | function |
| 1421-1456 | `simpanSaldoAwal` | function |
| 1459-1462 | `autoNo` | function |
| 1464-1570 | `handlePwaInstall` | function |
| 1572-1589 | `showPwaGuideModal` | function |
| 1795-1843 | `showOrgMembersSQL` | function |

## js/20-ai-chat.js (2041 baris, 160.0 KB)

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

## js/21-settings.js (789 baris, 42.3 KB)

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
| 270-278 | `toggleAccountSwitcher` | function |
| 279-283 | `closeAccountSwitcher` | function |
| 284-288 | `_accSwitcherOutsideClick` | function |
| 290-317 | `renderAccountSwitcher` | function |
| 319-335 | `switchToAccount` | async function |
| 337-342 | `addAccountFlow` | async function |
| 344-347 | `removeAccountFromSwitcher` | function |
| 366-371 | `openAccountSettings` | async function |
| 373-398 | `accsLoadUserInfo` | async function |
| 400-421 | `handleProfilePhotoUpload` | function |
| 423-532 | `accsLoadProviders` | async function |
| 534-547 | `accsLinkProvider` | async function |
| 549-563 | `accsUnlinkProvider` | async function |
| 565-593 | `accsUpdateProfile` | async function |
| 599-607 | `accsHasEmailLogin` | function |
| 611-617 | `accsUpdatePasswordButtonLabel` | function |
| 619-640 | `openAccsPasswordModal` | function |
| 642-696 | `accsUpdatePassword` | async function |
| 701-710 | `accsForgotPassword` | async function |
| 712-716 | `accsLogoutAll` | async function |
| 718-722 | `accsShowMsg` | function |
| 724 | `toggleAccsPw` | function |
| 727 | `_pwCacheKey` | function |
| 729-731 | `cachePasswordLocally` | function |
| 733-749 | `loadCachedPasswordDisplay` | function |
| 751-763 | `copyCurrentPassword` | function |

## js/22-cloud-records.js (458 baris, 23.4 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 24 | `_cloudKursDefault` | function |
| 25-30 | `_cloudKursFromList` | function |
| 32-34 | `_cloudKursLegacy` | function |
| 72 | `_cloudReadOnly` | function |
| 74 | `_cloudCacheKey` | function |
| 76-78 | `_cloudCacheLocal` | function |
| 80-85 | `_cloudReadCache` | function |
| 87 | `_cloudSeenKey` | function |
| 90-93 | `_cloudPendingOnce` | function |
| 96-99 | `_cloudLegacyAllowed` | function |
| 102-113 | `_cloudIndex` | function |
| 123-127 | `_cloudHash` | function |
| 128 | `_cloudSnapHashKey` | function |
| 129-132 | `_cloudSnapHashRead` | function |
| 133-140 | `_cloudSnapHashSave` | function |
| 142-154 | `_cloudUnsynced` | function |
| 156-164 | `_cloudApplyUnsynced` | function |
| 168-173 | `_cloudWithTimeout` | function |
| 177-184 | `_cloudAfterSync` | function |
| 187-196 | `_cloudSortNewestFirst` | function |
| 198-201 | `cloudResetRecordsState` | function |
| 210-241 | `cloudDeleteRecords` | function |
| 243-246 | `_cloudLoadFromCache` | function |
| 248-316 | `cloudLoadRecords` | async function |
| 322-397 | `cloudOfferLocalMigration` | async function |
| 400-411 | `cloudSyncRecords` | function |
| 413-457 | `_cloudSyncNow` | async function |

## js/23-penomoran.js (247 baris, 10.9 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 23-26 | `parseNomor` | function |
| 35-53 | `nomorBerikut` | function |
| 58-69 | `counterSetelahPakai` | function |
| 74-80 | `counterTanpaJenis` | function |
| 85-152 | `selesaikanBentrokNomorInvoice` | function |
| 158-161 | `counterList` | arrow |
| 164-167 | `nomorInvoiceBerikut` | function |
| 171-181 | `catatNomorInvoice` | function |
| 185-195 | `resetCounterJenis` | function |
| 198-246 | `periksaDanSelesaikanBentrokInvoice` | async function |

## js/24-aging.js (74 baris, 3.6 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 20-28 | `_agingHari` | function |
| 31-37 | `bucketAging` | function |
| 39 | `_agingKosong` | function |
| 48-73 | `hitungAging` | function |

## js/25-aging-ui.js (173 baris, 12.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 12-16 | `agingHariIni` | function |
| 27-77 | `agingPiutangHtml` | function |
| 80-87 | `toggleAgingDetail` | function |
| 90-96 | `_agingHasilSaatIni` | function |
| 98-103 | `renderAgingPiutang` | function |
| 108-112 | `_agingSel` | function |
| 115-126 | `agingCsv` | function |
| 128 | `_agingTgl` | function |
| 131-150 | `agingCetakHtml` | function |
| 152-161 | `exportAgingPiutangCSV` | function |
| 163-172 | `cetakAgingPiutang` | function |

## js/26-daftar-bisnis.js (111 baris, 5.3 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 7-9 | `labelPeranBisnis` | function |
| 12-15 | `adalahPemilikBisnis` | function |
| 32-34 | `modulUntukHalaman` | function |
| 38-40 | `peranBolehMenulis` | function |
| 46-50 | `peranAktifBisnis` | function |
| 53-56 | `bisnisHanyaBaca` | function |
| 66-85 | `susunDaftarBisnis` | function |
| 92-110 | `ringkasHasilGabung` | function |

## js/27-oauth-url.js (24 baris, 1.1 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 12-23 | `bacaParamOAuth` | function |

## js/28-bill.js (125 baris, 6.4 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 12-15 | `billList` | arrow |
| 24-29 | `hitungTotalBill` | function |
| 33-37 | `nomorBillBerikut` | function |
| 48-95 | `susunBill` | function |
| 99-108 | `simpanBillState` | function |
| 111-115 | `tambahBill` | function |
| 118-124 | `hapusBillById` | function |

## js/29-bill-ui.js (163 baris, 9.2 KB)

| Baris | Nama | Jenis |
| --- | --- | --- |
| 12 | `_billAkunBeli` | function |
| 14-17 | `_billPpnTarif` | function |
| 19-25 | `hitungTotalBillForm` | function |
| 28-31 | `_billAkunBtnHtml` | function |
| 35-40 | `_billSinkronAkun` | function |
| 44-60 | `renderBillItems` | function |
| 62-67 | `tambahItemBill` | function |
| 69-73 | `hapusItemBill` | function |
| 75-101 | `openModalBill` | function |
| 104-113 | `_billBacaForm` | function |
| 115-124 | `simpanBill` | function |
| 126-153 | `renderBillList` | function |
| 155-162 | `hapusBill` | function |

## js/99-init.js (15 baris, 0.6 KB)

_tidak ada deklarasi top-level_
