"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import OasModalDialog from "./OasModalDialog";
import type { Akun, AkunTipe } from "@/types";

interface AkunPickerModalProps {
  open: boolean;
  onClose: () => void;
  akuns: readonly Akun[];
  selectedKode?: string;
  filterFn?: (akun: Akun) => boolean;
  title?: string;
  onSelect: (akun: Akun) => void;
}

const TIPE_COLOR_CLASS: Record<string, string> = {
  Aset: "aset",
  Liabilitas: "liabilitas",
  Ekuitas: "ekuitas",
  Pendapatan: "pendapatan",
  Beban: "beban",
  HPP: "beban",
};

export default function AkunPickerModal({
  open,
  onClose,
  akuns,
  selectedKode = "",
  filterFn,
  title = "Pilih Akun",
  onSelect,
}: AkunPickerModalProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filterFn ? akuns.filter(filterFn) : akuns;
    const filtered = base.filter(
      (a) =>
        !q ||
        a.kode.toLowerCase().includes(q) ||
        a.nama.toLowerCase().includes(q) ||
        a.tipe.toLowerCase().includes(q)
    );
    const map = new Map<AkunTipe, Akun[]>();
    filtered.forEach((a) => {
      const list = map.get(a.tipe) || [];
      list.push(a);
      map.set(a.tipe, list);
    });
    return Array.from(map.entries());
  }, [akuns, filterFn, query]);

  return (
    <OasModalDialog
      open={open}
      onClose={onClose}
      maxWidth="500px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <ClipboardList size={15} /> {title}
        </span>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0 10px",
          marginBottom: "12px",
        }}
      >
        <Search size={15} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Cari kode atau nama akun..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          autoFocus
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text)",
            fontSize: "13px",
            height: "36px",
          }}
        />
      </div>

      <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
        {grouped.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 16px",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            Akun tidak ditemukan
            <br />
            <small>Coba kata kunci lain</small>
          </div>
        ) : (
          grouped.map(([tipe, items]) => (
            <div key={tipe}>
              <div className="akun-picker-group-label">{tipe}</div>
              {items.map((a) => {
                const isSelected = a.kode === selectedKode;
                return (
                  <button
                    key={a.kode}
                    type="button"
                    className={`akun-picker-item${isSelected ? " selected" : ""}`}
                    onClick={() => {
                      onSelect(a);
                      onClose();
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: isSelected
                        ? "rgba(74,222,128,0.1)"
                        : "transparent",
                      border: "none",
                    }}
                  >
                    <span className="akun-picker-kode">{a.kode}</span>
                    <span className="akun-picker-nama">{a.nama}</span>
                    <span
                      className={`akun-picker-tipe ${TIPE_COLOR_CLASS[a.tipe] || "beban"}`}
                    >
                      {tipe}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </OasModalDialog>
  );
}
