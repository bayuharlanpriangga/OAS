export interface DokLegacyWin {
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, aksi?: string) => boolean;
  isReadOnly?: () => boolean;
  showPage?: (page: string) => void;
  renderInvoiceList?: () => void;
  renderInvoiceKPI?: () => void;
  renderPesananList?: () => void;
  renderPenawaranList?: () => void;
  catatNomorInvoice?: (no: string) => boolean;
}

export const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "Draft", bg: "var(--surface2)", color: "var(--muted)" },
  terkirim: { label: "Terkirim", bg: "var(--accent2-tint)", color: "var(--accent2)" },
  disetujui: { label: "Disetujui", bg: "var(--green-tint)", color: "var(--green)" },
  dikonfirmasi: { label: "Dikonfirmasi", bg: "var(--accent2-tint)", color: "var(--accent2)" },
  sebagian: { label: "Sebagian", bg: "rgba(217,119,43,0.12)", color: "var(--accent3)" },
  selesai: { label: "Selesai", bg: "var(--green-tint)", color: "var(--green)" },
  ditolak: { label: "Ditolak", bg: "var(--red-tint)", color: "var(--danger)" },
  batal: { label: "Batal", bg: "var(--red-tint)", color: "var(--danger)" },
};
