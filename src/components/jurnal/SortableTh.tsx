"use client";

import {
  getSortIndicator,
  type UrutJurnalState,
  type UrutKolom,
} from "@/lib/urut-jurnal";

export interface SortableThProps {
  id: string;
  label: string;
  title: string;
  state: UrutJurnalState;
  kolom: UrutKolom;
  onToggle: (kolom: UrutKolom) => void;
}

export function SortableTh({
  id,
  label,
  title,
  state,
  kolom,
  onToggle,
}: SortableThProps) {
  const { arrow, active, ariaSort } = getSortIndicator(state, kolom);
  return (
    <th
      id={id}
      className={`th-sort${active ? " sort-aktif" : ""}`}
      aria-sort={ariaSort}
      title={title}
      onClick={() => onToggle(kolom)}
      style={{ cursor: "pointer" }}
    >
      {label} <span className="sort-ind">{arrow}</span>
    </th>
  );
}
