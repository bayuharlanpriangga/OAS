import {
  MAX_AI_MESSAGES,
  MAX_CONTEXT_CHARS,
  MAX_MESSAGE_CHARS,
  MAX_TOTAL_CHARS,
} from "./constants";
import { formatAppContextText } from "./format-konteks";
import { isPlainObject } from "./cek-objek";
import type { AiChatMessage, ValidatedAiChatRequest } from "./types";

export function validateAiChatRequest(
  raw: unknown
): { ok: true; data: ValidatedAiChatRequest } | { ok: false; error: string } {
  if (!isPlainObject(raw)) {
    return { ok: false, error: "Payload harus berupa objek JSON." };
  }

  const rawMessages = raw.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, error: "Daftar pesan (messages) wajib diisi." };
  }

  const trimmedSlice = rawMessages.slice(-MAX_AI_MESSAGES);
  const messages: AiChatMessage[] = [];
  let totalChars = 0;

  for (let i = 0; i < trimmedSlice.length; i++) {
    const item = trimmedSlice[i];
    if (!isPlainObject(item)) {
      return { ok: false, error: `Pesan ke-${i + 1} tidak valid.` };
    }
    const role = item.role;
    if (role !== "user" && role !== "assistant") {
      return {
        ok: false,
        error: `Role pesan ke-${i + 1} harus "user" atau "assistant".`,
      };
    }
    if (typeof item.content !== "string") {
      return {
        ok: false,
        error: `Konten pesan ke-${i + 1} harus berupa teks.`,
      };
    }
    const content = item.content.trim();
    if (!content) {
      return {
        ok: false,
        error: `Konten pesan ke-${i + 1} tidak boleh kosong.`,
      };
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return {
        ok: false,
        error: `Pesan ke-${i + 1} melebihi batas ${MAX_MESSAGE_CHARS} karakter.`,
      };
    }
    totalChars += content.length;
    if (totalChars > MAX_TOTAL_CHARS) {
      return {
        ok: false,
        error: `Total panjang percakapan melebihi batas ${MAX_TOTAL_CHARS} karakter.`,
      };
    }
    messages.push({ role, content });
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, error: "Pesan terakhir harus berasal dari user." };
  }

  let appContextText = "";
  if (typeof raw.appContext === "string") {
    appContextText = raw.appContext.trim().slice(0, MAX_CONTEXT_CHARS);
  } else if (isPlainObject(raw.appContext)) {
    const ctxObj = raw.appContext;
    const formatted = formatAppContextText({
      totalAset: Number(ctxObj.totalAset) || 0,
      totalPendapatan: Number(ctxObj.totalPendapatan) || 0,
      totalBeban: Number(ctxObj.totalBeban) || 0,
      labaBersih: Number(ctxObj.labaBersih) || 0,
      jumlahJurnal: Number(ctxObj.jumlahJurnal) || 0,
      recentJurnals: Array.isArray(ctxObj.recentJurnals)
        ? ctxObj.recentJurnals.filter((x): x is string => typeof x === "string").slice(0, 15)
        : [],
      akunsSummary: Array.isArray(ctxObj.akunsSummary)
        ? ctxObj.akunsSummary.filter((x): x is string => typeof x === "string").slice(0, 200)
        : [],
    });
    appContextText = formatted.slice(0, MAX_CONTEXT_CHARS);
  }

  return { ok: true, data: { messages, appContextText } };
}
