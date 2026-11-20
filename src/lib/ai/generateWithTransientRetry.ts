import { type GenerateContentResponse, type GoogleGenAI } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "./constants";
import { extractSdkErrorStatus } from "./extractSdkErrorStatus";

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
