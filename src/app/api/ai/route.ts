import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { buildOriasSystemPrompt } from "@/lib/lainnya/orias-ai/prompt-sistem";
import { DEFAULT_GEMINI_MODEL } from "@/lib/lainnya/orias-ai/constants";
import { extractSdkErrorStatus } from "@/lib/lainnya/orias-ai/status-error-sdk";
import { generateWithTransientRetry } from "@/lib/lainnya/orias-ai/panggil-gemini";
import { validateAiChatRequest } from "@/lib/lainnya/orias-ai/validasi-permintaan";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Konfigurasi GEMINI_API_KEY belum tersedia. Tambahkan API key Gemini di panel Settings > Secrets.",
        code: "API_KEY_MISSING",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body request harus berupa JSON yang valid." },
      { status: 400 }
    );
  }

  const validated = validateAiChatRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const systemInstruction = buildOriasSystemPrompt(validated.data.appContextText);
  const contents = validated.data.messages.map((m) => ({
    role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: m.content }],
  }));

  try {
    const response = await generateWithTransientRetry(
      ai,
      contents,
      systemInstruction
    );
    const text = (response.text ?? "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "Model AI mengembalikan respons kosong. Silakan coba ulangi pertanyaan." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      text,
      model: DEFAULT_GEMINI_MODEL,
    });
  } catch (err) {
    const info = extractSdkErrorStatus(err);
    return NextResponse.json({ error: info.message }, { status: info.status });
  }
}
