import type { DokRecord } from "@/types";
import { counterSetelahPakai } from "../penomoran/update-counter";
import { readCounterList } from "./baca-counter";
import { readDokList } from "./baca-dokumen";
import { simpanDokState } from "./simpan-dokumen";
import { writeCounterList } from "./tulis-counter";
import { writeDokList } from "./tulis-dokumen";

export function tambahDokState(dok: DokRecord): Promise<boolean> {
  const next = [dok, ...readDokList()];
  writeDokList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), dok.no);
  writeCounterList(nextCounter);
  return simpanDokState();
}
