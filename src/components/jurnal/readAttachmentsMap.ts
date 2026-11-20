import { callOasGlobal } from "@/lib/legacy-store";

export function readAttachmentsMap(): Record<string, unknown[]> {
  const res = callOasGlobal("getAttachments");
  if (res && typeof res === "object") return res as Record<string, unknown[]>;
  return {};
}
