import { escapeHtml } from "../../shared/format/escape-html";

export function printReportHtml(
  title: string,
  subtitle: string,
  htmlContent: string
): void {
  if (typeof window === "undefined") return;
  let namaPerusahaan = "Perusahaan";
  try {
    const raw =
      window.localStorage.getItem("oas_profil") ||
      window.localStorage.getItem("oas_profil_v1") ||
      "{}";
    const parsed = JSON.parse(raw) as { nama?: string };
    if (parsed.nama) namaPerusahaan = parsed.nama;
  } catch {}

  const frame = window.document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  frame.setAttribute("aria-hidden", "true");
  window.document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td,th{padding:7px 10px;}th{background:#f5f5f5;font-weight:600;}.total-row td{font-weight:700;border-top:2px solid #333;}</style></head><body><h2 style="text-align:center">${escapeHtml(namaPerusahaan)}</h2><p style="text-align:center;color:#666;font-size:11px;">${escapeHtml(subtitle)}</p>${htmlContent}</body></html>`
  );
  doc.close();
  window.setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 1200);
    }
  }, 350);
}
