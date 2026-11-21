import { unwrapErrorMessage } from "./pesan-error";

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
