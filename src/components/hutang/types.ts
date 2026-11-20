import type { Dispatch, SetStateAction } from "react";
import type { Bill, JurnalEntry, Pembayaran } from "@/types";

export interface BillFormState {
  id: string;
  createdAt: string;
  noBill: string;
  supplier: string;
  tanggal: string;
  jatuhTempo: string;
  deskripsi: string;
  items: Array<{ nama: string; qty: number; harga: number; akun: string }>;
  ppnAktif: boolean;
  ppnTarif: number;
  akunUtang: string;
}

export interface BillBayarFormState {
  billId: string;
  mode: "bayar" | "riwayat";
  tanggal: string;
  jumlah: string;
  akunKas: string;
  metode: string;
  catatan: string;
}

export interface BillFormModalProps {
  open: boolean;
  onClose: () => void;
  form: BillFormState;
  setForm: Dispatch<SetStateAction<BillFormState>>;
  totals: { subtotal: number; ppn: number; total: number };
  supplierSuggestions: string[];
  labelAkun: (kode: string) => string;
  onPickItemAkun: (idx: number) => void;
  onPickUtangAkun: () => void;
  onSave: (status: "draft" | "diterima") => void;
}

export interface BillBayarModalProps {
  open: boolean;
  onClose: () => void;
  bill: Bill | null;
  form: BillBayarFormState;
  setForm: Dispatch<SetStateAction<BillBayarFormState>>;
  pembayarans: readonly Pembayaran[];
  history: readonly Pembayaran[];
  jurnals: readonly JurnalEntry[];
  labelAkun: (kode: string) => string;
  readOnly: boolean;
  onPickKas: () => void;
  onSaveBayar: () => void;
  onDeleteBayar: (payId: string) => void;
}
