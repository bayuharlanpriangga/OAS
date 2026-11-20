import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OasWorkspace from "./OasWorkspace";
import DashboardPage from "./dashboard/DashboardPage";
import AnalitikPage from "./analitik/AnalitikPage";
import AuditTrailPage from "./admin/AuditTrailPage";
import TutorialPage from "./admin/TutorialPage";
import CoaPage from "./coa/CoaPage";
import ProdukPage from "./produk/ProdukPage";
import AsetTetapPage from "./aset/AsetTetapPage";
import ExportModal from "./export/ExportModal";
import KontakPage from "./kontak/KontakPage";
import InvoicePage from "./piutang/InvoicePage";
import BillPage from "./hutang/BillPage";
import { UmurHutangPage, UmurPiutangPage } from "./aging/AgingPages";
import { KartuHutangPage, KartuPiutangPage } from "./kartu/KartuKontakPages";
import { PenawaranPage, PesananJualPage } from "./penjualan/DokPenjualanPages";
import TransaksiPage from "./transaksi/TransaksiPage";
import {
  BukuBesarPage,
  JurnalKasPage,
  JurnalPembelianPage,
  JurnalPenjualanPage,
  JurnalUmumPage,
} from "./jurnal/JurnalPages";
import {
  ArusKasPage,
  LabaRugiPage,
  NeracaPage,
  NeracaSaldoPage,
  PerubahanEkuitasPage,
} from "./laporan/LaporanPages";
import {
  KalkBepPage,
  KalkBungaPage,
  KalkPenyusutanPage,
  KalkPersediaanPage,
  KalkRasioPage,
} from "./calculators";

interface OasShellProps {
  pagesHtml: string;
  overlaysHtml: string;
}

export default function OasShell({ pagesHtml, overlaysHtml }: OasShellProps) {
  return (
    <>
      <Sidebar />
      <main className="main">
        <Topbar />
        <div className="content" id="oas-content-root">
          <div
            id="oas-legacy-pages-root"
            style={{ display: "contents" }}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: pagesHtml }}
          />
          <DashboardPage />
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
          <ProdukPage />
          <AsetTetapPage />
          <KontakPage />
          <InvoicePage />
          <BillPage />
          <UmurPiutangPage />
          <UmurHutangPage />
          <KartuPiutangPage />
          <KartuHutangPage />
          <PenawaranPage />
          <PesananJualPage />
          <KalkPenyusutanPage />
          <KalkPersediaanPage />
          <KalkBungaPage />
          <KalkRasioPage />
          <KalkBepPage />
          <AuditTrailPage />
          <TutorialPage />
        </div>
      </main>
      <div
        id="oas-overlays-root"
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: overlaysHtml }}
      />
      <ExportModal />
      <OasWorkspace />
    </>
  );
}
