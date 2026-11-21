"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  CheckCircle2,
  GraduationCap,
  Info,
  Lightbulb,
  Save,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import { parseJurnalFromAI } from "@/lib/shared/accounting";
import {
  executeOasAiActions,
  extractAiActions,
  gatherOasAppContext,
  normalizeAiClientError,
  normalizeAiJurnalEntry,
  parseAiResponseMarkdown,
  parseMarkdownInline,
  saveParsedJurnalFromAi,
  type AiAction,
  type AiChatMessage,
  type MarkdownBlock,
  type MarkdownInlineToken,
} from "@/lib/lainnya/orias-ai";
import { fmtRp } from "@/lib/shared/format";
import {
  callOasGlobal,
  readAkuns,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { ParsedAIJurnal } from "@/types";

interface UiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  variant: "normal" | "error" | "action-result";
  errorHint?: string;
  actionLogs?: string[];
  parsedJurnal?: ParsedAIJurnal | null;
  savedFallback?: boolean;
}

interface PendingActionConfirm {
  actions: AiAction[];
  jurnalActions: AiAction[];
  otherActions: AiAction[];
  resolve: (confirmed: boolean) => void;
}

const STARTER_CHIPS: ReadonlyArray<{ label: string; prompt: string }> = [
  {
    label: "Catat bayar listrik",
    prompt: "Catat bayar listrik Rp 500.000 tunai hari ini",
  },
  {
    label: "Analisis keuangan",
    prompt: "Analisis kondisi keuangan bisnis saya saat ini berdasarkan data jurnal",
  },
  {
    label: "Hitung penyusutan",
    prompt:
      "Saya beli laptop Rp 15.000.000 hari ini bayar tunai. Hitung penyusutannya 4 tahun metode garis lurus dan catat jurnalnya.",
  },
  {
    label: "Hitung BEP produk",
    prompt:
      "Hitung BEP untuk produk harga jual Rp 50.000, biaya variabel Rp 30.000, dan biaya tetap Rp 20.000.000",
  },
];

function renderInlineTokens(tokens: MarkdownInlineToken[], keyPrefix: string): ReactNode[] {
  return tokens.map((tok, idx) => {
    const key = `${keyPrefix}-${idx}`;
    switch (tok.type) {
      case "bold":
        return <b key={key}>{tok.text}</b>;
      case "italic":
        return <em key={key}>{tok.text}</em>;
      case "code":
        return <code key={key}>{tok.text}</code>;
      case "link":
        return (
          <a key={key} href={tok.href} target="_blank" rel="noopener noreferrer">
            {tok.text}
          </a>
        );
      default:
        return <span key={key}>{tok.text}</span>;
    }
  });
}

function renderInlineText(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split("\n");
  const out: ReactNode[] = [];
  parts.forEach((line, lineIdx) => {
    if (lineIdx > 0) out.push(<br key={`${keyPrefix}-br-${lineIdx}`} />);
    out.push(...renderInlineTokens(parseMarkdownInline(line), `${keyPrefix}-l${lineIdx}`));
  });
  return out;
}

