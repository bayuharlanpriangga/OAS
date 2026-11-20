import type { KsKategori } from "../kartu-stock/types";

export type AiChatRole = "user" | "assistant";

export interface AiChatMessage {
  role: AiChatRole;
  content: string;
}

export interface OasAppContext {
  totalAset: number;
  totalPendapatan: number;
  totalBeban: number;
  labaBersih: number;
  jumlahJurnal: number;
  recentJurnals: string[];
  akunsSummary: string[];
}

export interface AiAction {
  type: string;
  [key: string]: unknown;
}

export interface ValidatedAiChatRequest {
  messages: AiChatMessage[];
  appContextText: string;
}

export interface ExtractedAiActions {
  displayText: string;
  actions: AiAction[];
  hadActionBlock: boolean;
  parseError?: string;
}

export type MarkdownInlineToken =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { type: "hr" }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "formula"; text: string }
  | { type: "journal"; lines: Array<{ side: "dr" | "kr"; text: string }> }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string };

export interface FoundKartuKategori {
  cardId: string;
  katId: string;
  kat: KsKategori;
}
