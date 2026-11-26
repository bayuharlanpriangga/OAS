"use client";

import { Menu, Plus, Search } from "lucide-react";
import { callOasGlobal } from "@/lib/shared/legacy-store";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="hamburger"
          aria-label="Buka menu navigasi"
          onClick={() => callOasGlobal("toggleSidebar")}
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <div className="topbar-titles">
          <h1 id="page-title" suppressHydrationWarning>
            Dashboard
          </h1>
          <p id="page-sub" suppressHydrationWarning>
            Ringkasan keuangan bisnis
          </p>
        </div>
      </div>

      <div className="topbar-right">
        <span id="current-date" suppressHydrationWarning />
        <button
          type="button"
          onClick={() => callOasGlobal("openGlobalSearch")}
          className="topbar-search-btn"
          data-tooltip="Ctrl+K"
          aria-label="Cari transaksi, akun, atau halaman"
        >
          <Search size={15} strokeWidth={2} style={{ flexShrink: 0, color: "var(--accent2)" }} />
          <span className="topbar-search-label">Cari</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => callOasGlobal("handleAddBtn")}
          data-tooltip="Ctrl+N"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          <span className="btn-label">Catat transaksi</span>
        </button>
      </div>
    </header>
  );
}
