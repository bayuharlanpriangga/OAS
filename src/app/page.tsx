import fs from "node:fs";
import path from "node:path";
import OasShell from "@/components/OasShell";

export const dynamic = "force-static";

export default function HomePage() {
  const templatesDir = path.join(process.cwd(), "src", "templates");
  const pagesHtml = fs.readFileSync(
    path.join(templatesDir, "oas-pages.html"),
    "utf8"
  );
  const overlaysHtml = fs.readFileSync(
    path.join(templatesDir, "oas-overlays.html"),
    "utf8"
  );

  return <OasShell pagesHtml={pagesHtml} overlaysHtml={overlaysHtml} />;
}
