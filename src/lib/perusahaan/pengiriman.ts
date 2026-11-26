import { readCurrentCompany } from "@/lib/shared/legacy-store";

export interface PengirimanRecord {
  id: string;
  nama: string;
  telp: string;
  jalan: string;
  kota: string;
  kodePos: string;
  provinsi: string;
  createdAt: string;
}

function pengirimanKey(): string {
  const cid = readCurrentCompany()?.id || "guest";
  return `oas_pengiriman_${cid}`;
}

export function readPengirimanList(): PengirimanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(pengirimanKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PengirimanRecord[]) : [];
  } catch {
    return [];
  }
}

export function writePengirimanList(list: PengirimanRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(pengirimanKey(), JSON.stringify(list));
  } catch {}
}

export function formatAlamatPengiriman(p: PengirimanRecord): string {
  const parts = [p.jalan, p.kota, p.provinsi, p.kodePos]
    .map((x) => (x || "").trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export function savePengirimanItem(input: {
  id?: string;
  nama: string;
  telp: string;
  jalan: string;
  kota: string;
  kodePos: string;
  provinsi: string;
}): { ok: true; record: PengirimanRecord } | { ok: false; pesan: string } {
  const nama = input.nama.trim();
  if (!nama) {
    return { ok: false, pesan: "Nama jasa pengiriman wajib diisi." };
  }
  const list = readPengirimanList();
  if (input.id) {
    const idx = list.findIndex((x) => x.id === input.id);
    if (idx < 0) return { ok: false, pesan: "Data pengiriman tidak ditemukan." };
    const updated: PengirimanRecord = {
      ...list[idx],
      nama,
      telp: input.telp.trim(),
      jalan: input.jalan.trim(),
      kota: input.kota.trim(),
      kodePos: input.kodePos.trim(),
      provinsi: input.provinsi.trim(),
    };
    list[idx] = updated;
    writePengirimanList(list);
    return { ok: true, record: updated };
  }

  const created: PengirimanRecord = {
    id: "ship_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    nama,
    telp: input.telp.trim(),
    jalan: input.jalan.trim(),
    kota: input.kota.trim(),
    kodePos: input.kodePos.trim(),
    provinsi: input.provinsi.trim(),
    createdAt: new Date().toISOString(),
  };
  writePengirimanList([created, ...list]);
  return { ok: true, record: created };
}

export function deletePengirimanItem(id: string): void {
  const list = readPengirimanList().filter((x) => x.id !== id);
  writePengirimanList(list);
}