function renderMarkdownBlocks(rawText: string, msgId: string): ReactNode {
  const blocks: MarkdownBlock[] = parseAiResponseMarkdown(rawText);
  return blocks.map((block, idx) => {
    const key = `${msgId}-b${idx}`;
    switch (block.type) {
      case "heading": {
        const cls = `ai-h${block.level}`;
        return (
          <div key={key} className={cls}>
            {renderInlineText(block.text, key)}
          </div>
        );
      }
      case "hr":
        return <hr key={key} className="ai-hr" />;
      case "quote":
        return (
          <div key={key} className="ai-quote">
            {renderInlineText(block.text, key)}
          </div>
        );
      case "code":
        return (
          <pre key={key}>
            <code>{block.text}</code>
          </pre>
        );
      case "formula":
        return (
          <div key={key} className="ai-formula">
            {block.text}
          </div>
        );
      case "journal":
        return (
          <div key={key} className="jurnal-preview">
            {block.lines.map((line, lIdx) => (
              <div key={`${key}-jl${lIdx}`} className={line.side}>
                {line.text}
              </div>
            ))}
          </div>
        );
      case "table":
        return (
          <table key={key} className="ai-table">
            <thead>
              <tr>
                {block.headers.map((h, hIdx) => (
                  <th key={`${key}-h${hIdx}`}>{renderInlineText(h, `${key}-h${hIdx}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rIdx) => (
                <tr key={`${key}-r${rIdx}`}>
                  {row.map((cell, cIdx) => (
                    <td key={`${key}-r${rIdx}-c${cIdx}`}>
                      {renderInlineText(cell, `${key}-r${rIdx}-c${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
      case "list":
        return block.ordered ? (
          <ol key={key} className="ai-list">
            {block.items.map((item, iIdx) => (
              <li key={`${key}-oi${iIdx}`}>{renderInlineText(item, `${key}-oi${iIdx}`)}</li>
            ))}
          </ol>
        ) : (
          <ul key={key} className="ai-list">
            {block.items.map((item, iIdx) => (
              <li key={`${key}-ui${iIdx}`}>{renderInlineText(item, `${key}-ui${iIdx}`)}</li>
            ))}
          </ul>
        );
      case "paragraph":
        return (
          <div key={key} style={{ margin: idx === 0 ? "0 0 6px" : "6px 0" }}>
            {renderInlineText(block.text, key)}
          </div>
        );
    }
  });
}

function makeMsgId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [thinking, setThinking] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingActionConfirm | null>(null);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const thinkingRef = useRef(false);
  const messagesRef = useRef<UiChatMessage[]>([]);

  thinkingRef.current = thinking;
  messagesRef.current = messages;

  const scrollToBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking, scrollToBottom]);

  const adjustTextareaHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "44px";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const requestActionConfirmation = useCallback(
    (actions: AiAction[]): Promise<boolean> => {
      const jurnalActions = actions.filter((a) => a.type === "addJurnal");
      const otherActions = actions.filter((a) => a.type !== "addJurnal");

      if (jurnalActions.length === 0) {
        return Promise.resolve(true);
      }

      return new Promise((resolve) => {
        setPendingConfirm({
          actions,
          jurnalActions,
          otherActions,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirmResolve = useCallback(
    (confirmed: boolean) => {
      if (!pendingConfirm) return;
      const resolver = pendingConfirm.resolve;
      setPendingConfirm(null);
      resolver(confirmed);
    },
    [pendingConfirm]
  );

  const clearChat = useCallback(() => {
    if (pendingConfirm) {
      pendingConfirm.resolve(false);
      setPendingConfirm(null);
    }
    setMessages([]);
    setInputVal("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.style.height = "44px";
    }
  }, [pendingConfirm]);

  const sendPrompt = useCallback(
    async (explicitPrompt?: string) => {
      if (thinkingRef.current) return;

      const domText = inputRef.current?.value ?? "";
      const rawText = typeof explicitPrompt === "string" ? explicitPrompt : domText || inputVal;
      const trimmed = rawText.trim();
      if (!trimmed) return;

      setInputVal("");
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.style.height = "44px";
      }

      const userMsg: UiChatMessage = {
        id: makeMsgId("u"),
        role: "user",
        content: trimmed,
        variant: "normal",
      };

      const conversationHistory: AiChatMessage[] = [
        ...messagesRef.current
          .filter((m) => m.variant === "normal")
          .slice(-20)
          .map((m) => ({
            role: m.role,
            content: m.content,
          })),
        { role: "user", content: trimmed },
      ];

      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);
      thinkingRef.current = true;

      try {
        const appContext = gatherOasAppContext();
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: conversationHistory,
            appContext,
          }),
        });

        let payload: { text?: string; error?: string } = {};
        try {
          payload = (await response.json()) as { text?: string; error?: string };
        } catch {
          payload = {};
        }

        if (!response.ok) {
          const normalized = normalizeAiClientError(response.status, payload.error);
          setMessages((prev) => [
            ...prev,
            {
              id: makeMsgId("err"),
              role: "assistant",
              content: normalized.message,
              variant: "error",
              errorHint: normalized.hint,
            },
          ]);
          return;
        }

        const rawReply = (payload.text || "").trim();
        const extracted = extractAiActions(rawReply);
        const displayText =
          extracted.displayText ||
          (extracted.actions.length > 0
            ? "Orias menyiapkan aksi otomatis untuk dijalankan di sistem."
            : "Maaf, saya belum menerima jawaban yang valid.");

        const hasJurnalAction = extracted.actions.some((a) => a.type === "addJurnal");
        let parsedJurnal: ParsedAIJurnal | null = null;
        if (
          !hasJurnalAction &&
          (displayText.includes("Dr.") || displayText.includes("Debit")) &&
          displayText.includes("Rp")
        ) {
          parsedJurnal = parseJurnalFromAI(displayText, readAkuns());
        }

        const botMsg: UiChatMessage = {
          id: makeMsgId("a"),
          role: "assistant",
          content: displayText,
          variant: "normal",
          parsedJurnal,
        };
        setMessages((prev) => [...prev, botMsg]);
        thinkingRef.current = false;
        setThinking(false);

        if (extracted.parseError) {
          setMessages((prev) => [
            ...prev,
            {
              id: makeMsgId("warn"),
              role: "assistant",
              content: `Sebagian format aksi otomatis tidak dapat diparsing (${extracted.parseError}).`,
              variant: "error",
            },
          ]);
        }

        if (extracted.actions.length > 0) {
          const confirmed = await requestActionConfirmation(extracted.actions);
          if (confirmed) {
            const actionLogs = await executeOasAiActions(extracted.actions);
            if (actionLogs.length > 0) {
              setMessages((prev) => [
                ...prev,
                {
                  id: makeMsgId("act"),
                  role: "assistant",
                  content: "Eksekusi otomatis selesai",
                  variant: "action-result",
                  actionLogs,
                },
              ]);
            }
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: makeMsgId("cancel"),
                role: "assistant",
                content: "Aksi otomatis dibatalkan. Data jurnal belum disimpan.",
                variant: "action-result",
                actionLogs: ["Konfirmasi dibatalkan oleh pengguna."],
              },
            ]);
          }
        }
      } catch (err) {
        const rawErr = err instanceof Error ? err.message : String(err);
        const normalized = normalizeAiClientError(500, rawErr);
        setMessages((prev) => [
          ...prev,
          {
            id: makeMsgId("err"),
            role: "assistant",
            content: normalized.message,
            variant: "error",
            errorHint: normalized.hint,
          },
        ]);
      } finally {
        thinkingRef.current = false;
        setThinking(false);
      }
    },
    [inputVal, requestActionConfirmation]
  );

  const handleSaveFallbackJurnal = useCallback(async (msgId: string, parsed: ParsedAIJurnal) => {
    const saved = await saveParsedJurnalFromAi(parsed);
    if (saved) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, savedFallback: true } : m))
      );
      try {
        const total = parsed.lines.reduce((s, l) => s + (l.debit || 0), 0);
        callOasGlobal(
          "auditLog",
          "create",
          "jurnal",
          `Simpan Jurnal dari AI: "${parsed.ket}" — ${fmtRp(total)}`,
          { ref: "AI-JURNAL", aiActed: true }
        );
      } catch {}
    }
  }, []);

  const sendPromptRef = useRef(sendPrompt);
  sendPromptRef.current = sendPrompt;
  const clearChatRef = useRef(clearChat);
  clearChatRef.current = clearChat;

  useEffect(() => {
    setOasWindowFn("sendAI", ((prompt?: string) =>
      sendPromptRef.current(typeof prompt === "string" ? prompt : undefined)) as (
      ...args: never[]
    ) => unknown);
    setOasWindowFn("clearAIChat", (() => clearChatRef.current()) as (
      ...args: never[]
    ) => unknown);
    setOasWindowFn("saveJurnalFromAI", ((parsed: ParsedAIJurnal) =>
      saveParsedJurnalFromAi(parsed)) as (...args: never[]) => unknown);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendPrompt();
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <div className="page" id="page-ai-assistant" data-react-managed="1">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100dvh - 120px)",
          minHeight: "440px",
          gap: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "14px",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="section-title"
              style={{ display: "flex", alignItems: "center", gap: "10px" }}
            >
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "var(--accent2-tint)",
                  border: "1px solid var(--border-strong)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent2)",
                  flexShrink: 0,
                }}
              >
                <Bot size={18} strokeWidth={2} />
              </span>
              <span>Orias Assisten</span>
            </div>
            <div className="section-sub" style={{ marginTop: "4px" }}>
              Ceritakan transaksi atau pertanyaan akuntansi Anda — Orias akan mencatat &amp; membimbing Anda
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearChat}
              disabled={!hasConversation && !inputVal.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                flexShrink: 0,
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              <span>Hapus Chat</span>
            </button>
          </div>
        </div>

        {/* Chat scroll area */}
        <div
          id="ai-chat"
          ref={chatScrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px 12px 0 0",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minHeight: 0,
          }}
        >
          {/* Welcome card */}
          <div className="ai-msg ai-msg-bot">
            <div
              className="ai-avatar"
              aria-hidden="true"
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                background: "var(--accent2-tint)",
                border: "1px solid var(--border-strong)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent2)",
              }}
            >
              <Bot size={16} strokeWidth={2} />
            </div>
            <div className="ai-bubble">
              <div
                style={{
                  fontWeight: 600,
                  color: "var(--accent2)",
                  marginBottom: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Sparkles size={15} strokeWidth={2} />
                <span>Orias Assisten siap membantu!</span>
              </div>
              <div style={{ marginBottom: "6px" }}>Saya bisa membantu Anda:</div>
              <ul
                style={{
                  margin: "4px 0 0",
                  paddingLeft: "4px",
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <BookOpen size={15} style={{ marginTop: "3px", flexShrink: 0, color: "var(--accent-text)" }} />
                  <span>
                    <b>Catat transaksi</b> — cukup ceritakan, jurnal dibuat otomatis
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Calculator size={15} style={{ marginTop: "3px", flexShrink: 0, color: "var(--accent2)" }} />
                  <span>
                    <b>Hitung kalkulasi</b> — penyusutan, BEP, PPh, rasio, bunga &amp; anuitas
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <BarChart3 size={15} style={{ marginTop: "3px", flexShrink: 0, color: "var(--accent3)" }} />
                  <span>
                    <b>Analisis laporan</b> — membaca data keuangan Anda &amp; memberi insight
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <Info size={15} style={{ marginTop: "3px", flexShrink: 0, color: "var(--accent2)" }} />
                  <span>
                    <b>Bimbingan penggunaan</b> — tanya cara pakai fitur OAS apa pun
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <GraduationCap size={15} style={{ marginTop: "3px", flexShrink: 0, color: "var(--green)" }} />
                  <span>
                    <b>Edukasi akuntansi</b> — jelaskan konsep, standar PSAK &amp; pajak
                  </span>
                </li>
              </ul>
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--muted)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <Lightbulb size={15} style={{ marginTop: "2px", flexShrink: 0, color: "var(--accent3)" }} />
                <span>
                  Contoh: <i>&quot;Kemarin saya beli laptop Rp 15jt untuk kantor, bayar tunai. Tolong buatkan jurnalnya dan hitung penyusutannya 4 tahun metode garis lurus.&quot;</i>
                </span>
              </div>
            </div>
          </div>

          {/* Starter prompt chips when chat is fresh */}
          {!hasConversation && (
            <div
              id="ai-chips"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                paddingLeft: "42px",
              }}
            >
              {STARTER_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => void sendPrompt(chip.prompt)}
                  style={{
                    background: "var(--surface2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontFamily: "var(--sans)",
                    transition: "border-color 0.15s, color 0.15s",
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Chat messages */}
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`ai-msg ${isUser ? "ai-msg-user" : "ai-msg-bot"}`}
              >
                <div
                  className="ai-avatar"
                  aria-hidden="true"
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: isUser
                      ? "var(--accent-tint)"
                      : msg.variant === "error"
                        ? "var(--red-tint)"
                        : "var(--accent2-tint)",
                    border: isUser
                      ? "1px solid var(--accent)"
                      : msg.variant === "error"
                        ? "1px solid var(--danger)"
                        : "1px solid var(--border-strong)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isUser
                      ? "var(--accent-text)"
                      : msg.variant === "error"
                        ? "var(--danger)"
                        : "var(--accent2)",
                  }}
                >
                  {isUser ? (
                    <User size={16} strokeWidth={2} />
                  ) : msg.variant === "error" ? (
                    <AlertTriangle size={16} strokeWidth={2} />
                  ) : (
                    <Bot size={16} strokeWidth={2} />
                  )}
                </div>

                {msg.variant === "action-result" ? (
                  <div
                    className="ai-bubble"
                    style={{
                      background: "var(--green-tint)",
                      borderColor: "var(--green)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "var(--green)",
                        marginBottom: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CheckCircle2 size={14} strokeWidth={2.2} />
                      <span>{msg.content}</span>
                    </div>
                    {msg.actionLogs?.map((log, i) => (
                      <div key={`${msg.id}-log-${i}`} style={{ fontSize: "13px", padding: "2px 0" }}>
                        {log}
                      </div>
                    ))}
                  </div>
                ) : msg.variant === "error" ? (
                  <div
                    className="ai-bubble"
                    style={{
                      background: "var(--red-tint)",
                      borderColor: "var(--danger)",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "var(--danger)", marginBottom: "4px" }}>
                      {msg.content}
                    </div>
                    {msg.errorHint && (
                      <div style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                        {msg.errorHint}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ai-bubble">
                    {isUser ? (
                      <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                    ) : (
                      <>
                        {renderMarkdownBlocks(msg.content, msg.id)}
                        {msg.parsedJurnal && (
                          <div style={{ marginTop: "10px" }}>
                            <button
                              type="button"
                              className="ai-action-btn"
                              disabled={Boolean(msg.savedFallback)}
                              onClick={() =>
                                void handleSaveFallbackJurnal(msg.id, msg.parsedJurnal!)
                              }
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                opacity: msg.savedFallback ? 0.65 : 1,
                              }}
                            >
                              <Save size={14} strokeWidth={2} />
                              <span>
                                {msg.savedFallback ? "Tersimpan ke Sistem" : "Simpan ke Sistem"}
                              </span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Thinking indicator */}
          {thinking && (
            <div className="ai-msg ai-msg-bot" aria-live="polite" aria-label="Orias sedang berpikir">
              <div
                className="ai-avatar"
                aria-hidden="true"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "6px",
                  background: "var(--accent2-tint)",
                  border: "1px solid var(--border-strong)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--accent2)",
                }}
              >
                <Bot size={16} strokeWidth={2} />
              </div>
              <div className="ai-bubble">
                <div className="ai-loading">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            padding: "12px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              id="ai-input"
              rows={1}
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ceritakan transaksi, tanya cara pakai, atau minta hitung sesuatu..."
              aria-label="Pesan untuk Orias Assisten"
              style={{
                flex: 1,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "var(--text)",
                fontFamily: "var(--sans)",
                fontSize: "13.5px",
                resize: "none",
                outline: "none",
                minHeight: "44px",
                maxHeight: "120px",
                lineHeight: 1.5,
              }}
            />
            <button
              type="button"
              id="ai-send-btn"
              onClick={() => void sendPrompt()}
              disabled={thinking || Boolean(pendingConfirm) || !inputVal.trim()}
              style={{
                background: "var(--accent)",
                color: "var(--accent-fg)",
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                fontWeight: 700,
                cursor: thinking || Boolean(pendingConfirm) || !inputVal.trim() ? "not-allowed" : "pointer",
                opacity: thinking || Boolean(pendingConfirm) || !inputVal.trim() ? 0.6 : 1,
                fontSize: "14px",
                fontFamily: "var(--sans)",
                height: "44px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Kirim</span>
              <Send size={15} strokeWidth={2.2} />
            </button>
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px" }}>
            Enter untuk kirim · Shift+Enter untuk baris baru · Terhubung ke data jurnal Anda
          </div>
        </div>
      </div>

      {/* Confirmation dialog before saving journal entries from AI */}
      <OasModalDialog
        id="ai-action-confirm-dialog"
        open={Boolean(pendingConfirm)}
        onClose={() => handleConfirmResolve(false)}
        title="Konfirmasi Aksi Orias"
        maxWidth="440px"
        footer={
          <div style={{ display: "flex", gap: "10px", width: "100%" }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => handleConfirmResolve(false)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => handleConfirmResolve(true)}
            >
              Ya, Simpan Sekarang
            </button>
          </div>
        }
      >
        {pendingConfirm && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendingConfirm.jurnalActions.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <BookOpen size={14} strokeWidth={2} />
                  <span>{pendingConfirm.jurnalActions.length} Jurnal akan disimpan:</span>
                </div>
                {pendingConfirm.jurnalActions.map((act, idx) => {
                  const norm = normalizeAiJurnalEntry(act);
                  return (
                    <div
                      key={`confirm-j-${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        marginBottom: "6px",
                        gap: "10px",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 600,
                            color: "var(--text)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {idx + 1}. {norm.ket}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          {norm.lines.length} baris jurnal · {norm.tanggal}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--accent-text)",
                          fontFamily: "var(--mono)",
                          fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        {fmtRp(norm.totalDebit)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingConfirm.otherActions.length > 0 && (
              <div
                style={{
                  background: "rgba(217,119,43,0.12)",
                  border: "1px solid var(--accent3)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  color: "var(--accent3)",
                }}
              >
                {pendingConfirm.otherActions.length} aksi tambahan akan ikut dijalankan (navigasi, pengisian kalkulator, dll).
              </div>
            )}

            <div
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "9px 12px",
                fontSize: "12px",
                color: "var(--muted)",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px", color: "var(--accent3)" }} />
              <span>
                Data yang sudah disimpan dapat ditinjau atau dibalik lewat menu{" "}
                <b style={{ color: "var(--text)" }}>Jurnal Umum</b>.
              </span>
            </div>
          </div>
        )}
      </OasModalDialog>
    </div>
  );
}
