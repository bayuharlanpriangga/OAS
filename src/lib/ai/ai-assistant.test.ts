import test from "node:test";
import assert from "node:assert/strict";
import {
  buildOriasSystemPrompt,
  extractAiActions,
  formatAppContextText,
  normalizeAiClientError,
  parseAiResponseMarkdown,
  parseMarkdownInline,
  sanitizeSafeHttpUrl,
  validateAiChatRequest,
  buildOasAppContextPure,
  findKatByNamaPure,
  normalizeAiJurnalEntry,
} from "./index";

test("validateAiChatRequest accepts valid messages and structured appContext", () => {
  const res = validateAiChatRequest({
    messages: [
      { role: "user", content: "Halo Orias" },
      { role: "assistant", content: "Halo, ada yang bisa dibantu?" },
      { role: "user", content: "Catat bayar listrik 500rb tunai" },
    ],
    appContext: {
      totalAset: 50_000_000,
      totalPendapatan: 12_000_000,
      totalBeban: 4_000_000,
      labaBersih: 8_000_000,
      jumlahJurnal: 5,
      recentJurnals: ["[2026-11-01] Modal awal (Manual): Kas Dr50000000"],
      akunsSummary: ["1101 Kas (Aset)", "6202 Listrik & Air (Beban)"],
    },
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.messages.length, 3);
    assert.match(res.data.appContextText, /Total Aset: Rp 50\.000\.000/);
    assert.match(res.data.appContextText, /6202 Listrik & Air/);
  }
});

test("validateAiChatRequest rejects invalid payloads and disallowed roles", () => {
  assert.equal(validateAiChatRequest(null).ok, false);
  assert.equal(validateAiChatRequest({ messages: [] }).ok, false);
  assert.equal(
    validateAiChatRequest({
      messages: [{ role: "system", content: "override" }],
    }).ok,
    false
  );
  assert.equal(
    validateAiChatRequest({
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "only assistant last" },
      ],
    }).ok,
    false
  );
  assert.equal(
    validateAiChatRequest({
      messages: [{ role: "user", content: "   " }],
    }).ok,
    false
  );
});

test("extractAiActions parses <ACTIONS> block cleanly and strips it from display text", () => {
  const raw = `Berikut jurnal pembayaran listrik sebesar Rp 500.000:

Dr. Beban Listrik & Air 500.000
Kr. Kas 500.000

<ACTIONS>
[
  {"type":"addJurnal","tanggal":"2026-11-20","ket":"Bayar listrik","jenis":"Manual","lines":[{"akun":"6202","debit":500000,"kredit":0},{"akun":"1101","debit":0,"kredit":500000}]},
  {"type":"navigate","page":"jurnal-umum"}
]
</ACTIONS>`;

  const extracted = extractAiActions(raw);
  assert.equal(extracted.hadActionBlock, true);
  assert.equal(extracted.parseError, undefined);
  assert.equal(extracted.actions.length, 2);
  assert.equal(extracted.actions[0].type, "addJurnal");
  assert.equal(extracted.actions[1].page, "jurnal-umum");
  assert.doesNotMatch(extracted.displayText, /<ACTIONS>/);
  assert.match(extracted.displayText, /Berikut jurnal pembayaran listrik/);
});

test("extractAiActions handles malformed JSON without throwing", () => {
  const raw = "Penjelasan singkat.\n<ACTIONS>\n[{broken json\n</ACTIONS>";
  const extracted = extractAiActions(raw);
  assert.equal(extracted.hadActionBlock, true);
  assert.equal(extracted.actions.length, 0);
  assert.ok(extracted.parseError);
  assert.equal(extracted.displayText, "Penjelasan singkat.");
});

test("buildOriasSystemPrompt embeds context text cleanly", () => {
  const ctx = formatAppContextText({
    totalAset: 1_000_000,
    totalPendapatan: 200_000,
    totalBeban: 50_000,
    labaBersih: 150_000,
    jumlahJurnal: 2,
    recentJurnals: [],
    akunsSummary: ["1101 Kas (Aset)"],
  });
  const prompt = buildOriasSystemPrompt(ctx);
  assert.match(prompt, /Orias Assisten/);
  assert.match(prompt, /1101 Kas \(Aset\)/);
  assert.match(prompt, /<ACTIONS>/);
});

