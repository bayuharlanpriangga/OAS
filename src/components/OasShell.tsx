import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OasWorkspace from "./OasWorkspace";
import CoaPage from "./coa/CoaPage";
import ProdukPage from "./produk/ProdukPage";
import AsetTetapPage from "./aset/AsetTetapPage";
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
          <CoaPage />
          <ProdukPage />
          <AsetTetapPage />
          <KalkPenyusutanPage />
          <KalkPersediaanPage />
          <KalkBungaPage />
          <KalkRasioPage />
          <KalkBepPage />
        </div>
      </main>
      <div
        id="oas-overlays-root"
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: overlaysHtml }}
      />
      <OasWorkspace />
    </>
  );
}
