"use client";

import { AlertTriangle } from "lucide-react";
import type { Akun, AkunTrashItem } from "@/types";

export interface AkunNamaLabelProps {
  kode: string;
  akuns: readonly Akun[];
  akunsTrash: readonly AkunTrashItem[];
}

export function AkunNamaLabel({ kode, akuns, akunsTrash }: AkunNamaLabelProps) {
  const found = akuns.find((a) => a.kode === kode);
  if (found) return <>{found.nama}</>;
  const inTrash = akunsTrash.some((a) => a.kode === kode);
  const label = inTrash
    ? `Akun tidak ditemukan (${kode} · di Sampah COA)`
    : `Akun tidak ditemukan (${kode})`;
  return (
    <span
      style={{
        color: "var(--red)",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
      title={label}
    >
      <AlertTriangle size={12} /> {label}
    </span>
  );
}
