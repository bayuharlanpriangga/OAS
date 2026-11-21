import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OasWorkspace from "./OasWorkspace";
import { DashboardPage, TransaksiPage } from "./utama";
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
import {
  AsetTetapPage,
  CoaPage,
  KontakPage,
  ProdukPage,
} from "./master";
import {
  KalkBepPage,
  KalkBungaPage,
  KalkPenyusutanPage,
  KalkPersediaanPage,
  KalkRasioPage,
} from "./kalkulator";
import {
  BillPage,
  InvoicePage,
  KartuHutangPage,
  KartuPiutangPage,
  PenawaranPage,
  PesananJualPage,
  UmurHutangPage,
  UmurPiutangPage,
} from "./fitur-baru";
import {
  AiAssistantPage,
  AuditTrailPage,
  ExportModal,
  TutorialPage,
} from "./lainnya";

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
