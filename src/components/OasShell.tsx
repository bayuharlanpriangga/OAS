import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OasWorkspace from "./OasWorkspace";
import { DashboardPage, TransaksiPage } from "./utama";
import PembelianPage from "./pembelian/PembelianPage";
import PesananPembelianPage from "./pembelian/PesananPembelianPage";
import PenjualanPage from "./penjualan/PenjualanPage";
import PengirimanPage from "./perusahaan/PengirimanPage";
import {
  JurnalKasPage,
  JurnalPembelianPage,
  JurnalPenjualanPage,
  JurnalUmumPage,
} from "./jurnal";
import {
  AnalitikPage,
  ArusKasPage,
  BukuBesarPage,
  LabaRugiPage,
  NeracaPage,
  NeracaSaldoPage,
  PerubahanEkuitasPage,
} from "./laporan";
import { AsetTetapPage, CoaPage, KontakPage } from "./master";
import {
  KalkBepPage,
  KalkBungaPage,
  KalkPenyusutanPage,
  KalkPersediaanPage,
  KalkRasioPage,
} from "./kalkulator";
import {
  AnggaranPage,
  InvoicePage,
  JurnalBerulangPage,
  OperationalModals,
  PajakPage,
  PesananJualPage,
  RekonsiliasiPage,
} from "./fitur-baru";
import {
  AiAssistantPage,
  AuditTrailPage,
  ExportModal,
  SettingsPage,
  TutorialPage,
} from "./lainnya";
import {
  AuthCompanyModals,
  ProfilOnboardingModals,
  StorageModals,
  TeamModals,
} from "./cloud";
import { ShellOverlays } from "./core";

export default function OasShell() {
  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="content" id="oas-content-root">
          <DashboardPage />
          <PembelianPage />
          <PesananPembelianPage />
          <PenjualanPage />
          <PengirimanPage />
          <AiAssistantPage />
          <AnalitikPage />
          <TransaksiPage />
          <JurnalUmumPage />
          <JurnalKasPage />
          <JurnalPenjualanPage />
          <JurnalPembelianPage />
          <BukuBesarPage />
          <NeracaSaldoPage />
          <LabaRugiPage />
          <NeracaPage />
          <ArusKasPage />
          <PerubahanEkuitasPage />
          <CoaPage />
          <AsetTetapPage />
          <KontakPage />
          <InvoicePage />
          <PesananJualPage />
          <JurnalBerulangPage />
          <RekonsiliasiPage />
          <AnggaranPage />
          <PajakPage />
          <KalkPenyusutanPage />
          <KalkPersediaanPage />
          <KalkBungaPage />
          <KalkRasioPage />
          <KalkBepPage />
          <AuditTrailPage />
          <TutorialPage />
          <SettingsPage />
        </div>
      </main>
      <ShellOverlays />
      <ExportModal />
      <OperationalModals />
      <StorageModals />
      <ProfilOnboardingModals />
      <TeamModals />
      <AuthCompanyModals />
      <OasWorkspace />
    </>
  );
}