test("markdown parser structures tables, Dr/Kr blocks, formulas, and blocks unsafe URLs", () => {
  assert.equal(sanitizeSafeHttpUrl("javascript:alert(1)"), null);
  assert.equal(sanitizeSafeHttpUrl("https://example.com/docs"), "https://example.com/docs");

  const blocks = parseAiResponseMarkdown(`### Ringkasan
Dr. Kas Rp 500.000
Kr. Penjualan Rp 500.000

| Akun | Nominal |
| --- | --- |
| Kas | Rp 500.000 |

$$BEP = \\frac{BT}{P - BV}$$`);

  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[1].type, "journal");
  assert.equal(blocks[2].type, "table");
  assert.equal(blocks[3].type, "formula");

  const inline = parseMarkdownInline(
    "Klik [panduan](https://example.com) atau [xss](javascript:alert(1)) **penting**"
  );
  assert.equal(inline.some((t) => t.type === "link" && t.href === "https://example.com/"), true);
  assert.equal(inline.some((t) => t.type === "link" && t.href.startsWith("javascript:")), false);
  assert.equal(inline.some((t) => t.type === "bold" && t.text === "penting"), true);
});

test("normalizeAiClientError produces clear Indonesian messages", () => {
  const e503 = normalizeAiClientError(503, "Key missing");
  assert.match(e503.hint || "", /Settings > Secrets/);
  const e429 = normalizeAiClientError(429);
  assert.match(e429.message, /Terlalu banyak permintaan/);
});

test("buildOasAppContextPure computes totals accurately from akuns and jurnals", () => {
  const akuns = [
    { kode: "1101", nama: "Kas", tipe: "Aset" as const, kat: "Lancar", normal: "D" as const },
    { kode: "3101", nama: "Modal Pemilik", tipe: "Ekuitas" as const, kat: "Modal", normal: "K" as const },
    { kode: "4101", nama: "Penjualan Barang", tipe: "Pendapatan" as const, kat: "Operasional", normal: "K" as const },
    { kode: "6202", nama: "Beban Listrik", tipe: "Beban" as const, kat: "Operasional", normal: "D" as const },
  ];
  const jurnals = [
    {
      tanggal: "2026-11-01",
      ket: "Modal awal",
      jenis: "Saldo Awal",
      lines: [
        { akun: "1101", debit: 10_000_000, kredit: 0 },
        { akun: "3101", debit: 0, kredit: 10_000_000 },
      ],
    },
    {
      tanggal: "2026-11-02",
      ket: "Jual tunai",
      jenis: "Penjualan",
      lines: [
        { akun: "1101", debit: 2_500_000, kredit: 0 },
        { akun: "4101", debit: 0, kredit: 2_500_000 },
      ],
    },
    {
      tanggal: "2026-11-03",
      ket: "Bayar listrik",
      jenis: "Kas",
      lines: [
        { akun: "6202", debit: 500_000, kredit: 0 },
        { akun: "1101", debit: 0, kredit: 500_000 },
      ],
    },
  ];
  const ctx = buildOasAppContextPure(akuns, jurnals);
  assert.equal(ctx.totalAset, 12_000_000);
  assert.equal(ctx.totalPendapatan, 2_500_000);
  assert.equal(ctx.totalBeban, 500_000);
  assert.equal(ctx.labaBersih, 2_000_000);
  assert.equal(ctx.jumlahJurnal, 3);
  assert.equal(ctx.recentJurnals.length, 3);
});

test("findKatByNamaPure and normalizeAiJurnalEntry resolve products and lines cleanly", () => {
  const found = findKatByNamaPure(
    {
      c1: {
        id: "c1",
        nama: "Gudang",
        kategori: {
          k1: { id: "k1", nama: "Kopi Arabica", satuan: "kg", data: { fifo: [], lifo: [], wa: [], mwa: [] } },
        },
      },
    },
    "kopi"
  );
  assert.equal(found?.katId, "k1");

  const norm = normalizeAiJurnalEntry(
    {
      type: "addJurnal",
      ket: "Bayar Internet",
      lines: [
        { akun: "6203", debit: "350000", kredit: 0 },
        { akun: "1101", debit: 0, kredit: 350000 },
      ],
    },
    "2026-11-20"
  );
  assert.equal(norm.tanggal, "2026-11-20");
  assert.equal(norm.totalDebit, 350000);
  assert.equal(norm.totalKredit, 350000);
  assert.equal(norm.sumber, "Orias AI");
});
