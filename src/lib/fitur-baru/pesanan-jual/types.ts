import type { Invoice } from "@/types";

export interface AksiDokStatus {
  ke: string;
  label: string;
  utama?: boolean;
  bahaya?: boolean;
}

export interface PesananInvoiceRecord extends Invoice {
  refJenis?: string;
  refId?: string;
  refNo?: string;
}
