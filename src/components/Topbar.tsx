"use client";

import { motion } from "motion/react";
import { Menu, Search } from "lucide-react";
import { callOasGlobal } from "@/lib/shared/legacy-store";

export default function Topbar() {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <motion.button
          type="button"
          className="hamburger"
          aria-label="Buka menu"
          whileTap={{ scale: 0.92 }}
          onClick={() => callOasGlobal("toggleSidebar")}
        >
          <Menu size={20} strokeWidth={2} />
        </motion.button>
        <motion.div
          className="topbar-titles"
          initial={{ opacity: 0.92 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          <h1 id="page-title" suppressHydrationWarning>
            Dashboard
          </h1>
          <p id="page-sub" suppressHydrationWarning>
            Ringkasan keuangan bisnis Anda
          </p>
        </motion.div>
      </div>

      <div className="topbar-right">
        <span id="current-date" suppressHydrationWarning />
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => callOasGlobal("openGlobalSearch")}
          className="topbar-search-btn"
          data-tooltip="Ctrl+K"
        >
          <Search
            size={14}
            strokeWidth={2}
            style={{ flexShrink: 0, opacity: 0.7 }}
          />
          <span className="topbar-search-label">Cari</span>
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          className="btn btn-primary"
          onClick={() => callOasGlobal("handleAddBtn")}
          data-tooltip="Ctrl+N"
        >
          + Tambah
        </motion.button>
      </div>
    </div>
  );
}
