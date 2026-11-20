import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import OasWorkspace from "./OasWorkspace";

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
        <div
          className="content"
          id="oas-content-root"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: pagesHtml }}
        />
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
