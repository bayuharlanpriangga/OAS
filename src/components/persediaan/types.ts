import type { Dispatch, SetStateAction } from "react";
import type { KsCard, KsEntry, KsMetode } from "@/lib";

export interface KsEditModalState {
  open: boolean;
  mode: "add-card" | "edit-card" | "add-kat" | "edit-kat";
  cardId: string;
  katId: string;
  nama: string;
  satuan: string;
}

export interface KsEditModalProps {
  state: KsEditModalState;
  setState: Dispatch<SetStateAction<KsEditModalState>>;
  onSave: () => void;
}

export interface KsKelolaModalProps {
  open: boolean;
  onClose: () => void;
  cards: KsCard[];
  onAddCard: () => void;
  onEditCard: (card: KsCard) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleLock: (cardId: string) => void;
  onAddKat: (cardId: string) => void;
  onEditKat: (cardId: string, katId: string) => void;
  onDeleteKat: (cardId: string, katId: string) => void;
}

export interface KsPilihModalProps {
  open: boolean;
  onClose: () => void;
  cards: KsCard[];
  tujuanMetode: KsMetode;
  selectedKatId: string;
  setSelectedKatId: (id: string) => void;
  onConfirm: () => void;
}

export interface KsKonversiModalProps {
  open: boolean;
  onClose: () => void;
  katData: Record<KsMetode, KsEntry[]> | null;
  onExecute: (
    dari: KsMetode,
    ke: KsMetode,
    mode: "gabung" | "timpa",
    hapusSumber: boolean
  ) => void;
}

export interface KsJurnalModalProps {
  open: boolean;
  onClose: () => void;
  metode: KsMetode;
  entries: Array<{ idx: number; entry: KsEntry }>;
  selectedIdxs: number[];
  setSelectedIdxs: Dispatch<SetStateAction<number[]>>;
  onConfirm: () => void;
}
