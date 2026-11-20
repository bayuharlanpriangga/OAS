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
  draft: { label: "Draft", bg: "rgba(148,163,184,0.15)", color: "var(--muted)" },
  terkirim: { label: "Terkirim", bg: "rgba(34,211,238,0.15)", color: "var(--accent2)" },
  disetujui: { label: "Disetujui", bg: "rgba(74,222,128,0.15)", color: "var(--accent)" },
  dikonfirmasi: { label: "Dikonfirmasi", bg: "rgba(34,211,238,0.15)", color: "var(--accent2)" },
  sebagian: { label: "Sebagian", bg: "rgba(251,191,36,0.15)", color: "var(--accent3)" },
  selesai: { label: "Selesai", bg: "rgba(74,222,128,0.15)", color: "var(--accent)" },
  ditolak: { label: "Ditolak", bg: "rgba(248,113,113,0.15)", color: "var(--danger)" },
  batal: { label: "Batal", bg: "rgba(248,113,113,0.15)", color: "var(--danger)" },
};
