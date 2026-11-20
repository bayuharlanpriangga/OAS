import type { DokRecord } from "@/types";
import { counterSetelahPakai } from "../penomoran/counterSetelahPakai";
import { readCounterList } from "./readCounterList";
import { readDokList } from "./readDokList";
import { simpanDokState } from "./simpanDokState";
import { writeCounterList } from "./writeCounterList";
import { writeDokList } from "./writeDokList";

export function tambahDokState(dok: DokRecord): Promise<boolean> {
  const next = [dok, ...readDokList()];
  writeDokList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), dok.no);
  writeCounterList(nextCounter);
  return simpanDokState();
}
