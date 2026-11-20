import { escapeHtml } from "../format/escapeHtml";
import { callOasGlobal } from "../legacy-store/callOasGlobal";
import { kalkulatorState } from "./state";
import { undoLastKalkInput } from "./undoLastKalkInput";

export function showKalkUndoBar(label: string, kode: string): void {
  if (typeof document === "undefined") return;
  if (!kalkulatorState.slideStyleInjected) {
    kalkulatorState.slideStyleInjected = true;
    const style = document.createElement("style");
    style.textContent =
      "@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }";
    document.head.appendChild(style);
  }
  document.querySelectorAll(".kalk-undo-bar").forEach((b) => b.remove());

  const bar = document.createElement("div");
  bar.className = "kalk-undo-bar";
  bar.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--surface);border:1px solid var(--accent);border-radius:10px;
    padding:10px 16px;display:flex;align-items:center;gap:12px;
    z-index:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:13px;
    animation:slideUp 0.3s ease;max-width:90vw;
  `;
  bar.innerHTML = `
    <span style="color:var(--accent)"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></span>
    <span style="color:var(--text);flex:1">${escapeHtml(label)} <span style="color:var(--muted);font-size:11px;font-family:var(--mono);">[${escapeHtml(kode)}]</span></span>
    <button type="button" data-action="undo" style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--red);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;">↩ Undo</button>
    <button type="button" data-action="view" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--accent);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;"><i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Lihat</button>
    <button type="button" data-action="close" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;">✕</button>
  `;
  bar.querySelector('[data-action="undo"]')?.addEventListener("click", () => {
    undoLastKalkInput();
    bar.remove();
  });
  bar.querySelector('[data-action="view"]')?.addEventListener("click", () => {
    callOasGlobal("showPage", "jurnal-umum");
    bar.remove();
  });
  bar.querySelector('[data-action="close"]')?.addEventListener("click", () => {
    bar.remove();
  });
  document.body.appendChild(bar);
  window.setTimeout(() => {
    if (bar.parentNode) bar.remove();
  }, 12000);
}
