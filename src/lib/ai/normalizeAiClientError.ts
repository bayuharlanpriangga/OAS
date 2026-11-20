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
