export interface KreditTanpaBillRecord {
  id: string;
  noBill: string;
  supplier: string;
  tanggal: string;
  jatuhTempo: string;
  total: number;
  sisaTagihan: number;
  status: "diterima";
  jurnalNo: string;
}
