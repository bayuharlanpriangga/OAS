import { MAX_AI_MESSAGES, MAX_CONTEXT_CHARS, MAX_MESSAGE_CHARS, MAX_TOTAL_CHARS, formatAppContextText, isPlainObject, DEFAULT_GEMINI_MODEL } from "./konteks-prompt";
import type { AiChatMessage, ValidatedAiChatRequest } from "./types";
import type { GenerateContentResponse, GoogleGenAI } from "@google/genai";

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

export function extractSdkErrorStatus(err: unknown): { status: number; message: string } {
  const rawMsg =
    err instanceof Error ? err.message : "Gagal memproses permintaan AI.";
  const readableMsg = unwrapErrorMessage(rawMsg);

  let rawStatus = 0;
  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, unknown>;
    rawStatus =
      typeof record.status === "number"
        ? record.status
        : typeof record.code === "number"
          ? record.code
          : 0;
  }

  if (/API_KEY_INVALID|API key not valid|API_KEY/i.test(rawMsg)) {
    return {
      status: 400,
      message:
        "API key Gemini belum valid atau belum dikonfigurasi. Periksa GEMINI_API_KEY di panel Settings > Secrets.",
    };
  }
  if (/PERMISSION_DENIED/i.test(rawMsg) || rawStatus === 403) {
    return {
      status: 403,
      message:
        "Akses ke Gemini API ditolak. Periksa API key Anda di panel Settings > Secrets.",
    };
  }
  if (/RESOURCE_EXHAUSTED|quota|rate limit/i.test(rawMsg) || rawStatus === 429) {
    return {
      status: 429,
      message:
        "Kuota permintaan AI sementara penuh. Tunggu beberapa saat lalu coba lagi.",
    };
  }
  if (/NOT_FOUND/i.test(rawMsg) || rawStatus === 404) {
    return {
      status: 404,
      message: "Model Gemini yang diminta tidak ditemukan.",
    };
  }

  if (rawStatus >= 400 && rawStatus <= 599) {
    return {
      status: rawStatus,
      message: readableMsg || "Gagal memproses permintaan AI.",
    };
  }

  return { status: 500, message: readableMsg || "Gagal memproses permintaan AI." };
}

export function normalizeAiClientError(
  status: number,
  rawMessage?: string
): { message: string; hint?: string } {
  const msg = (rawMessage || "").trim();
  if (status === 400 || status === 401 || status === 403) {
    return {
      message: msg || "Permintaan ke layanan AI tidak dapat diproses.",
      hint: "Periksa konfigurasi API key Gemini di panel Settings > Secrets.",
    };
  }
  if (status === 429) {
    return {
      message: msg || "Terlalu banyak permintaan dalam waktu singkat.",
      hint: "Tunggu beberapa saat lalu coba kirim ulang pertanyaan Anda.",
    };
  }
  if (status === 404) {
    return {
      message: msg || "Model AI yang diminta tidak tersedia.",
      hint: "Pastikan model Gemini yang digunakan sesuai daftar model aktif.",
    };
  }
  if (status === 503) {
    return {
      message: msg || "Layanan AI belum siap digunakan.",
      hint: "Pastikan GEMINI_API_KEY sudah diatur di Settings > Secrets.",
    };
  }
  return {
    message: msg || "Terjadi kendala saat menghubungi Orias Assisten.",
    hint: "Periksa koneksi internet Anda lalu coba kembali.",
  };
}

export function unwrapErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
      if (typeof parsed?.error?.message === "string" && parsed.error.message.trim()) {
        return parsed.error.message.trim();
      }
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // Keep raw string if not valid JSON
    }
  }
  return trimmed;
}

export async function generateWithTransientRetry(
  ai: GoogleGenAI,
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
  systemInstruction: string
): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
      },
    });
  } catch (err) {
    const info = extractSdkErrorStatus(err);
    if (info.status === 503 || info.status === 500) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      return await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
        },
      });
    }
    throw err;
  }
}
