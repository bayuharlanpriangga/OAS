
// ═══ MULTI-AI — PROVIDER AUTO-DETECT + MULTI-KEY ROTATION ═══
// API key ditempel apa adanya — provider (Gemini/Claude/GPT/Groq/dst) dikenali
// otomatis dari pola/prefix key-nya, jadi tidak perlu dipilih manual.
// Setiap key disimpan sebagai "record" (bukan cuma string) supaya bisa
// menyimpan status pemakaian & cooldown per key, termasuk lintas refresh halaman.

const AI_KEYS_STORAGE = 'oas_ai_keys';
const LEGACY_GEMINI_KEYS_STORAGE = 'oas_gemini_keys'; // format lama: array of string

const AI_PROVIDERS = {
  gemini: {
    id: 'gemini', name: 'Google Gemini', badge: 'Ge', color: '#4285F4',
    kind: 'gemini', defaultModel: 'gemini-3.6-flash',
    defaultLimit: 10, windowMs: 60000,
    match: k => /^AIza/.test(k) || /^AQ\./.test(k)
  },
  anthropic: {
    id: 'anthropic', name: 'Claude (Anthropic)', badge: 'Cl', color: '#D97757',
    kind: 'anthropic', baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    defaultLimit: 50, windowMs: 60000,
    match: k => /^sk-ant-/.test(k)
  },
  groq: {
    id: 'groq', name: 'Groq', badge: 'Gr', color: '#F55036',
    kind: 'openai-compat', baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'openai/gpt-oss-120b',
    defaultLimit: 30, windowMs: 60000,
    match: k => /^gsk_/.test(k)
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', badge: 'OR', color: '#6366F1',
    kind: 'openai-compat', baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-5.1',
    defaultLimit: 20, windowMs: 60000,
    match: k => /^sk-or-/.test(k)
  },
  xai: {
    id: 'xai', name: 'xAI (Grok)', badge: 'Gx', color: '#0f172a',
    kind: 'openai-compat', baseUrl: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-4',
    defaultLimit: 20, windowMs: 60000,
    match: k => /^xai-/.test(k)
  },
  perplexity: {
    id: 'perplexity', name: 'Perplexity', badge: 'Px', color: '#20808D',
    kind: 'openai-compat', baseUrl: 'https://api.perplexity.ai/chat/completions',
    defaultModel: 'sonar',
    defaultLimit: 20, windowMs: 60000,
    match: k => /^pplx-/.test(k)
  },
  openai: {
    id: 'openai', name: 'OpenAI (GPT)', badge: 'Op', color: '#10A37F',
    kind: 'openai-compat', baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.1',
    defaultLimit: 20, windowMs: 60000,
    match: k => /^sk-proj-/.test(k) || /^sk-[A-Za-z0-9_-]{20,}$/.test(k)
  },
  unknown: {
    id: 'unknown', name: 'Provider Tidak Dikenal', badge: '?', color: '#64748b',
    kind: 'unknown', defaultModel: '',
    defaultLimit: 10, windowMs: 60000,
    match: () => true
  }
};
// Urutan cek penting — prefix yang lebih spesifik dicek duluan supaya tidak
// "tertangkap" aturan generik sk-... milik OpenAI (mis. sk-ant-, sk-or- harus
// dicek sebelum sk-... generik).
const AI_PROVIDER_ORDER = ['anthropic', 'groq', 'openrouter', 'xai', 'perplexity', 'gemini', 'openai', 'unknown'];

function detectAIProvider(rawKey) {
  const k = (rawKey || '').trim();
  for (const id of AI_PROVIDER_ORDER) {
    if (AI_PROVIDERS[id].match(k)) return AI_PROVIDERS[id];
  }
  return AI_PROVIDERS.unknown;
}

function makeKeyRecord(rawKey, providerId) {
  const p = providerId ? AI_PROVIDERS[providerId] : detectAIProvider(rawKey);
  return {
    key: rawKey,
    provider: p.id,
    model: p.defaultModel,
    addedAt: Date.now(),
    usedCount: 0,        // jumlah request di window berjalan (estimasi lokal)
    windowStart: Date.now(),
    cooldownUntil: 0,    // epoch ms — 0 = tidak cooldown
    cooldownTotalMs: 0,  // durasi cooldown terakhir, buat hitung progress recovery
    limitType: null,     // 'per-minute' | 'daily' | null
    lastError: null,
    lastUsed: null
  };
}

function getAIKeys() {
  const stored = localStorage.getItem(AI_KEYS_STORAGE);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  // Migrasi otomatis dari format lama (array of string, khusus Gemini)
  const legacy = localStorage.getItem(LEGACY_GEMINI_KEYS_STORAGE);
  if (legacy) {
    try {
      const arr = JSON.parse(legacy);
      if (Array.isArray(arr) && arr.length) {
        const migrated = arr.map(k => makeKeyRecord(k, 'gemini'));
        saveAIKeys(migrated);
        return migrated;
      }
    } catch {}
  }
  return [];
}

function saveAIKeys(list) {
  localStorage.setItem(AI_KEYS_STORAGE, JSON.stringify(list));
}

// Alias kompatibilitas lama (dulu API key disimpan sebagai array of string)
function getGeminiKeys() { return getAIKeys(); }
function saveGeminiKeys(list) { saveAIKeys(list); }

function getKeyHash(key) { return (key || '').slice(-8); }

function formatCountdown(ms) {
  if (ms <= 0) return '0 detik';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s} detik`;
}

function formatCountdownShort(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Track which key is "up next" for round-robin rotation
let aiActiveKeyIndex = 0;

// Provider yang sedang "dipakai" secara manual oleh user (lihat
// setActiveProvider). Disimpan supaya bertahan lintas refresh halaman.
// Kalau belum pernah dipilih user, default-nya provider dari key pertama.
const AI_ACTIVE_PROVIDER_STORAGE = 'oas_ai_active_provider';
let aiActiveProviderId = localStorage.getItem(AI_ACTIVE_PROVIDER_STORAGE) || null;

// Provider aktif yang sebenarnya dipakai untuk render — fallback ke provider
// key pertama kalau belum pernah dipilih manual atau providernya sudah tidak
// punya key lagi (mis. semua key provider itu dihapus).
function getEffectiveActiveProviderId(keys) {
  if (aiActiveProviderId && keys.some(k => k.provider === aiActiveProviderId)) return aiActiveProviderId;
  return keys.length ? keys[0].provider : null;
}

// User klik chip "Siap" di card sebuah provider → provider itu jadi aktif,
// provider sebelumnya otomatis berhenti jadi yang dipakai. Key yang dipakai
// otomatis pindah ke key PALING ATAS milik provider ini yang masih bisa
// dipakai (bukan yang sedang recovery). Kalau semua key provider ini sedang
// recovery, tidak ada yang bisa diaktifkan — klik diabaikan.
function setActiveProvider(providerId, ev) {
  if (ev) ev.stopPropagation();
  const keys = getAIKeys();
  let targetIdx = -1;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].provider === providerId && !isRecordCoolingDown(keys[i])) { targetIdx = i; break; }
  }
  if (targetIdx === -1) return; // semua key provider ini masih recovery
  aiActiveProviderId = providerId;
  aiActiveKeyIndex = targetIdx;
  try { localStorage.setItem(AI_ACTIVE_PROVIDER_STORAGE, providerId); } catch (e) {}
  renderAIKeysList();
  updateAIKeyStatus();
}

function isRecordCoolingDown(rec) {
  return !!rec.cooldownUntil && Date.now() < rec.cooldownUntil;
}

function getAvailableKeyRecord(keys) {
  if (!keys.length) return null;
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const idx = (aiActiveKeyIndex + attempt) % keys.length;
    const rec = keys[idx];
    if (!isRecordCoolingDown(rec)) {
      aiActiveKeyIndex = idx;
      return rec;
    }
  }
  return null; // semua key sedang cooldown
}

function getShortestCooldownMs(keys) {
  let min = Infinity;
  const now = Date.now();
  keys.forEach(rec => {
    if (rec.cooldownUntil > now) min = Math.min(min, rec.cooldownUntil - now);
  });
  return min === Infinity ? 0 : min;
}

function trackKeyUsage(rec) {
  const provider = AI_PROVIDERS[rec.provider] || AI_PROVIDERS.unknown;
  const now = Date.now();
  if (now - rec.windowStart > provider.windowMs) {
    rec.windowStart = now;
    rec.usedCount = 0;
  }
  rec.usedCount++;
  rec.lastUsed = now;
}

// Error terstruktur biar logic rotasi/cooldown bisa dipakai sama rata
// untuk semua provider (bukan cuma Gemini).
function AIProviderError(message, opts) {
  const err = new Error(message);
  err.name = 'AIProviderError';
  err.status = opts && opts.status;
  err.retryAfterSec = opts && opts.retryAfterSec;
  err.isHourlyOrDaily = !!(opts && opts.isHourlyOrDaily);
  return err;
}

async function parseRateLimitError(response) {
  const errBody = await response.json().catch(() => ({}));
  const errMsg = errBody?.error?.message || '';
  const retryHeader = response.headers.get('retry-after') || response.headers.get('x-ratelimit-reset-requests') || '';
  const isHourlyOrDaily = /hour|day|daily/i.test(errMsg);
  const retryAfterSec = retryHeader ? parseInt(retryHeader) : (isHourlyOrDaily ? 3600 : 60);
  return AIProviderError(errMsg || 'Rate limit', { status: 429, retryAfterSec, isHourlyOrDaily });
}

// NOTE: Gemini pakai endpoint native generateContent (bukan jalur OpenAI-compat
// /v1beta/openai/chat/completions) — key format baru Google "AQ." tidak stabil
// lewat jalur OpenAI-compat (pernah 400/401 walau key valid), tapi jalan normal
// lewat x-goog-api-key di endpoint native ini.
async function callGeminiOnce(rec, systemPrompt, messages) {
  const model = rec.model || AI_PROVIDERS.gemini.defaultModel;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': rec.key
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: { maxOutputTokens: 8000, temperature: 0.7 }
    })
  });

  if (response.status === 429) throw await parseRateLimitError(response);
  if (response.status === 401 || response.status === 403) {
    throw AIProviderError(`API Key tidak valid/ditolak (HTTP ${response.status})`, { status: response.status });
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw AIProviderError(err?.error?.message || `HTTP ${response.status}`, { status: response.status });
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'Maaf, tidak ada respons.';
}

async function callAnthropicOnce(rec, systemPrompt, messages) {
  const provider = AI_PROVIDERS.anthropic;
  const model = rec.model || provider.defaultModel;
  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': rec.key,
      'anthropic-version': '2023-06-01',
      // Header ini yang membuat API Claude bisa dipanggil langsung dari browser
      // (tanpa header ini, request lintas-origin dari browser ditolak).
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
    })
  });

  if (response.status === 429) throw await parseRateLimitError(response);
  if (response.status === 401 || response.status === 403) {
    throw AIProviderError(`API Key tidak valid/ditolak (HTTP ${response.status})`, { status: response.status });
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw AIProviderError(err?.error?.message || `HTTP ${response.status}`, { status: response.status });
  }
  const data = await response.json();
  return (data.content || []).map(b => b.text || '').join('') || 'Maaf, tidak ada respons.';
}

// Handler generik buat semua provider yang endpoint-nya kompatibel gaya OpenAI
// chat/completions: OpenAI sendiri, Groq, OpenRouter, xAI (Grok), Perplexity.
async function callOpenAICompatOnce(rec, systemPrompt, messages) {
  const provider = AI_PROVIDERS[rec.provider];
  const model = rec.model || provider.defaultModel;
  const response = await fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rec.key}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ],
      max_tokens: 8000,
      temperature: 0.7
    })
  });

  if (response.status === 429) throw await parseRateLimitError(response);
  if (response.status === 401 || response.status === 403) {
    throw AIProviderError(`API Key tidak valid/ditolak (HTTP ${response.status})`, { status: response.status });
  }
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw AIProviderError(err?.error?.message || `HTTP ${response.status}`, { status: response.status });
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Maaf, tidak ada respons.';
}

async function callProviderOnce(rec, systemPrompt, messages) {
  const provider = AI_PROVIDERS[rec.provider] || AI_PROVIDERS.unknown;
  if (provider.kind === 'gemini') return callGeminiOnce(rec, systemPrompt, messages);
  if (provider.kind === 'anthropic') return callAnthropicOnce(rec, systemPrompt, messages);
  if (provider.kind === 'openai-compat') return callOpenAICompatOnce(rec, systemPrompt, messages);
  throw AIProviderError('Provider dari key ini tidak dikenali otomatis. Hapus key ini lalu tambahkan key dari provider yang didukung (Gemini, Claude, GPT, Groq, OpenRouter, Grok, atau Perplexity).', { status: 0 });
}

async function callAIWithRotation(systemPrompt, messages) {
  const keys = getAIKeys();

  if (!keys.length) {
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum ada AI API Key. Klik Setup AI untuk tambahkan.');
    openApiKeyModal();
    throw new Error('AI API Key belum diset. Klik tombol Setup AI.');
  }

  const rec = getAvailableKeyRecord(keys);

  if (!rec) {
    const cooldownMs = getShortestCooldownMs(keys);
    const cooldownSec = Math.ceil(cooldownMs / 1000);
    const hasDailyLimit = keys.some(k => k.limitType === 'daily');
    if (hasDailyLimit || cooldownSec > 600) {
      showAIRateLimitInfo(keys, cooldownSec, 'daily');
      throw new Error('Semua key sedang dalam batas limit. Lihat info di bawah.');
    }
    startCooldownDisplay(cooldownSec, true);
    throw new Error(`⏳ Semua key cooldown ${cooldownSec}s — otomatis coba lagi`);
  }

  try {
    const text = await callProviderOnce(rec, systemPrompt, messages);
    trackKeyUsage(rec);
    rec.limitType = null;
    rec.lastError = null;
    aiActiveKeyIndex = (aiActiveKeyIndex + 1) % keys.length; // load balance ke key berikutnya
    saveAIKeys(keys);
    return text;
  } catch (e) {
    if (e && e.status === 429) {
      const retryAfterSec = e.retryAfterSec || 60;
      rec.cooldownUntil = Date.now() + retryAfterSec * 1000;
      rec.cooldownTotalMs = retryAfterSec * 1000;
      rec.limitType = e.isHourlyOrDaily ? 'daily' : 'per-minute';
      rec.lastError = (e.message || '').slice(0, 160);
      aiActiveKeyIndex = (aiActiveKeyIndex + 1) % keys.length;
      saveAIKeys(keys);

      // Coba key lain dulu sebelum nyerah
      const nextRec = getAvailableKeyRecord(keys);
      if (nextRec && nextRec !== rec) {
        return await callAIWithRotation(systemPrompt, messages);
      }

      const shortest = getShortestCooldownMs(keys);
      const cooldownSec = Math.ceil(shortest / 1000);
      if (e.isHourlyOrDaily) {
        const hoursLeft = Math.ceil(cooldownSec / 3600);
        showAIRateLimitInfo(keys, cooldownSec, 'daily');
        throw new Error(`Batas harian tercapai. Key ini bisa dipakai lagi dalam ~${hoursLeft} jam. Coba tambah key baru di Setup AI.`);
      } else {
        startCooldownDisplay(cooldownSec, true);
        throw new Error(`Rate limit. Cooldown ${cooldownSec}s — otomatis coba lagi`);
      }
    }

    if (e && (e.status === 401 || e.status === 403)) {
      rec.cooldownUntil = Date.now() + 3600000; // key invalid, skip 1 jam
      rec.cooldownTotalMs = 3600000;
      rec.limitType = null;
      rec.lastError = (e.message || '').slice(0, 160);
      aiActiveKeyIndex = (aiActiveKeyIndex + 1) % keys.length;
      saveAIKeys(keys);
      throw new Error(`API Key tidak valid: ...${getKeyHash(rec.key)}. Coba key lain.`);
    }

    rec.lastError = (e && e.message ? e.message : String(e)).slice(0, 160);
    saveAIKeys(keys);
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// Alias kompatibilitas nama lama
async function callGeminiWithRotation(systemPrompt, messages) {
  return callAIWithRotation(systemPrompt, messages);
}

// startCooldownDisplay moved to smart rate limit section above
let cooldownInterval = null;

// ═══ MODAL SETUP AI — render, live update, dan aksi key ═══
let aiKeyLiveTimer = null;
let aiKeyExpandedIdx = null;
let aiExpandedProvider = null; // provider id yang cardnya sedang dibuka

function openApiKeyModal() {
  renderAIKeysList();
  renderProviderGuideGrid();
  const info = document.getElementById('gemini-info-box');
  if (info) info.style.display = 'none';
  const label = document.getElementById('ai-detected-provider');
  if (label) label.style.display = 'none';
  document.getElementById('modal-apikey').classList.add('open');
  startAIKeyLiveUpdates();
}
function openGeminiKeyModal() { openApiKeyModal(); } // alias kompatibilitas lama

function closeApiKeyModal() {
  stopAIKeyLiveUpdates();
  aiKeyExpandedIdx = null;
  aiExpandedProvider = null;
  closeModal('modal-apikey');
}

function startAIKeyLiveUpdates() {
  stopAIKeyLiveUpdates();
  // Update tiap detik selagi modal terbuka — bikin ring pemakaian & countdown
  // recovery selalu real-time, termasuk saat key sedang cooldown/limit.
  aiKeyLiveTimer = setInterval(() => {
    const modal = document.getElementById('modal-apikey');
    if (!modal || !modal.classList.contains('open')) { stopAIKeyLiveUpdates(); return; }
    renderAIKeysList();
  }, 1000);
}

function stopAIKeyLiveUpdates() {
  if (aiKeyLiveTimer) { clearInterval(aiKeyLiveTimer); aiKeyLiveTimer = null; }
}

function toggleGeminiInfo() {
  const info = document.getElementById('gemini-info-box');
  if(!info) return;
  const isHidden = info.style.display === 'none';
  info.style.display = isHidden ? 'block' : 'none';
  const btn = document.getElementById('gemini-info-toggle-btn');
  if(btn) {
    btn.style.color = isHidden ? 'var(--accent2)' : 'var(--muted)';
    btn.style.borderColor = isHidden ? 'rgba(34,211,238,0.4)' : 'var(--border)';
  }
}

// ═══ PANDUAN SETUP PER PROVIDER ═══
// Konten panduan (tagline, langkah-langkah, link pembuatan key) untuk tiap
// provider yang didukung. Data identitas (nama/badge/warna) tetap diambil
// dari AI_PROVIDERS supaya selalu konsisten dengan detector di atas — di
// sini cuma nyimpen bagian yang khusus buat panduan.
const PROVIDER_GUIDES = {
  gemini: {
    tagline: 'Gratis, tanpa kartu kredit',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'aistudio.google.com/apikey',
    keyFormats: ['AQ.Abxxx...', 'AIzaxxx...'],
    note: 'Free tier Gemini 3.6 Flash ± 10 req/menit per key. Buat beberapa key dari project berbeda buat naikin kapasitas.',
    steps: [
      { t: 'Buka halaman API key', d: 'Buka <b>aistudio.google.com/apikey</b> di tab baru, login pakai akun Google & terima syarat ketentuan.' },
      { t: 'Klik "Create API key"', d: 'Tombolnya ada di bagian atas halaman.' },
      { t: 'Pilih project Google Cloud', d: 'Pilih project yang sudah ada, atau biarkan dibuatkan otomatis, lalu klik <b>Create API key</b> untuk konfirmasi.' },
      { t: 'Salin key yang muncul', d: 'Key langsung tampil (format baru <b>AQ.Abxxx...</b>, kadang masih dapat format lama <b>AIzaxxx...</b>). Google tetap menyimpannya di dashboard kalau lupa copy.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b> → selesai.' }
    ]
  },
  anthropic: {
    tagline: 'Berbayar — isi saldo dulu',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'console.anthropic.com/settings/keys',
    keyFormats: ['sk-ant-...'],
    note: 'Anthropic tidak punya free tier permanen — key baru bisa dipakai setelah akun diisi saldo/kredit minimum di menu Billing.',
    steps: [
      { t: 'Buka console Anthropic', d: 'Buka <b>console.anthropic.com/settings/keys</b>, login atau daftar akun Anthropic.' },
      { t: 'Lengkapi billing', d: 'Kalau belum pernah isi saldo, buka menu <b>Billing</b> dan isi kredit dulu — key tidak aktif tanpa ini.' },
      { t: 'Klik "Create Key"', d: 'Beri nama key bebas, misalnya "OAS".' },
      { t: 'Salin key sekali tampil', d: 'Key (<b>sk-ant-...</b>) cuma ditampilkan sekali saat dibuat — langsung disalin sebelum modal ditutup.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  },
  groq: {
    tagline: 'Gratis, free tier besar',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'console.groq.com/keys',
    keyFormats: ['gsk_...'],
    note: 'Free tier Groq cukup besar dan cepat (GPT-OSS 120B) — cocok jadi provider cadangan performa tinggi.',
    steps: [
      { t: 'Buka console Groq', d: 'Buka <b>console.groq.com/keys</b>, login pakai Google, GitHub, atau email.' },
      { t: 'Klik "Create API Key"', d: 'Beri nama key bebas.' },
      { t: 'Salin key yang muncul', d: 'Key (<b>gsk_...</b>) hanya ditampilkan sekali — langsung disalin.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  },
  openrouter: {
    tagline: 'Sebagian gratis, sebagian kredit',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'openrouter.ai/keys',
    keyFormats: ['sk-or-...'],
    note: 'OpenRouter jadi gerbang ke banyak model sekaligus. Sebagian model gratis (ditandai ":free"), sisanya perlu isi kredit dulu.',
    steps: [
      { t: 'Buka OpenRouter Keys', d: 'Buka <b>openrouter.ai/keys</b>, login pakai Google/GitHub/email.' },
      { t: 'Klik "Create Key"', d: 'Beri nama key, atur limit kredit kalau perlu (opsional).' },
      { t: 'Salin key yang muncul', d: 'Key (<b>sk-or-...</b>) langsung tampil — salin sebelum modal ditutup.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  },
  xai: {
    tagline: 'Berbayar — isi saldo dulu',
    keyUrl: 'https://console.x.ai',
    keyUrlLabel: 'console.x.ai',
    keyFormats: ['xai-...'],
    note: 'API xAI (Grok) berbayar — key baru bisa dipakai setelah isi billing/kredit di console.',
    steps: [
      { t: 'Buka console xAI', d: 'Buka <b>console.x.ai</b>, login pakai akun X.' },
      { t: 'Lengkapi billing', d: 'Isi kredit/billing dulu di menu Billing kalau belum pernah.' },
      { t: 'Buka menu API Keys', d: 'Klik <b>Create API Key</b>, beri nama bebas.' },
      { t: 'Salin key yang muncul', d: 'Key (<b>xai-...</b>) langsung tampil — salin sebelum modal ditutup.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  },
  perplexity: {
    tagline: 'Berbayar — perlu API credit',
    keyUrl: 'https://www.perplexity.ai/settings/api',
    keyUrlLabel: 'perplexity.ai/settings/api',
    keyFormats: ['pplx-...'],
    note: 'Butuh akun Perplexity dengan API credit aktif — terpisah dari langganan Perplexity Pro biasa.',
    steps: [
      { t: 'Buka pengaturan API', d: 'Buka <b>perplexity.ai/settings/api</b>, login akun Perplexity.' },
      { t: 'Isi API credit', d: 'Tambahkan API credit kalau belum ada saldo.' },
      { t: 'Klik "Generate"', d: 'Di bagian API Keys, klik <b>Generate</b> untuk bikin key baru.' },
      { t: 'Salin key yang muncul', d: 'Key (<b>pplx-...</b>) langsung tampil — salin sebelum modal ditutup.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  },
  openai: {
    tagline: 'Berbayar — isi saldo dulu',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'platform.openai.com/api-keys',
    keyFormats: ['sk-proj-...', 'sk-...'],
    note: 'Ini portal API/billing OpenAI, terpisah dari akun ChatGPT biasa. OpenAI API tidak gratis — isi saldo dulu di menu Billing.',
    steps: [
      { t: 'Buka platform OpenAI', d: 'Buka <b>platform.openai.com/api-keys</b>, login/daftar akun OpenAI.' },
      { t: 'Lengkapi billing', d: 'Buka menu <b>Billing</b>, isi saldo minimum — key tidak berfungsi tanpa ini.' },
      { t: 'Klik "Create new secret key"', d: 'Beri nama key bebas.' },
      { t: 'Salin key sekali tampil', d: 'Key (<b>sk-proj-...</b> atau <b>sk-...</b>) hanya ditampilkan sekali — langsung disalin.' },
      { t: 'Tempel di modal setup', d: 'Paste di kotak input → klik <b>+ Tambah</b>.' }
    ]
  }
};

// Grid modul provider di dalam panel panduan (gemini-info-box). Di-render
// sekali dari AI_PROVIDER_ORDER (kecuali 'unknown') supaya daftarnya selalu
// sinkron sama provider yang benar-benar didukung detector.
function renderProviderGuideGrid() {
  const grid = document.getElementById('provider-guide-grid');
  if (!grid) return;
  grid.innerHTML = AI_PROVIDER_ORDER.filter(id => id !== 'unknown').map(id => {
    const p = AI_PROVIDERS[id];
    const g = PROVIDER_GUIDES[id];
    return `<button type="button" onclick="openProviderGuideModal('${id}')" style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 9px;cursor:pointer;text-align:left;font-family:inherit;">
      <span style="width:22px;height:22px;border-radius:6px;background:${p.color};color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${p.badge}</span>
      <span style="flex:1;min-width:0;">
        <span style="display:block;font-size:11.5px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</span>
        <span style="display:block;font-size:9.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${g ? g.tagline : ''}</span>
      </span>
      <i class="ti ti-chevron-right" style="font-size:14px;color:var(--muted);flex-shrink:0;"></i>
    </button>`;
  }).join('');
}

// Buka modal detail 1 provider — dipanggil saat modul provider di-tap dari
// grid panduan. Modal ini TIDAK expand ke bawah di tempat, tapi muncul
// sebagai modal terpisah di atas modal setup (bukan menggantikannya), jadi
// modal setup tetap ada di belakangnya begitu modal ini ditutup.
function openProviderGuideModal(providerId) {
  const p = AI_PROVIDERS[providerId];
  const g = PROVIDER_GUIDES[providerId];
  if (!p || !g) return;

  document.getElementById('pg-badge').style.background = p.color;
  document.getElementById('pg-badge').textContent = p.badge;
  document.getElementById('pg-title').textContent = p.name;
  document.getElementById('pg-tagline').textContent = g.tagline;

  const stepsHtml = g.steps.map((s, i) => `
    <div style="display:flex;gap:10px;${i < g.steps.length - 1 ? 'margin-bottom:12px;' : ''}">
      <span style="width:20px;height:20px;border-radius:50%;background:${p.color};color:#fff;font-size:10.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i + 1}</span>
      <div>
        <div style="font-weight:700;color:var(--text);font-size:12.5px;">${s.t}</div>
        <div style="margin-top:2px;">${s.d}</div>
      </div>
    </div>`).join('');

  const formatsHtml = g.keyFormats.map(f => `<code style="background:var(--surface2);padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px;">${f}</code>`).join('');

  document.getElementById('pg-body').innerHTML = `
    <div style="margin-bottom:14px;">${stepsHtml}</div>
    <div style="font-size:11.5px;margin-bottom:10px;">
      <i class="ti ti-key" style="font-size:12px;width:12px;height:12px;vertical-align:-2px;margin-right:3px;"></i> Format key: ${formatsHtml}
    </div>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:7px;padding:8px 10px;font-size:12px;">
      <i class="ti ti-bulb" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> ${g.note}
    </div>`;

  const link = document.getElementById('pg-open-link');
  link.href = g.keyUrl;
  link.title = g.keyUrlLabel;

  openModal('modal-provider-guide');
}

function updateDetectedProviderLabel() {
  const inp = document.getElementById('gemini-new-key');
  const label = document.getElementById('ai-detected-provider');
  if (!inp || !label) return;
  const val = inp.value.trim();
  if (val.length < 6) { label.style.display = 'none'; return; }
  const provider = detectAIProvider(val);
  label.style.display = 'flex';
  if (provider.id === 'unknown') {
    label.innerHTML = `<i class="ti ti-question-mark" style="font-size:12px;width:12px;height:12px;color:var(--muted);"></i> Provider belum dikenali — key tetap bisa ditambahkan, tapi mungkin tidak berfungsi`;
  } else {
    label.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:5px;background:${provider.color};color:#fff;font-size:9px;font-weight:800;flex-shrink:0;">${provider.badge}</span> Terdeteksi: <b style="color:var(--text)">${provider.name}</b>`;
  }
}

// Pemakaian "efektif" 1 key, dihitung real-time saat render (bukan cuma
// saat request beneran jalan) — begitu window per-menitnya lewat, otomatis
// dianggap pulih/reset ke 0 meski belum ada request baru yang memicu reset
// di trackKeyUsage(). Ini murni buat tampilan; state asli tetap dijaga oleh
// trackKeyUsage() supaya rotasi key tetap konsisten.
function getEffectiveUsedCount(rec, provider) {
  const now = Date.now();
  if (now - rec.windowStart > provider.windowMs) return 0;
  return rec.usedCount;
}

// Ring SVG generik — dipakai baik buat ring gabungan per-provider maupun
// ring kecil per-key di dalam card yang dibuka.
function renderRingSVG(pct, ringColor, centerText, fontSize, size, stroke) {
  size = size || 44; stroke = stroke || 4;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0;">
    <g transform="rotate(-90 ${size/2} ${size/2})">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--border)" stroke-width="${stroke}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="${stroke}"
        stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" stroke-linecap="round" style="transition:stroke-dasharray 0.5s ease"/>
    </g>
    <text x="${size/2}" y="${size/2}" fill="var(--text)" font-size="${fontSize}" font-family="var(--sans)" font-weight="700"
      text-anchor="middle" dominant-baseline="central">${centerText}</text>
  </svg>`;
}

// Ring per-key individual (dipakai di dalam card provider yang terbuka).
function renderKeyRing(rec, provider, size, stroke) {
  const now = Date.now();
  const inCooldown = isRecordCoolingDown(rec);
  let pct, ringColor, centerText, fontSize;

  if (inCooldown) {
    const remain = rec.cooldownUntil - now;
    const total = rec.cooldownTotalMs || Math.max(1, remain);
    pct = Math.max(0, Math.min(100, ((total - remain) / total) * 100));
    ringColor = rec.limitType === 'daily' ? 'var(--red)' : 'var(--accent3)';
    centerText = formatCountdownShort(remain);
    fontSize = '9px';
  } else {
    const limit = provider.defaultLimit || 10;
    const used = getEffectiveUsedCount(rec, provider);
    pct = Math.max(0, Math.min(100, (used / limit) * 100));
    ringColor = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--accent3)' : 'var(--accent)';
    centerText = `${Math.round(pct)}%`;
    fontSize = '10.5px';
  }
  return renderRingSVG(pct, ringColor, centerText, fontSize, size, stroke);
}

// Statistik gabungan 1 provider — kapasitas total = jumlah key × limit per
// key, dipakai-nya dijumlah dari semua key (key yang lagi cooldown dihitung
// "penuh" kapasitasnya sampai dia pulih). Progress bar ini otomatis
// "merata-ratakan" ulang tiap kali jumlah key provider itu berubah, dan
// otomatis turun bobotnya begitu salah satu key pulih (real-time, dihitung
// ulang tiap render — lihat getEffectiveUsedCount).
function computeProviderStats(providerId, group) {
  const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.unknown;
  const limit = provider.defaultLimit || 10;
  const now = Date.now();
  let totalCapacity = 0, totalUsed = 0, anyAvailable = false, coolingCount = 0, nearestRecoveryMs = Infinity;
  let hasDailyCooldown = false;

  group.forEach(({ rec }) => {
    totalCapacity += limit;
    if (isRecordCoolingDown(rec)) {
      totalUsed += limit; // key lagi cooldown = dianggap penuh terpakai
      coolingCount++;
      nearestRecoveryMs = Math.min(nearestRecoveryMs, rec.cooldownUntil - now);
      if (rec.limitType === 'daily') hasDailyCooldown = true;
    } else {
      totalUsed += Math.min(limit, getEffectiveUsedCount(rec, provider));
      anyAvailable = true;
    }
  });

  const pct = totalCapacity ? Math.max(0, Math.min(100, (totalUsed / totalCapacity) * 100)) : 0;
  return {
    provider, limit, totalCapacity, totalUsed, pct, anyAvailable,
    coolingCount, allCooling: coolingCount === group.length,
    nearestRecoveryMs: nearestRecoveryMs === Infinity ? 0 : nearestRecoveryMs,
    hasDailyCooldown
  };
}

function toggleProviderCard(providerId) {
  aiExpandedProvider = aiExpandedProvider === providerId ? null : providerId;
  aiKeyExpandedIdx = null;
  renderAIKeysList();
}

function toggleKeyDetail(idx) {
  aiKeyExpandedIdx = aiKeyExpandedIdx === idx ? null : idx;
  renderAIKeysList();
}

function copyKeyToClipboard(idx, ev) {
  if (ev) ev.stopPropagation();
  const keys = getAIKeys();
  const rec = keys[idx];
  if (!rec || !navigator.clipboard) return;
  navigator.clipboard.writeText(rec.key).then(() => {
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Key disalin');
  }).catch(() => {});
}

function updateKeyModel(idx, value) {
  const keys = getAIKeys();
  if (!keys[idx]) return;
  keys[idx].model = value.trim();
  saveAIKeys(keys);
}

// Baris 1 key di dalam card provider yang terbuka (masked key, model, hapus, dst).
// isProviderActive: true kalau card provider ini yang lagi jadi provider aktif —
// hanya dalam kondisi ini salah satu key-nya boleh berstatus "Aktif", selain
// itu (provider lain) semua key-nya wajar tampil "Siap" semua.
function renderKeyRow(rec, i, provider, isProviderActive) {
  const now = Date.now();
  const inCooldown = isRecordCoolingDown(rec);
  const isActiveKey = isProviderActive && i === aiActiveKeyIndex;
  const masked = rec.key.length > 12 ? (rec.key.slice(0, 6) + '••••••••' + rec.key.slice(-4)) : rec.key;
  const expanded = aiKeyExpandedIdx === i;

  const statusChip = inCooldown
    ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:${rec.limitType==='daily'?'var(--red)':'var(--accent3)'};"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Recovery</span>`
    : `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;color:var(--accent);"><i class="ti ti-circle-check" style="font-size:11px;width:11px;height:11px;"></i> ${isActiveKey ? 'Aktif' : 'Siap'}</span>`;

  return `<div style="background:var(--surface);border:1px solid ${inCooldown?'rgba(245,158,11,0.25)':(isActiveKey?'rgba(74,222,128,0.4)':'var(--border)')};border-radius:8px;margin-top:7px;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:9px;padding:7px 8px;cursor:pointer;" onclick="toggleKeyDetail(${i})">
      ${renderKeyRing(rec, provider, 32, 3)}
      <div style="flex:1;min-width:0;">
        <code style="font-size:10.5px;font-family:var(--mono);color:var(--muted);">${masked}</code>
        <div style="margin-top:2px;">${statusChip}</div>
      </div>
      <i class="ti ${expanded?'ti-x':'ti-eye'}" style="font-size:13px;width:13px;height:13px;color:var(--muted);flex-shrink:0;"></i>
    </div>
    ${expanded ? `<div style="padding:0 8px 8px 8px;border-top:1px dashed var(--border);" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
        <button onclick="copyKeyToClipboard(${i}, event)" data-tooltip="Salin key" style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 8px;cursor:pointer;color:var(--muted);flex-shrink:0;"><i class="ti ti-copy" style="font-size:13px;width:13px;height:13px;"></i></button>
        <button onclick="removeAIKey(${i})" data-tooltip="Hapus key" style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:6px;padding:6px 8px;cursor:pointer;color:var(--red);flex-shrink:0;"><i class="ti ti-trash" style="font-size:13px;width:13px;height:13px;"></i></button>
        <span style="font-size:10.5px;color:var(--muted);flex-shrink:0;">Model:</span>
        <input type="text" value="${(rec.model||'').replace(/"/g,'&quot;')}" onchange="updateKeyModel(${i}, this.value)"
          style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-family:var(--mono);font-size:11px;outline:none;min-width:0;">
      </div>
      ${inCooldown ? `<div style="margin-top:8px;font-size:11px;color:var(--muted);">${rec.limitType==='daily'?'Batas harian':'Rate limit'} — bisa dipakai lagi dalam <b style="color:${rec.limitType==='daily'?'var(--red)':'var(--accent3)'}">${formatCountdown(rec.cooldownUntil-now)}</b> (${new Date(rec.cooldownUntil).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})})</div>` : ''}
      ${rec.lastError ? `<div style="margin-top:6px;font-size:10.5px;color:var(--muted);">Pesan terakhir: ${escapeHtml(rec.lastError)}</div>` : ''}
    </div>` : ''}
  </div>`;
}

function renderAIKeysList() {
  const keys = getAIKeys();
  const container = document.getElementById('gemini-keys-list');
  if (!container) return;

  if (!keys.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px;">Belum ada key. Tambahkan minimal 1 key — jumlahnya bebas, tidak dibatasi.</div>';
  } else {
    // Kelompokkan key per provider — 1 provider = 1 card, meski keynya banyak.
    const groups = {}; const order = [];
    keys.forEach((rec, i) => {
      if (!groups[rec.provider]) { groups[rec.provider] = []; order.push(rec.provider); }
      groups[rec.provider].push({ rec, idx: i });
    });

    const effectiveActiveProviderId = getEffectiveActiveProviderId(keys);

    container.innerHTML = order.map(providerId => {
      const group = groups[providerId];
      const stats = computeProviderStats(providerId, group);
      const { provider, pct, allCooling, coolingCount, nearestRecoveryMs, hasDailyCooldown } = stats;
      const expanded = aiExpandedProvider === providerId;
      const isActiveProvider = providerId === effectiveActiveProviderId;

      let ringColor, centerText, fontSize;
      if (allCooling) {
        ringColor = hasDailyCooldown ? 'var(--red)' : 'var(--accent3)';
        centerText = formatCountdownShort(nearestRecoveryMs);
        fontSize = '9px';
      } else {
        ringColor = pct >= 90 ? 'var(--red)' : pct >= 60 ? 'var(--accent3)' : 'var(--accent)';
        centerText = `${Math.round(pct)}%`;
        fontSize = '10.5px';
      }
      const ringSVG = renderRingSVG(pct, ringColor, centerText, fontSize, 44, 4);

      // Chip status level-provider — INI yang boleh mengubah provider aktif.
      // Diklik hanya berefek kalau lagi nunjukin "Siap" (provider lain, ada
      // key yg bisa dipakai). Kalau provider ini sudah aktif atau semua
      // key-nya recovery, chip cuma teks biasa (tidak bisa diklik).
      let statusChip;
      if (isActiveProvider) {
        statusChip = allCooling
          ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:${hasDailyCooldown?'var(--red)':'var(--accent3)'};"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Aktif (semua key recovery)</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--accent);"><i class="ti ti-circle-check" style="font-size:12px;width:12px;height:12px;"></i> Aktif${coolingCount>0?` <span style="color:var(--muted);font-weight:500;">(${coolingCount} recovery)</span>`:''}</span>`;
      } else if (allCooling) {
        statusChip = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:${hasDailyCooldown?'var(--red)':'var(--accent3)'};"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Semua key recovery</span>`;
      } else {
        statusChip = `<span onclick="setActiveProvider('${providerId}', event)" style="display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:var(--muted);cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:2px;"><i class="ti ti-circle-check" style="font-size:12px;width:12px;height:12px;"></i> Siap</span>`;
      }

      return `<div style="background:var(--surface2);border:1px solid ${allCooling?'rgba(245,158,11,0.3)':(isActiveProvider?'rgba(74,222,128,0.2)':'var(--border)')};border-radius:9px;margin-bottom:8px;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;cursor:pointer;" onclick="toggleProviderCard('${providerId}')">
          ${ringSVG}
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:5px;background:${provider.color};color:#fff;font-size:9px;font-weight:800;flex-shrink:0;">${provider.badge}</span>
              <span style="font-size:12.5px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${provider.name}</span>
              <span style="font-size:10px;color:var(--muted);flex-shrink:0;">×${group.length} key</span>
            </div>
            <div style="margin-top:3px;">${statusChip}</div>
          </div>
          <i class="ti ${expanded?'ti-x':'ti-eye'}" style="font-size:14px;width:14px;height:14px;color:var(--muted);flex-shrink:0;"></i>
        </div>
        ${expanded ? `<div style="padding:0 10px 10px 10px;border-top:1px dashed var(--border);" onclick="event.stopPropagation()">
          ${group.map(({ rec, idx }) => renderKeyRow(rec, idx, provider, isActiveProvider)).join('')}
        </div>` : ''}
      </div>`;
    }).join('');
  }

  const countEl = document.getElementById('gemini-key-count');
  if (countEl) {
    if (!keys.length) {
      countEl.textContent = 'Belum ada key';
    } else {
      const byProvider = {};
      keys.forEach(k => { byProvider[k.provider] = (byProvider[k.provider] || 0) + 1; });
      const summary = Object.keys(byProvider).map(id => `${(AI_PROVIDERS[id]||AI_PROVIDERS.unknown).name} ×${byProvider[id]}`).join(', ');
      countEl.textContent = `${keys.length} key — ${summary}`;
    }
  }
}
function loadGeminiKeys() { renderAIKeysList(); } // alias kompatibilitas lama

function addAIKey() {
  const inp = document.getElementById('gemini-new-key');
  if (!inp) return;
  const key = inp.value.trim();
  if (key.length < 15 || /\s/.test(key)) {
    showAlert('❌ Format API key tidak valid.'); return;
  }
  const keys = getAIKeys();
  if (keys.some(k => k.key === key)) { showAlert('Key sudah ada!'); return; }
  const rec = makeKeyRecord(key);
  keys.push(rec);
  saveAIKeys(keys);
  inp.value = '';
  const label = document.getElementById('ai-detected-provider');
  if (label) label.style.display = 'none';
  renderAIKeysList();
  updateAIKeyStatus();
  const provider = AI_PROVIDERS[rec.provider];
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${provider.name} ditambahkan! Total ${keys.length} key aktif.`);
}
function addGeminiKey() { addAIKey(); } // alias kompatibilitas lama

function removeAIKey(idx) {
  const keys = getAIKeys();
  keys.splice(idx, 1);
  saveAIKeys(keys);
  aiKeyExpandedIdx = null;
  renderAIKeysList();
  updateAIKeyStatus();
  showAlert('Key dihapus');
}
function removeGeminiKey(idx) { removeAIKey(idx); } // alias kompatibilitas lama

function updateAIKeyStatus() {
  const btn = document.getElementById('ai-key-status-btn');
  if(!btn) return;
  const keys = getAIKeys();
  if(keys.length > 0) {
    const now = Date.now();
    const allCoolingDown = keys.every(k => k.cooldownUntil && now < k.cooldownUntil);
    btn.innerHTML = `<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> ${keys.length} Key Aktif`;
    btn.className = 'btn btn-ghost btn-sm ' + (allCoolingDown ? 'key-missing' : 'key-ok');
  } else {
    btn.textContent = 'Setup AI';
    btn.className = 'btn btn-ghost btn-sm key-missing';
  }
  btn.style.flexShrink = '0';
}


function useChip(el) {
  document.getElementById('ai-input').value = el.textContent.replace(/^[^\w\s]*\s*/,'').trim();
  document.getElementById('ai-input').style.height = '44px';
  sendAI();
}

function toggleAIChips() {
  const chips = document.getElementById('ai-chips');
  const icon = document.getElementById('ai-chips-toggle-icon');
  const label = document.getElementById('ai-chips-toggle-label');
  const toggleBar = chips?.previousElementSibling;
  if(!chips) return;
  const isHidden = chips.style.display === 'none';
  chips.style.display = isHidden ? 'flex' : 'none';
  if(icon) icon.textContent = isHidden ? '▲' : '▼';
  if(label) label.textContent = isHidden ? 'Sembunyikan' : 'Tampilkan';
  localStorage.setItem('oas_chips_visible', isHidden ? '1' : '0');
}

function initChipsState() {
  const saved = localStorage.getItem('oas_chips_visible');
  if(saved === '0') {
    const chips = document.getElementById('ai-chips');
    const icon = document.getElementById('ai-chips-toggle-icon');
    const label = document.getElementById('ai-chips-toggle-label');
    if(chips) chips.style.display = 'none';
    if(icon) icon.textContent = '▼';
    if(label) label.textContent = 'Tampilkan';
  }
}

function clearAIChat() {
  aiHistory = [];
  const chat = document.getElementById('ai-chat');
  chat.innerHTML = `<div class="ai-msg ai-msg-bot">
    <div class="ai-avatar"><i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i></div>
    <div class="ai-bubble">
      <div style="font-weight:600;color:var(--accent2);margin-bottom:6px;">Chat dibersihkan. Siap membantu!</div>
      <div>Ceritakan transaksi atau pertanyaan akuntansi Anda.</div>
    </div>
  </div>`;
  // Restore chips based on saved preference
  const saved = localStorage.getItem('oas_chips_visible');
  const chips = document.getElementById('ai-chips');
  const icon = document.getElementById('ai-chips-toggle-icon');
  const label = document.getElementById('ai-chips-toggle-label');
  const toggleBar = document.getElementById('ai-chips-toggle')?.parentElement;
  if(chips) chips.style.display = saved === '0' ? 'none' : 'flex';
  if(toggleBar) toggleBar.style.display = 'flex';
  if(icon) icon.textContent = saved === '0' ? '▼' : '▲';
  if(label) label.textContent = saved === '0' ? 'Tampilkan' : 'Sembunyikan';
}

function appendMsg(role, html) {
  const chat = document.getElementById('ai-chat');
  const isUser = role === 'user';
  const div = document.createElement('div');
  div.className = 'ai-msg ' + (isUser ? 'ai-msg-user' : 'ai-msg-bot');
  div.innerHTML = `<div class="ai-avatar">${isUser ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' : '<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>'}</div><div class="ai-bubble">${html}</div>`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function getAppContext() {
  // Gather current financial data to give AI context
  let totalAset = 0, totalPend = 0, totalBeban = 0;
  akuns.forEach(a => {
    const s = getSaldoAkun(a.kode);
    if(a.tipe==='Aset') totalAset += (a.normal==='D'?s:-s);
    if(a.tipe==='Pendapatan') totalPend += s;
    if(['Beban','HPP'].includes(a.tipe)) totalBeban += s;
  });
  const recentJurnals = jurnalEntries.slice(-5).map(j =>
    `[${j.tanggal}] ${j.ket} (${j.jenis}): ` + j.lines.map(l => {
      const a = akuns.find(x=>x.kode===l.akun);
      return (a?.nama||l.akun) + (l.debit?` Dr${l.debit}`:` Kr${l.kredit}`);
    }).join(', ')
  ).join('\n');

  const akunList = akuns.map(a => `${a.kode} ${a.nama} (${a.tipe})`).join(', ');

  return `KONTEKS DATA KEUANGAN SAAT INI:
- Total Aset: Rp ${totalAset.toLocaleString('id-ID')}
- Total Pendapatan: Rp ${totalPend.toLocaleString('id-ID')}
- Total Beban: Rp ${totalBeban.toLocaleString('id-ID')}
- Laba Bersih: Rp ${(totalPend-totalBeban).toLocaleString('id-ID')}
- Jumlah Jurnal: ${jurnalEntries.length} entri
- Jurnal Terbaru:\n${recentJurnals||'(belum ada)'}

DAFTAR AKUN TERSEDIA:
${akunList}`;
}

async function sendAI() {
  if(aiThinking) return;
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if(!msg) return;

  // Hide chips after first message — hide both chips and toggle bar
  const chipsToggleBar = document.getElementById('ai-chips-toggle')?.parentElement;
  if(chipsToggleBar) chipsToggleBar.style.display = 'none';
  document.getElementById('ai-chips').style.display='none';

  input.value = '';
  input.style.height = '44px';

  appendMsg('user', escapeHtml(msg));
  aiHistory.push({ role: 'user', content: msg });

  // Show loading
  aiThinking = true;
  document.getElementById('ai-send-btn').disabled = true;
  document.getElementById('ai-send-btn').textContent = '...';
  const loadingDiv = appendMsg('bot', `<div class="ai-loading"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`);

  const systemPrompt = `Kamu adalah Orias Assisten — asisten akuntansi canggih yang BISA LANGSUNG MENGEKSEKUSI AKSI di software akuntansi ini secara otomatis. Kamu ditenagai oleh model AI yang terhubung ke sistem ini (bisa Gemini, Claude, GPT, atau lainnya tergantung API key yang sedang aktif), bisa paham bahasa Indonesia formal maupun gaul/casual, dan selalu berusaha membantu sampai masalah beres.

IDENTITAS:
Kamu adalah kombinasi akuntan senior (CPA/CA), konsultan pajak, analis keuangan, dan programmer yang bisa menulis kode aksi. Bahasa Indonesia yang hangat dan profesional.

KEMAMPUAN EKSEKUSI LANGSUNG (SANGAT PENTING!):
Kamu BISA dan HARUS mengeksekusi aksi nyata di sistem menggunakan format JSON action di akhir responsmu.
JANGAN PERNAH bilang "saya tidak bisa input otomatis" karena KAMU BISA dan HARUS melakukannya.

FORMAT AKSI - tulis di paling bawah respons:
<ACTIONS>
[array JSON aksi]
</ACTIONS>

JENIS AKSI TERSEDIA:

1. SIMPAN JURNAL:
{"type":"addJurnal","tanggal":"2026-04-30","ket":"Deskripsi","jenis":"Manual","lines":[{"akun":"1101","ket":"Kas","debit":500000,"kredit":0},{"akun":"6103","ket":"Listrik","debit":0,"kredit":500000}]}

2. NAVIGASI:
{"type":"navigate","page":"dashboard"}
Halaman valid: dashboard, transaksi, jurnal-umum, jurnal-kas, jurnal-penjualan, jurnal-pembelian, buku-besar, neraca-saldo, laba-rugi, neraca, akun, kalk-penyusutan, kalk-persediaan, kalk-bunga, kalk-rasio, kalk-bep, kalk-ppn

3. ISI KALKULATOR PENYUSUTAN:
{"type":"fillKalkPenyusutan","cost":100000000,"sisa":10000000,"umur":5,"metode":"garis-lurus","nama":"Nama Aset"}
Metode: garis-lurus, saldo-menurun, saldo-menurun-1x, sum-of-years, unit-produksi

4. ISI KALKULATOR BEP:
{"type":"fillKalkBEP","harga":50000,"bv":30000,"bt":20000000,"vol":1500}

5. ISI KALKULATOR ANUITAS/CICILAN:
{"type":"fillKalkAnuitas","pokok":500000000,"rate":12,"tenor":36,"jenis":"anuitas","dp":0}

6. ISI KALKULATOR PPN:
{"type":"fillKalkPPN","nilai":10000000,"tarif":"12","mode":"eksklusif"}

7. ISI KALKULATOR PPH21:
{"type":"fillKalkPPH21","gaji":10000000,"tunjangan":0,"ptkp":"TK0","bonus":0}

8. NOTIFIKASI:
{"type":"showAlert","msg":"Pesan sukses"}

9. TAMBAH AKUN:
{"type":"addAkun","kode":"6106","nama":"Beban Transportasi","tipe":"Beban","kat":"Operasional"}

ATURAN PENTING:
- Beri penjelasan lengkap DULU, tulis <ACTIONS> di paling bawah
- Bisa kirim BANYAK aksi sekaligus dalam 1 array
- Transaksi kompleks = multiple addJurnal + navigate + showAlert
- Kode akun WAJIB dari daftar yang tersedia
- Tanggal format YYYY-MM-DD, jika tidak disebutkan pakai hari ini
- Setelah addJurnal selalu navigate ke jurnal yang relevan

KODE AKUN UTAMA (103 akun tersedia — gunakan kode yang paling tepat):
ASET LANCAR: 1101=Kas, 1102=Bank BCA, 1103=Bank Mandiri, 1104=Kas Kecil, 1201=Piutang Usaha, 1203=Cadangan Kerugian Piutang, 1301=Persediaan Barang Dagangan, 1302=Bahan Baku, 1303=Barang Dalam Proses, 1304=Barang Jadi, 1401=Perlengkapan Kantor, 1502=PPN Masukan, 1503=PPh Dibayar Dimuka (Uang Muka Pajak), 1601=Biaya Dibayar Dimuka
ASET TETAP: 1702=Bangunan, 1703=Akm Peny Bangunan, 1711=Kendaraan, 1712=Akm Peny Kendaraan, 1721=Peralatan Kantor, 1722=Akm Peny Peralatan, 1731=Mesin, 1732=Akm Peny Mesin, 1751=Komputer, 1752=Akm Peny Komputer
LIABILITAS: 2101=Utang Usaha, 2201=Utang Gaji, 2202=Utang THR, 2301=Utang PPN, 2302=Utang PPh 21 (Karyawan), 2303=Utang PPh 23 (Hutang ke Negara), 2304=Utang PPh Badan, 2401=Pendapatan Diterima di Muka, 2402=Uang Muka Pelanggan, 2501=Utang Bunga, 2502=Biaya Masih Harus Dibayar, 2701=Utang BPJS Kes, 2702=Utang BPJS TK, 2801=Utang Bank Jk Panjang, 2802=Utang Leasing
EKUITAS: 3101=Modal Pemilik, 3102=Prive, 3201=Laba Ditahan
PENDAPATAN: 4101=Penjualan Barang, 4102=Penjualan Jasa, 4103=Retur Penjualan, 4104=Diskon Penjualan, 4201=Pendapatan Komisi, 4202=Pendapatan Sewa, 4203=Pendapatan Bunga
HPP: 5101=HPP, 5102=Pembelian, 5103=Retur Pembelian, 5104=Biaya Angkut, 5201=Bahan Baku Langsung, 5202=TKL, 5203=Overhead Pabrik
BEBAN SDM: 6101=Beban Gaji, 6102=Lembur, 6103=THR/Bonus, 6104=BPJS Kes, 6105=BPJS TK
BEBAN OPS: 6201=Sewa, 6202=Listrik & Air, 6203=Telp & Internet, 6204=BBM & Transport, 6205=Perlengkapan, 6206=Pemeliharaan
BEBAN PENYUSUTAN: 6301=Peny Bangunan, 6302=Peny Kendaraan, 6303=Peny Peralatan, 6304=Peny Mesin, 6305=Peny Komputer
BEBAN PEMASARAN: 6401=Iklan, 6402=Komisi Jual, 6403=Pengiriman
BEBAN ADMIN: 6501=Adm Umum, 6502=Perjalanan Dinas, 6503=Konsultan, 6504=Asuransi
BEBAN NON-OP: 6601=Beban Bunga, 6602=Adm Bank, 6604=PPh Badan, 6701=Lain-lain

CONTOH RESPONS LENGKAP:
User: "beli mesin Rp500jt DP Rp100jt tunai sisanya utang bank, residu 50jt umur 5 tahun pakai DDB"

[Berikan penjelasan jurnal dan perhitungan penyusutan DDB lengkap...]

<ACTIONS>
[
  {"type":"addJurnal","tanggal":"2026-04-30","ket":"Pembelian mesin cetak","jenis":"Manual","lines":[{"akun":"1501","ket":"Peralatan-Mesin","debit":500000000,"kredit":0},{"akun":"1101","ket":"Kas-DP","debit":0,"kredit":100000000},{"akun":"2201","ket":"Utang Bank","debit":0,"kredit":400000000}]},
  {"type":"fillKalkPenyusutan","cost":500000000,"sisa":50000000,"umur":5,"metode":"saldo-menurun","nama":"Mesin Cetak"},
  {"type":"navigate","page":"kalk-penyusutan"},
  {"type":"showAlert","msg":"Jurnal & kalkulator penyusutan sudah diisi otomatis!"}
]
</ACTIONS>

KEMAMPUAN KALKULASI PENUH (tampilkan langkah-langkah):
- Penyusutan: GL, DDB, SYD, Unit Produksi
- Pajak: PPh 21 progresif 5 lapisan, PPh 23, PPh Badan, PPN 12%
- Keuangan: PV, FV, NPV, IRR, anuitas, bunga flat/efektif/majemuk
- Analisis: semua rasio keuangan + interpretasi + benchmark
- Persediaan: FIFO, LIFO, WA, MWA
- BEP, CM, MOS, DOL, bauran produk
- PSAK yang relevan selalu disebut

${getAppContext()}`;

  try {
    const messages = [
      ...aiHistory.slice(0, -1).map(h => ({role: h.role, content: h.content})),
      { role: 'user', content: msg }
    ];

    const rawText = await callAIWithRotation(systemPrompt, messages);

    // Remove loading
    loadingDiv.remove();

    // Strip <ACTIONS> block from display text, execute separately
    const actionsMatch = rawText.match(/<ACTIONS>\s*([\s\S]*?)\s*<\/ACTIONS>/i);
    const displayText = rawText.replace(/<ACTIONS>[\s\S]*?<\/ACTIONS>/gi, '').trim();

    // Format and display AI response (without action block)
    const formatted = formatAIResponse(displayText);
    const botDiv = appendMsg('bot', formatted);

    // Execute actions if present
    if(actionsMatch) {
      try {
        const actions = JSON.parse(actionsMatch[1].trim());

        // Count journal actions
        const jurnalActions = actions.filter(a => a.type === 'addJurnal');
        const otherActions = actions.filter(a => a.type !== 'addJurnal');

        // Custom confirm dialog (no browser confirm)

        // Show confirmation only for journal actions
        let proceed = true;
        if(jurnalActions.length > 0) {
          proceed = await showAIConfirm(jurnalActions, otherActions);
        }

        if(!proceed) {
          const cancelDiv = document.createElement('div');
          cancelDiv.style.cssText = 'margin-top:10px;padding:8px 12px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:8px;font-size:12.5px;color:var(--muted);';
          cancelDiv.textContent = '↩ Aksi dibatalkan. Jurnal tidak disimpan.';
          botDiv.querySelector('.ai-bubble').appendChild(cancelDiv);
        } else {
          const results = await executeAIActions(actions);
          if(results.length > 0) {
            const execDiv = document.createElement('div');
            execDiv.style.cssText = 'margin-top:12px;padding:10px 12px;background:rgba(74,222,128,0.07);border:1px solid rgba(74,222,128,0.25);border-radius:8px;';
            execDiv.innerHTML = '<div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;"><i class="ti ti-target" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Aksi Dieksekusi Otomatis</div>'
              + results.map(r => '<div style="font-size:12.5px;padding:3px 0;color:var(--text);">'+r+'</div>').join('');
            botDiv.querySelector('.ai-bubble').appendChild(execDiv);
          }
        }
      } catch(e) {
        console.warn('Action parse error:', e, actionsMatch[1]);
        // fallback: show manual buttons if journal detected in text
        if(rawText.match(/debit|kredit/i) && rawText.match(/rp[\s\d]/i)) {
          const parsed = parseJurnalFromAI(rawText);
          if(parsed && parsed.lines.length >= 2) {
            const fb = document.createElement('div');
            fb.style.cssText = 'margin-top:10px;padding-top:10px;border-top:1px solid var(--border);';
            fb.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">Simpan jurnal:</div>'
              + '<button class="ai-action-btn" onclick="saveJurnalFromAI('+JSON.stringify(parsed).replace(/"/g,'&quot;')+')" ><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan ke Sistem</button>';
            botDiv.querySelector('.ai-bubble').appendChild(fb);
          }
        }
      }
    }

    aiHistory.push({ role: 'assistant', content: rawText });

  } catch(err) {
    loadingDiv.remove();
    let errMsg = err.message || 'Unknown error';
    let hint = '';
    if(errMsg.includes('fetch') || errMsg.includes('NetworkError') || errMsg.includes('Failed to fetch')) {
      hint = '<br><small style="color:var(--muted)">Pastikan koneksi internet aktif. Jika masalah berlanjut, coba refresh halaman dan buka kembali file ini melalui Claude.ai.</small>';
    } else if(errMsg.includes('401') || errMsg.includes('403')) {
      hint = '<br><small style="color:var(--muted)">Sesi habis. Silakan refresh halaman dan buka kembali melalui Claude.ai.</small>';
    } else if(errMsg.includes('429')) {
      hint = '<br><small style="color:var(--muted)">Terlalu banyak permintaan. Tunggu beberapa detik lalu coba lagi.</small>';
    } else if(errMsg.includes('500') || errMsg.includes('503')) {
      hint = '<br><small style="color:var(--muted)">Server AI sedang sibuk. Coba lagi dalam beberapa detik.</small>';
    }
    appendMsg('bot', `<span style="color:var(--red);">❌ ${errMsg}</span>${hint}`);
  }

  aiThinking = false;
  document.getElementById('ai-send-btn').disabled = false;
  document.getElementById('ai-send-btn').textContent = 'Kirim ↑';
}

function addQuickBtn(div, label, fn) {
  const existing = div.querySelector('.ai-action-btn');
  if(existing) return; // already has actions
  const btn = document.createElement('button');
  btn.className = 'ai-action-btn';
  btn.style.marginTop = '10px';
  btn.textContent = label;
  btn.onclick = fn;
  div.querySelector('.ai-bubble').appendChild(btn);
}

function formatAIResponse(text) {
  // Convert markdown-like to HTML — dibuat supaya balasan AI (yang sering
  // pakai heading, tabel, rumus, list, dst seperti kebiasaan AI pada umumnya)
  // tampil rapi, bukan simbol mentah (####, ---, |...|, $$...$$).
  let html = escapeHtml(text);

  // Fenced code block ```...```
  html = html.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, (m, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Tabel markdown: baris header | col | col |, baris pemisah |---|---|, lalu baris data
  html = html.replace(/((?:^\|.*\|[ \t]*$\n?)+)/gm, (block) => {
    const lines = block.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2 || !/^\|?[\s:|-]+\|?$/.test(lines[1])) return block;
    const parseRow = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
    const head = parseRow(lines[0]);
    const rows = lines.slice(2).map(parseRow);
    let t = '<table class="ai-table"><thead><tr>' + head.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    rows.forEach(r => { t += '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>'; });
    t += '</tbody></table>';
    return t;
  });

  // Rumus ala LaTeX $$...$$ (blok) dan $...$ (inline) — disederhanakan jadi teks
  // terbaca, bukan kode LaTeX mentah, karena app ini tidak pakai renderer math.
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, expr) => {
    const clean = expr.replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
      .replace(/\\le/g, '≤').replace(/\\ge/g, '≥').replace(/\\ne/g, '≠')
      .replace(/\\\\/g, ' ').trim();
    return `<div class="ai-formula">${clean}</div>`;
  });
  html = html.replace(/\$([^$\n]+)\$/g, (m, expr) => {
    const clean = expr.replace(/\\text\{([^}]*)\}/g, '$1').trim();
    return `<code>${clean}</code>`;
  });

  // Headers #### ### ## #
  html = html.replace(/^####\s+(.+)$/gm, '<div class="ai-h4">$1</div>');
  html = html.replace(/^###\s+(.+)$/gm, '<div class="ai-h3">$1</div>');
  html = html.replace(/^##\s+(.+)$/gm, '<div class="ai-h2">$1</div>');
  html = html.replace(/^#\s+(.+)$/gm, '<div class="ai-h1">$1</div>');

  // Garis pemisah ---
  html = html.replace(/^(?:---+|\*\*\*+|___+)\s*$/gm, '<hr class="ai-hr">');

  // Blockquote >
  html = html.replace(/^&gt;\s?(.+)$/gm, '<div class="ai-quote">$1</div>');

  // Jurnal block: baris dengan pola Dr/Kr (bukan bagian dari tabel — cek "|")
  html = html.replace(/((?:^\s*(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s[^\n|]*\n?)+)/gim, (match) => {
    const lines = match.trim().split('\n').map(l => {
      const isDr = /^(Dr\.?|Debit|Debet)/i.test(l.trim());
      return `<div class="${isDr?'dr':'kr'}">${l.trim()}</div>`;
    }).join('');
    return `<div class="jurnal-preview">${lines}</div>`;
  });

  // Bullet list (- • *) — dikelompokkan jadi satu <ul>, bukan div lepas-lepas
  html = html.replace(/(?:^[-•*]\s.+$\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^[-•*]\s/, ''));
    return '<ul class="ai-list">' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
  });
  // Numbered list — dikelompokkan jadi satu <ol>
  html = html.replace(/(?:^\d+\.\s.+$\n?)+/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\.\s/, ''));
    return '<ol class="ai-list">' + items.map(i => `<li>${i}</li>`).join('') + '</ol>';
  });

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // Italic *text*
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
  // Code `text`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Link [teks](url)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function saveJurnalFromAI(parsed) {
  if(!parsed || !parsed.lines) return;
  addJurnal(parsed);
  showAlert('✓ Jurnal dari AI berhasil disimpan!');
  showPage('jurnal-umum');
}

// TUTORIAL SYSTEM v2 — MODULAR

// Tutorial step data per modul
const TUT_MODULES = {

  'pengenalan': {
    title: 'Pengenalan Bayu Harlan Priangga', icon: '→',
    steps: [
      { icon:'→', title:'Selamat Datang di Bayu Harlan Priangga!',
        body:'Bayu Harlan Priangga adalah software akuntansi lengkap yang bisa kamu gunakan langsung dari browser. Tidak perlu install apapun!\n\nDi tutorial ini kamu akan mengenal tampilan dan cara berpindah antar menu.',
        target: null },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Sidebar — Pusat Navigasi',
        body:'Lihat panel di sebelah kiri — itu namanya <b>Sidebar</b>. Semua menu ada di sana, dikelompokkan:\n\n• <b>Utama</b> — Dashboard & Transaksi\n• <b>Jurnal</b> — Catatan transaksi\n• <b>Laporan</b> — Laporan keuangan\n• <b>Kalkulator</b> — Alat hitung\n• <b>AI Assistant</b> — Asisten pintar\n• <b>Tutorial</b> — Kamu sedang di sini!',
        target: '#sidebar', highlight: true },
      { icon:'📱', title:'Di HP? Gunakan Tombol <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg>',
        body:'Kalau kamu buka Bayu Harlan Priangga di handphone, sidebar tidak terlihat secara default.\n\nTap tombol <b><svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg> (tiga garis)</b> di pojok kiri atas untuk membuka sidebar. Setelah pilih menu, sidebar otomatis menutup sendiri.',
        target: '.hamburger', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Dashboard — Ringkasan Keuangan',
        body:'<b>Dashboard</b> adalah halaman utama yang langsung tampil saat buka Bayu Harlan Priangga.\n\nDi sini kamu bisa lihat:\n• Total Aset bisnis kamu\n• Total Pendapatan bulan ini\n• Total Beban bulan ini\n• Laba Bersih\n• Transaksi terbaru\n• Ringkasan saldo akun utama',
        target: '#page-dashboard', navTo: 'dashboard' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Berpindah Halaman',
        body:'Cukup klik menu di sidebar — halaman langsung berganti tanpa refresh browser.\n\nMenu yang sedang aktif ditandai dengan warna hijau dan garis di sisi kiri.\n\nSemua data tersimpan sementara selama sesi browser kamu terbuka.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Siap Menjelajah!',
        body:'Sekarang kamu sudah tahu cara navigasi Bayu Harlan Priangga.\n\n<b>Lanjutkan dengan tutorial:</b>\n• <i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Mencatat Pemasukan Kas\n• <i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mencatat Penjualan\n• <i class="ti ti-chart-bar ti-inline"></i> Membaca Laporan Keuangan\n\nAtau langsung eksplorasi sendiri — jika bingung, tanya <b>Orias Assisten</b>!',
        target: null }
    ]
  },

  'konsep-akuntansi': {
    title: 'Konsep Dasar Akuntansi', icon: '<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Apa itu Akuntansi?',
        body:'Akuntansi adalah cara <b>mencatat, mengelompokkan, dan meringkas</b> semua kejadian keuangan bisnis.\n\nBayangkan kamu punya buku catatan keuangan yang rapi — itulah akuntansi. Bedanya, Bayu Harlan Priangga melakukannya secara otomatis!',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v16l-5-2.5L5 20V4zm9 0h2a2 2 0 012 2v16l-4-2"/></svg>', title:'Akun — Tempat Menyimpan Catatan',
        body:'<b>Akun</b> adalah "laci" untuk menyimpan catatan jenis transaksi tertentu.\n\nContoh akun:\n• <b>Kas</b> — catatan semua uang tunai masuk keluar\n• <b>Penjualan</b> — catatan semua pendapatan\n• <b>Beban Gaji</b> — catatan semua pengeluaran gaji\n• <b>Piutang</b> — catatan tagihan yang belum dibayar pelanggan\n\nLihat semua akun di menu <b>Chart of Accounts</b>.',
        target: '.nav-item[onclick*="akun"]', highlight: true },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Debit dan Kredit',
        body:'Ini konsep paling penting! Setiap transaksi selalu punya dua sisi:\n\n<b>DEBIT (Dr)</b> = sisi kiri\n<b>KREDIT (Kr)</b> = sisi kanan\n\nAturannya:\n• Aset naik → Debit\n• Aset turun → Kredit\n• Beban naik → Debit\n• Pendapatan naik → Kredit\n• Liabilitas/Ekuitas naik → Kredit\n\nTotal Debit <b>SELALU HARUS SAMA</b> dengan total Kredit.',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>', title:'Jurnal — Catatan Tiap Transaksi',
        body:'<b>Jurnal</b> adalah catatan resmi setiap transaksi keuangan.\n\nContoh: Kamu bayar listrik Rp 500.000 tunai\n\n<code>Dr. Beban Listrik   Rp 500.000\n  Kr. Kas             Rp 500.000</code>\n\nArtinya: beban listrik bertambah (Dr), kas berkurang (Kr).\n\nBayu Harlan Priangga membuat jurnal ini <b>otomatis</b> saat kamu input transaksi!',
        target: null },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'5 Jenis Akun',
        body:'Semua akun dikelompokkan jadi 5 tipe:\n\n🟢 <b>Aset</b> — apa yang dimiliki bisnis (kas, mesin, gedung)\n🔴 <b>Liabilitas</b> — hutang bisnis (utang bank, utang usaha)\n🔵 <b>Ekuitas</b> — modal pemilik\n🟡 <b>Pendapatan</b> — uang masuk dari penjualan/jasa\n🟠 <b>Beban</b> — pengeluaran operasional\n\nRumus dasar: <b>Aset = Liabilitas + Ekuitas</b>',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Konsep Sudah Paham!',
        body:'Kamu sudah mengerti konsep dasar akuntansi.\n\nIngat intinya:\n• Setiap transaksi = Debit + Kredit\n• Total Debit = Total Kredit (selalu!)\n• Bayu Harlan Priangga otomatis buatkan jurnal yang benar\n\nLanjut ke tutorial <b>Mencatat Pemasukan Kas</b> untuk praktek langsung!',
        target: null }
    ]
  },

  'chart-of-accounts': {
    title: 'Chart of Accounts', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Apa itu Chart of Accounts?',
        body:'<b>Chart of Accounts (CoA)</b> adalah daftar lengkap semua akun yang digunakan perusahaan.\n\nIbaratnya seperti daftar isi buku catatan keuangan — setiap akun punya nomor kode dan nama yang unik.',
        target: '.nav-item[onclick*="akun"]', navTo: 'akun' },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Kode Akun',
        body:'Setiap akun punya <b>kode unik</b> berupa angka:\n\n• <b>1xxx</b> = Aset (1101 = Kas, 1201 = Piutang...)\n• <b>2xxx</b> = Liabilitas (2101 = Utang Usaha...)\n• <b>3xxx</b> = Ekuitas (3101 = Modal...)\n• <b>4xxx</b> = Pendapatan (4101 = Penjualan...)\n• <b>5xxx+</b> = Beban (6101 = Beban Gaji...)\n\nUrutan angka memudahkan pengelompokan laporan.',
        target: '#akun-body', highlight: true },
      { icon:'+', title:'Menambah Akun Baru',
        body:'Akun bawaan sudah mencakup kebutuhan umum, tapi kamu bisa tambah akun sesuai bisnis.\n\nContoh tambahan yang sering dibutuhkan:\n• Beban Transportasi\n• Pendapatan Bunga Bank\n• Uang Muka Pelanggan\n• Beban Perbaikan & Perawatan\n\nKlik tombol <b>"+ Tambah Akun"</b> di kanan atas.',
        target: 'button[onclick*="openModalAkun"]', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Isi Form Akun Baru',
        body:'Saat tambah akun baru, isi:\n\n• <b>Kode Akun</b> — angka unik, ikuti pola (misal 6106 untuk beban baru)\n• <b>Nama Akun</b> — nama jelas dan spesifik\n• <b>Tipe</b> — pilih: Aset/Liabilitas/Ekuitas/Pendapatan/Beban\n• <b>Kategori</b> — misal: Lancar, Tetap, Operasional\n\nSaldo normal (Debit/Kredit) ditentukan otomatis berdasarkan tipe.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Chart of Accounts Siap!',
        body:'Sekarang kamu tahu cara mengelola daftar akun.\n\n<b>Tips:</b>\n• Jangan terlalu banyak akun — cukup yang dibutuhkan\n• Nama akun harus jelas dan konsisten\n• Jangan ubah kode akun yang sudah dipakai di jurnal\n\nLanjut ke tutorial mencatat transaksi!',
        target: null }
    ]
  },

  'catat-kas-masuk': {
    title: 'Mencatat Pemasukan Kas', icon: '<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', title:'Apa itu Pemasukan Kas?',
        body:'Pemasukan kas adalah semua uang tunai yang masuk ke bisnis:\n\n💰 Modal yang disetor pemilik\n🛍️ Pembayaran dari pelanggan\n📬 Pelunasan piutang\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Pendapatan jasa\n\nSetiap pemasukan kas harus dicatat agar laporan keuangan akurat.',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Kas',
        body:'Di halaman Transaksi, ada 4 tab di bagian atas:\n\n• <b>Penerimaan/Pengeluaran Kas</b> ← ini yang kita pakai\n• Penjualan\n• Pembelian\n• Jurnal Manual\n\nTab <b>Kas</b> sudah aktif secara default saat buka halaman Transaksi.',
        target: '#trx-kas', highlight: true },
      { icon:'↔', title:'Pilih Jenis: Penerimaan',
        body:'Di dropdown <b>Jenis</b>, pilih:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Penerimaan Kas</b> — untuk uang MASUK\n❌ Pengeluaran Kas — untuk uang keluar\n\nJika pilih Penerimaan Kas, jurnal yang dibuat:\n<code>Dr. Kas (bertambah)\n  Kr. [Akun Lawan] (misal Modal/Pendapatan)</code>',
        target: '#kas-jenis', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Akun Lawan — Dari Mana Uangnya?',
        body:'<b>Akun Lawan</b> adalah sumber uang yang masuk. Pilih sesuai asal uangnya:\n\n• Dari modal pemilik → pilih <b>Modal Pemilik</b>\n• Dari pendapatan jasa → pilih <b>Pendapatan Jasa</b>\n• Dari pelunasan piutang → pilih <b>Piutang Usaha</b>\n• Dari pinjaman bank → pilih <b>Utang Bank</b>',
        target: '#kas-akun-lawan', highlight: true },
      { icon:'💰', title:'Isi Jumlah & Keterangan',
        body:'• <b>Jumlah</b> — isi angka tanpa titik/koma (contoh: 5000000 untuk Rp 5.000.000)\n• <b>Keterangan</b> — deskripsi singkat yang jelas\n\nContoh keterangan yang baik:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Modal awal dari pemilik"\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Pelunasan piutang Pak Ahmad"\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Pendapatan jasa konsultasi"\n\nHindari keterangan tidak jelas seperti "uang masuk" saja.',
        target: '#kas-jumlah', highlight: true },
      { icon:'👁️', title:'Preview Jurnal Sebelum Simpan',
        body:'Sebelum simpan, klik tombol <b>"Preview Jurnal"</b> untuk melihat jurnal yang akan dibuat.\n\nIni penting untuk memastikan:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun sudah benar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jumlah debit = kredit\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada salah pilih\n\nJika sudah benar, klik <b>"Simpan & Buat Jurnal"</b>.',
        target: 'button[onclick*="previewKas"]', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Berhasil Mencatat Pemasukan!',
        body:'Setelah simpan, transaksi otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masuk ke Jurnal Umum\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masuk ke Jurnal Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui saldo akun Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui Laporan Keuangan\n\nCek hasilnya di menu <b>Jurnal Kas</b> untuk melihat saldo kas terkini!',
        target: null }
    ]
  },

  'catat-kas-keluar': {
    title: 'Mencatat Pengeluaran Kas', icon: '💸',
    steps: [
      { icon:'💸', title:'Apa itu Pengeluaran Kas?',
        body:'Pengeluaran kas adalah semua uang tunai yang keluar dari bisnis:\n\n💡 Bayar listrik, air, internet\n👥 Bayar gaji karyawan\n🏠 Bayar sewa tempat\n<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Beli perlengkapan kantor\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Cicilan pinjaman\n\nSemua harus dicatat agar tidak ada pengeluaran yang "hilang".',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'↔', title:'Pilih Jenis: Pengeluaran',
        body:'Di dropdown <b>Jenis</b>, pilih:\n\n❌ Penerimaan Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Pengeluaran Kas</b> ← pilih ini\n\nJika pilih Pengeluaran Kas, jurnal yang dibuat:\n<code>Dr. [Akun Lawan] (beban/aset bertambah)\n  Kr. Kas (kas berkurang)</code>',
        target: '#kas-jenis', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Akun Lawan — Untuk Apa Uangnya?',
        body:'<b>Akun Lawan</b> adalah tujuan pengeluaran. Pilih sesuai peruntukannya:\n\n• Bayar listrik → <b>Beban Listrik & Air</b>\n• Bayar gaji → <b>Beban Gaji</b>\n• Bayar sewa → <b>Beban Sewa</b>\n• Beli perlengkapan → <b>Perlengkapan</b>\n• Bayar utang → <b>Utang Usaha / Utang Bank</b>\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jangan salah pilih akun — ini menentukan laporan laba rugi!',
        target: '#kas-akun-lawan', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Bedakan: Beban vs Aset',
        body:'Ada 2 jenis pengeluaran yang berbeda pencatatannya:\n\n<b>1. BEBAN (langsung jadi biaya)</b>\nContoh: listrik, gaji, sewa bulan ini\n→ Pilih akun "Beban ..." → langsung kurangi laba\n\n<b>2. ASET (jadi milik perusahaan)</b>\nContoh: beli komputer, kendaraan, peralatan\n→ Pilih akun "Peralatan" → jadi aset, lalu disusutkan\n\nIni sering membingungkan pemula — jika ragu, tanya Orias Assisten!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Pengeluaran Tercatat!',
        body:'Setelah simpan, sistem otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mengurangi saldo Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menambah saldo akun Beban\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui Laporan Laba Rugi\n\n<b>Tips penting:</b>\nSelalu catat pengeluaran di hari yang sama — jangan ditumpuk. Makin telat dicatat, makin mudah terlupa!',
        target: null }
    ]
  },

  'catat-penjualan': {
    title: 'Mencatat Penjualan', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Mencatat Transaksi Penjualan',
        body:'Penjualan adalah pendapatan utama bisnis. Di Bayu Harlan Priangga, ada 2 jenis penjualan:\n\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Penjualan Tunai</b> — pelanggan bayar langsung\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Penjualan Kredit</b> — pelanggan bayar nanti (piutang)\n\nKeduanya punya jurnal berbeda!',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Penjualan',
        body:'Klik tab <b>"Penjualan"</b> di halaman Transaksi.\n\nKamu akan melihat form dengan kolom:\n• Tanggal\n• No. Invoice\n• Metode Pembayaran\n• Jumlah Penjualan\n• HPP (Harga Pokok)\n• Keterangan',
        target: '.tab[onclick*="penjualan"]', highlight: true },
      { icon:'📄', title:'No. Invoice',
        body:'<b>Nomor Invoice</b> adalah nomor dokumen penjualan yang diberikan ke pelanggan.\n\nFormat umum: INV-001, INV-2024/001, atau sesuai format perusahaan.\n\nFungsinya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Referensi untuk tracking pembayaran\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bukti transaksi yang sah\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memudahkan rekonsiliasi',
        target: '#jual-inv', highlight: true },
      { icon:'<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Penjualan Tunai vs Kredit',
        body:'Pilih metode pembayaran:\n\n<b>Tunai (Kas)</b>\nPelanggan bayar langsung.\nJurnal: Dr. Kas — Kr. Penjualan\n\n<b>Kredit (Piutang)</b>\nPelanggan bayar nanti.\nJurnal: Dr. Piutang Usaha — Kr. Penjualan\n\nNanti saat piutang dilunasi, catat lagi via tab Kas: penerimaan kas, akun lawan = Piutang Usaha.',
        target: '#jual-metode', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', title:'Pilih Produk — HPP Otomatis',
        body:'<b>Pilih Produk</b> dari kartu stock persediaan.\n\nSaat produk dipilih, sistem otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mengisi <b>harga jual</b> sesuai Master Produk\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menghitung <b>HPP otomatis</b> dari kartu stock (FIFO/LIFO/WA)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Membuat <b>jurnal HPP + persediaan keluar</b> secara otomatis\n\nTidak perlu isi HPP manual — sistem sudah mendeteksi dari persediaan.',
        target: '#jual-produk-btn', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Otomatis Masuk ke Laporan',
        body:'Setelah simpan penjualan, data langsung masuk ke:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Jurnal Penjualan</b> — daftar semua transaksi jual\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Laporan Laba Rugi</b> — menambah pendapatan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Neraca</b> — menambah kas/piutang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Dashboard</b> — update angka ringkasan\n\nSemua laporan otomatis — tidak perlu isi manual!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Penjualan Berhasil Dicatat!',
        body:'Kamu sudah tahu cara mencatat penjualan.\n\n<b>Ingat perbedaannya:</b>\n• Penjualan tunai → kas langsung bertambah\n• Penjualan kredit → piutang bertambah dulu\n• HPP → otomatis kurangi persediaan\n\nCek di menu <b>Jurnal Penjualan</b> untuk lihat semua transaksi jual!',
        target: null }
    ]
  },

  'catat-pembelian': {
    title: 'Mencatat Pembelian', icon: '<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>', title:'Mencatat Transaksi Pembelian',
        body:'Pembelian perlu dicatat untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menambah stok persediaan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mencatat aset baru\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melacak utang usaha\n\nAda 2 jenis: <b>Tunai</b> (bayar langsung) dan <b>Kredit</b> (hutang dulu).',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Pembelian',
        body:'Klik tab <b>"Pembelian"</b> di halaman Transaksi.\n\nForm yang tersedia:\n• Tanggal & No. Faktur\n• Metode (Tunai/Kredit)\n• Jumlah Pembelian\n• Akun Beban/Aset\n• Keterangan',
        target: '.tab[onclick*="pembelian"]', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Pilih Akun yang Tepat',
        body:'Ini bagian paling penting! Pilih akun sesuai apa yang dibeli:\n\n<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Beli stok/barang dagangan → <b>Persediaan Barang</b>\n🖥️ Beli komputer/mesin → <b>Peralatan</b>\n📄 Beli ATK/perlengkapan → <b>Perlengkapan</b>\n💊 Beli bahan baku → <b>Persediaan Barang</b>\n\nPilih akun yang salah → laporan keuangan jadi tidak akurat.',
        target: '#beli-akun', highlight: true },
      { icon:'<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Tunai vs Kredit (Hutang)',
        body:'<b>Pembelian Tunai</b>\nBayar langsung dengan kas.\nJurnal: Dr. [Aset/Beban] — Kr. Kas\n\n<b>Pembelian Kredit</b>\nBayar nanti (jadi hutang ke supplier).\nJurnal: Dr. [Aset/Beban] — Kr. Utang Usaha\n\nNanti saat bayar hutang ke supplier:\n→ Catat via tab Kas: pengeluaran kas, akun lawan = Utang Usaha.',
        target: '#beli-metode', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'No. Faktur Supplier',
        body:'<b>No. Faktur</b> adalah nomor dokumen dari supplier.\n\nPenting untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bukti pembelian resmi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dasar klaim jika ada masalah\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Referensi saat bayar hutang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Keperluan perpajakan (Faktur Pajak PPN)\n\nSimpan fisik faktur supplier — cocokkan dengan catatan di sistem.',
        target: '#beli-faktur', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Pembelian Tercatat!',
        body:'Setelah simpan, otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Stok/aset bertambah di neraca\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kas berkurang (jika tunai)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Utang usaha bertambah (jika kredit)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal Pembelian terupdate\n\nCek menu <b>Jurnal Pembelian</b> untuk lihat semua riwayat beli!',
        target: null }
    ]
  },

  'jurnal-manual': {
    title: 'Jurnal Manual', icon: '<i class="ti ti-pencil" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<i class="ti ti-pencil" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Kapan Pakai Jurnal Manual?',
        body:'Jurnal Manual digunakan untuk transaksi yang tidak tersedia di tab cepat:\n\n<i class="ti ti-adjustments" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Jurnal penyesuaian (penyusutan, akrual)\n💱 Koreksi kesalahan pencatatan\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Transfer antar akun\n<i class="ti ti-clipboard-list ti-inline"></i> Transaksi kompleks (banyak akun sekaligus)\n🗂️ Pembebanan biaya ke beberapa departemen',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Buka Tab Jurnal Manual',
        body:'Klik tab <b>"Jurnal Manual"</b> di halaman Transaksi.\n\nKamu akan melihat:\n• Kolom Tanggal & No. Jurnal\n• Kolom Keterangan jurnal\n• Tabel baris debit/kredit\n• Tombol "+ Tambah Baris"\n• Indikator balance otomatis',
        target: '.tab[onclick*="umum"]', highlight: true },
      { icon:'🧱', title:'Cara Kerja Baris Jurnal',
        body:'Setiap baris jurnal punya 4 kolom:\n\n1. <b>Akun</b> — pilih dari daftar akun\n2. <b>Keterangan</b> — deskripsi baris ini\n3. <b>Debit</b> — isi angka jika akun di-Debit\n4. <b>Kredit</b> — isi angka jika akun di-Kredit\n\nSetiap baris hanya isi SALAH SATU: debit ATAU kredit, bukan keduanya.',
        target: '#manual-lines', highlight: true },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Validasi Balance Otomatis',
        body:'Di bawah tabel ada indikator balance real-time:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b style="color:#4ade80">Balance</b> — total debit = total kredit, aman disimpan\n❌ <b style="color:#f87171">Tidak Balance</b> — ada selisih, tidak bisa disimpan\n\nIni fitur pengaman agar tidak ada jurnal salah masuk ke sistem.\n\nJika tidak balance, periksa: ada angka yang kurang? akun yang tertukar?',
        target: '#manual-balance', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>', title:'Contoh: Jurnal Penyesuaian Penyusutan',
        body:'Contoh jurnal penyusutan mesin Rp 1.000.000/tahun:\n\n<b>Baris 1:</b>\nAkun: Beban Penyusutan\nDebit: 1.000.000\nKredit: (kosong)\n\n<b>Baris 2:</b>\nAkun: Akumulasi Penyusutan\nDebit: (kosong)\nKredit: 1.000.000\n\n→ Total Debit = Total Kredit = Balance ✓',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Jurnal Manual Siap Digunakan!',
        body:'Sekarang kamu bisa input jurnal apapun dengan bebas.\n\n<b>Tips:</b>\n• Klik "Tambah Baris" untuk jurnal dengan banyak akun\n• Isi keterangan yang jelas di setiap baris\n• Gunakan Preview/cek balance sebelum simpan\n• Jika bingung jurnalnya, tanya <b>Orias Assisten</b> — dia langsung kasih format jurnalnya!',
        target: null }
    ]
  },

  'jurnal-laporan': {
    title: 'Membaca Jurnal & Buku Besar', icon: '<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM10 3v18M3 8h3M3 12h3M3 16h3"/></svg>', title:'Jurnal — Rekaman Semua Transaksi',
        body:'Bayu Harlan Priangga punya 4 jenis jurnal khusus:\n\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Umum</b> — semua transaksi dalam satu tampilan\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Kas</b> — khusus mutasi uang kas\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Penjualan</b> — khusus transaksi jual\n<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Pembelian</b> — khusus transaksi beli\n\nSetiap transaksi yang kamu input otomatis masuk ke jurnal yang sesuai.',
        target: '.nav-item[onclick*="jurnal-umum"]', navTo: 'jurnal-umum' },
      { icon:'🔍', title:'Filter & Pencarian di Jurnal Umum',
        body:'Di Jurnal Umum ada 2 alat untuk menemukan transaksi:\n\n🔍 <b>Kotak Pencarian</b> — ketik kata kunci dari keterangan transaksi\n📁 <b>Filter Jenis</b> — tampilkan hanya Kas / Penjualan / Pembelian / Manual\n\nContoh: ketik "listrik" → tampil semua transaksi yang keterangannya mengandung kata "listrik".',
        target: '#filter-ju', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', title:'Jurnal Kas — Running Balance',
        body:'Jurnal Kas spesial karena ada kolom <b>Saldo Berjalan</b> — saldo kas setelah setiap transaksi.\n\nKamu bisa lihat:\n• Kapan saldo kas terendah\n• Apakah ada anomali (saldo minus = ada masalah)\n• Total penerimaan dan pengeluaran di bagian bawah\n\nIni sangat berguna untuk memantau arus kas harian.',
        target: '.nav-item[onclick*="jurnal-kas"]', navTo: 'jurnal-kas' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v16l-5-2.5L5 20V4zm9 0h2a2 2 0 012 2v16l-4-2"/></svg>', title:'Buku Besar — Detail Per Akun',
        body:'<b>Buku Besar</b> menampilkan semua mutasi untuk SATU akun spesifik.\n\nCara menggunakan:\n1. Buka menu Buku Besar\n2. Pilih akun dari dropdown (misal: Kas, Piutang, Penjualan)\n3. Sistem tampilkan semua transaksi yang menyentuh akun itu\n4. Ada kolom Saldo yang selalu update\n\nBuku Besar sangat berguna untuk rekonsiliasi dan audit.',
        target: '.nav-item[onclick*="buku-besar"]', navTo: 'buku-besar' },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Bisa Baca Jurnal & Buku Besar!',
        body:'Sekarang kamu tahu cara:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melihat semua transaksi di Jurnal Umum\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Filter dan cari jurnal tertentu\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memantau arus kas di Jurnal Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melihat detail mutasi per akun di Buku Besar\n\nLanjut ke tutorial <b>Membaca Neraca Saldo</b>!',
        target: null }
    ]
  },

  'neraca-saldo': {
    title: 'Neraca Saldo', icon: '<i class="ti ti-scale ti-inline"></i>',
    steps: [
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Apa itu Neraca Saldo?',
        body:'<b>Neraca Saldo</b> adalah daftar semua akun beserta saldonya dalam kolom Debit dan Kredit.\n\nFungsinya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memastikan semua jurnal sudah benar (debit = kredit)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lihat saldo terkini semua akun dalam satu halaman\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dasar penyusunan laporan keuangan final',
        target: '.nav-item[onclick*="neraca-saldo"]', navTo: 'neraca-saldo' },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Membaca Neraca Saldo',
        body:'Neraca saldo punya kolom:\n• <b>Kode & Nama Akun</b>\n• <b>Tipe</b> (Aset/Liabilitas/dll)\n• <b>Debit</b> — saldo normal debit\n• <b>Kredit</b> — saldo normal kredit\n\nDi baris terakhir ada <b>TOTAL</b> — jumlah total debit harus = total kredit.\n\nJika tidak sama → ada jurnal yang salah.',
        target: '#neraca-saldo-body', highlight: true },
      { icon:'🎯', title:'Saldo Normal Setiap Akun',
        body:'Setiap tipe akun punya saldo normal:\n\n🟢 <b>Aset</b> → saldo normal Debit (bertambah jika Dr)\n🔴 <b>Liabilitas</b> → saldo normal Kredit (bertambah jika Kr)\n🔵 <b>Ekuitas</b> → saldo normal Kredit\n🟡 <b>Pendapatan</b> → saldo normal Kredit\n🟠 <b>Beban</b> → saldo normal Debit\n\nJika ada akun yang saldonya di sisi berlawanan, mungkin ada koreksi yang perlu dilakukan.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Neraca Saldo Dipahami!',
        body:'Ingat yang penting:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Total Debit = Total Kredit → jurnal sudah benar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Neraca saldo otomatis update saat tambah transaksi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jika ada selisih, cari jurnal yang tidak balance\n\nLanjut ke <b>Laporan Laba Rugi</b>!',
        target: null }
    ]
  },

  'laba-rugi': {
    title: 'Laporan Laba Rugi', icon: '<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Laporan Laba Rugi',
        body:'<b>Laporan Laba Rugi</b> menjawab pertanyaan: "<b>Apakah bisnis saya untung atau rugi?</b>"\n\nDibuat dari semua akun Pendapatan dan Beban yang ada di jurnal. Di Bayu Harlan Priangga, laporan ini otomatis — tidak perlu input manual!',
        target: '.nav-item[onclick*="laba-rugi"]', navTo: 'laba-rugi' },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Struktur Laporan Laba Rugi',
        body:'Laporan Laba Rugi tersusun dari atas ke bawah:\n\n<b>1. Pendapatan</b>\n+ Penjualan barang/jasa\n= Total Pendapatan\n\n<b>2. HPP (Harga Pokok Penjualan)</b>\n- Biaya barang/bahan yang terjual\n= <b>Laba Kotor</b>\n\n<b>3. Beban Operasional</b>\n- Gaji, sewa, listrik, dll\n= <b>Laba Bersih</b>',
        target: '#laba-rugi-content', highlight: true },
      { icon:'📉', title:'Memahami Angka',
        body:'Cara baca hasil:\n\n🟢 <b>Laba Kotor tinggi</b> — margin produk bagus\n🔴 <b>Laba Kotor rendah</b> — harga jual terlalu murah atau HPP terlalu mahal\n\n🟢 <b>Laba Bersih positif</b> — bisnis untung!\n🔴 <b>Laba Bersih negatif</b> — bisnis rugi, beban > pendapatan\n\nIngin analisis lebih dalam? Tanya <b>Orias Assisten</b> untuk insight dan rekomendasi!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Laporan Laba Rugi Siap Dibaca!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca laporan laba rugi otomatis\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pahami komponen pendapatan dan beban\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Evaluasi performa keuangan bisnis\n\nLanjut ke tutorial <b>Neraca (Balance Sheet)</b>!',
        target: null }
    ]
  },

  'neraca': {
    title: 'Neraca (Balance Sheet)', icon: '<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Neraca — Posisi Keuangan',
        body:'<b>Neraca</b> (Balance Sheet) menjawab: "<b>Apa yang dimiliki dan dihutang bisnis saya?</b>"\n\nNeraca menampilkan kondisi keuangan pada SATU titik waktu, berbeda dengan Laba Rugi yang untuk satu periode.',
        target: '.nav-item[onclick*="neraca"]', navTo: 'neraca' },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Struktur Neraca: Dua Sisi',
        body:'Neraca selalu punya dua sisi yang HARUS sama:\n\n<b>Sisi Kiri — ASET</b>\n• Aset Lancar (kas, piutang, persediaan)\n• Aset Tetap (mesin, kendaraan, gedung)\n= Total Aset\n\n<b>Sisi Kanan — LIABILITAS + EKUITAS</b>\n• Liabilitas (utang lancar, utang jangka panjang)\n• Ekuitas (modal + laba ditahan)\n= Total Liabilitas + Ekuitas\n\n<b>Total Aset = Total Liabilitas + Ekuitas</b>',
        target: '#neraca-content', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Indikator Balance Otomatis',
        body:'Di bawah neraca ada indikator:\n\n<span style="color:#4ade80">✓ Neraca Balance</span> — semua jurnal benar\n<span style="color:#f87171">✗ Neraca Tidak Balance</span> — ada kesalahan\n\nJika tidak balance:\n1. Cek Neraca Saldo — cari akun yang aneh\n2. Cek Jurnal Umum — cari jurnal tidak balance\n3. Tanya Orias Assisten untuk bantu diagnosa!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Neraca Dipahami!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca neraca dua sisi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pahami posisi aset, liabilitas, dan ekuitas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek apakah laporan sudah balance\n\nKamu sudah menguasai semua laporan keuangan utama! 🎉\n\nLanjut ke <b>Kalkulator Penyusutan</b> untuk fitur yang lebih advanced.',
        target: null }
    ]
  },

  'kalk-penyusutan': {
    title: 'Kalkulator Penyusutan', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>', title:'Apa itu Penyusutan Aset?',
        body:'Aset tetap (mesin, kendaraan, gedung) nilainya turun setiap tahun — ini disebut <b>penyusutan</b> (depreciation).\n\nBayu Harlan Priangga hitung penyusutan otomatis dengan 4 metode berbeda sesuai standar PSAK 16.',
        target: '.nav-item[onclick*="kalk-penyusutan"]', navTo: 'kalk-penyusutan' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 20.29V5a2 2 0 012-2h13.71a.7.7 0 01.5 1.21L5.21 18.5a.7.7 0 01-1.21-.5zM6 9h8M6 13h5"/></svg>', title:'4 Metode Penyusutan',
        body:'<b>1. Garis Lurus (SLM)</b>\nBeban sama setiap tahun. Paling simpel.\nContoh: mesin Rp 100jt, umur 5 tahun → Rp 20jt/tahun\n\n<b>2. Saldo Menurun Ganda (DDB)</b>\nBeban besar di awal, mengecil di akhir.\nCocok untuk aset teknologi yang cepat usang.\n\n<b>3. Sum of Years Digits (SYD)</b>\nVariasi saldo menurun yang lebih halus.\n\n<b>4. Unit Produksi</b>\nBerdasarkan berapa banyak unit diproduksi.\nCocok untuk mesin pabrik.',
        target: '#py-metode', highlight: true },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Parameter yang Perlu Diisi',
        body:'Untuk hitung penyusutan, isi:\n\n• <b>Harga Perolehan</b> — harga beli aset\n• <b>Nilai Sisa/Residu</b> — estimasi nilai saat tidak dipakai lagi\n• <b>Umur Ekonomis</b> — berapa tahun aset dipakai\n• <b>Metode</b> — pilih sesuai kebijakan perusahaan\n\nContoh: Mesin produksi\nHarga: Rp 100.000.000\nResidu: Rp 10.000.000\nUmur: 5 tahun\nMetode: Garis Lurus',
        target: '#py-cost', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Hasil: Tabel + Jurnal Otomatis',
        body:'Setelah klik <b>"Hitung & Generate Tabel"</b>, sistem tampilkan:\n\n<i class="ti ti-chart-bar ti-inline"></i> <b>Tabel penyusutan</b> lengkap per tahun:\n• Beban Penyusutan per tahun\n• Akumulasi Penyusutan\n• Nilai Buku Awal dan Akhir\n\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal per tahun:</b>\nDr. Beban Penyusutan — Kr. Akumulasi Penyusutan\n\nSalin jurnal ini ke menu Jurnal Manual setiap akhir periode!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Penyusutan Siap Dihitung!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pilih metode penyusutan yang tepat\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Generate tabel penyusutan per tahun\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu jurnal penyesuaian yang harus dicatat\n\nLanjut ke <b>Kalkulator Persediaan</b>!',
        target: null }
    ]
  },

  'kalk-persediaan': {
    title: 'Kalkulator Persediaan', icon: '<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', title:'Kalkulator Persediaan',
        body:'Kalkulator ini untuk menghitung <b>nilai persediaan akhir</b> dan <b>HPP</b> menggunakan metode:\n\n• <b>FIFO</b> — barang masuk pertama, keluar pertama\n• <b>LIFO</b> — barang masuk terakhir, keluar pertama\n• <b>Weighted Average</b> — rata-rata tertimbang\n• <b>Moving Average</b> — rata-rata bergerak\n\nMasing-masing metode hasilkan nilai yang berbeda!',
        target: '.nav-item[onclick*="kalk-persediaan"]', navTo: 'kalk-persediaan' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Input Transaksi',
        body:'Klik tombol:\n• <b>"+ Pembelian/Masuk"</b> — untuk barang yang dibeli/diterima\n• <b>"+ Penjualan/Keluar"</b> — untuk barang yang dijual/dikeluarkan\n\nSetiap baris isi: Tanggal, Qty, Harga/Unit, dan Keterangan.\n\nUntuk baris Keluar, harga diisi otomatis oleh sistem sesuai metode yang dipilih.',
        target: '#inv-input-body', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Membaca Kartu Persediaan',
        body:'Setelah klik <b>"Hitung"</b>, sistem tampilkan <b>Kartu Persediaan</b> dengan kolom:\n\n| Masuk | Keluar | Saldo |\n\nSetiap kolom punya 3 sub-kolom: Qty, Harga/unit, Jumlah.\n\nDi bagian bawah ada ringkasan:\n• Nilai Persediaan Akhir\n• Total HPP\n• Qty Akhir tersisa',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Persediaan Siap Dihitung!',
        body:'Kamu sekarang bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input kartu stok masuk-keluar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pilih metode FIFO/LIFO/WA/MWA\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dapatkan nilai persediaan akhir & HPP\n\nLanjut ke <b>Kalkulator Pajak</b>!',
        target: null }
    ]
  },

  'kalk-pajak': {
    title: 'Kalkulator Pajak', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Kalkulator PPN & PPh',
        body:'Ada 4 jenis pajak yang bisa dihitung:\n\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>PPN</b> — Pajak Pertambahan Nilai 12%\n👤 <b>PPh 21</b> — Pajak karyawan dari gaji\n🏢 <b>PPh 23</b> — Pajak atas jasa/dividen/sewa\n🏛️ <b>PPh Badan</b> — Pajak penghasilan perusahaan',
        target: '.nav-item[onclick*="kalk-ppn"]', navTo: 'kalk-ppn' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'PPN — Eksklusif vs Inklusif',
        body:'<b>Eksklusif (default)</b>\nHarga belum termasuk PPN.\nContoh: DPP Rp 10jt → PPN 12% = Rp 1,2jt → Total Rp 11,2jt\n\n<b>Inklusif</b>\nHarga sudah termasuk PPN.\nContoh: Total Rp 11,2jt → DPP = Rp 10jt → PPN = Rp 1,2jt\n\nPPN harus disetorkan ke DJP setiap bulan oleh PKP (Pengusaha Kena Pajak).',
        target: '#pajak-ppn', highlight: true },
      { icon:'👤', title:'PPh 21 — Pajak Karyawan',
        body:'PPh 21 dipotong dari gaji karyawan setiap bulan.\n\nSistem hitung otomatis:\n1. Penghasilan Bruto setahun\n2. Dikurangi Biaya Jabatan (max Rp 6jt)\n3. Dikurangi iuran BPJS/JHT\n4. Dikurangi PTKP sesuai status\n5. = PKP → dikenakan tarif progresif 5 lapisan\n\nTarif: 5% → 15% → 25% → 30% → 35%',
        target: null },
      { icon:'🏢', title:'PPh 23 & PPh Badan',
        body:'<b>PPh 23</b> — Dipotong saat bayar:\n• Dividen, bunga, royalti → 15%\n• Sewa, jasa teknik → 2%\n• Tanpa NPWP? → tarif × 2!\n\n<b>PPh Badan</b> — Pajak atas laba perusahaan:\n• Tarif umum: 22%\n• UMKM (omzet ≤ Rp 4,8M): 0,5% dari omzet\n• Fasilitas Pasal 31E untuk sebagian PKP',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Kalkulator Pajak Siap!',
        body:'Sekarang kamu bisa hitung:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PPN eksklusif/inklusif dengan benar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PPh 21 karyawan dengan tarif progresif terbaru\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PPh 23 berbagai jenis penghasilan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PPh Badan termasuk fasilitas UMKM\n\nLanjut ke <b>Kalkulator BEP</b>!',
        target: null }
    ]
  },

  'kalk-bep': {
    title: 'Kalkulator BEP & Margin', icon: '<i class="ti ti-target" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'Apa itu BEP?',
        body:'<b>BEP (Break Even Point)</b> adalah titik di mana bisnis tidak untung tidak rugi — tepat impas.\n\nKenapa penting?\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu berapa minimal harus jual\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Evaluasi apakah harga jual sudah cukup\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Perencanaan target penjualan',
        target: '.nav-item[onclick*="kalk-bep"]', navTo: 'kalk-bep' },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'3 Parameter Utama BEP',
        body:'<b>1. Harga Jual / Unit</b>\nBerapa harga yang dibayar pelanggan per unit produk.\n\n<b>2. Biaya Variabel / Unit</b>\nBiaya yang berubah sesuai jumlah produksi (bahan baku, komisi).\n\n<b>3. Biaya Tetap / Periode</b>\nBiaya yang tidak berubah berapa pun yang diproduksi (sewa, gaji tetap, listrik bulanan).\n\nRumus: <b>BEP = Biaya Tetap ÷ (Harga - Biaya Variabel)</b>',
        target: '#bep-harga', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Hasil yang Didapat',
        body:'Dari kalkulator BEP, kamu dapatkan:\n\n• <b>BEP Unit</b> — minimal berapa unit harus terjual\n• <b>BEP Rupiah</b> — minimal berapa omzet\n• <b>CM (Contribution Margin)</b> — laba per unit sebelum biaya tetap\n• <b>CM Ratio</b> — % laba dari harga jual\n• <b>Margin of Safety</b> — seberapa jauh dari titik rugi\n• <b>DOL</b> — seberapa sensitif laba terhadap perubahan penjualan',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'BEP Siap Dihitung!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Hitung BEP bisnis kamu\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu minimal target penjualan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Analisis margin dan risiko\n\nLanjut ke <b>Kalkulator Rasio Keuangan</b>!',
        target: null }
    ]
  },

  'kalk-rasio': {
    title: 'Kalkulator Rasio Keuangan', icon: '<i class="ti ti-scale" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 20.29V5a2 2 0 012-2h13.71a.7.7 0 01.5 1.21L5.21 18.5a.7.7 0 01-1.21-.5zM6 9h8M6 13h5"/></svg>', title:'Rasio Keuangan — Kesehatan Bisnis',
        body:'<b>Rasio keuangan</b> adalah angka-angka yang menunjukkan seberapa sehat bisnis kamu.\n\nIbarat hasil medical check-up untuk bisnis!\n\nBayu Harlan Priangga hitung 20+ rasio sekaligus dari data yang kamu masukkan.',
        target: '.nav-item[onclick*="kalk-rasio"]', navTo: 'kalk-rasio' },
      { icon:'<i class="ti ti-droplet ti-inline"></i>', title:'Rasio Likuiditas',
        body:'Mengukur kemampuan bayar utang jangka pendek:\n\n• <b>Current Ratio ≥ 2x</b> — sehat\nAset Lancar ÷ Utang Lancar\n\n• <b>Quick Ratio ≥ 1x</b> — sehat\n(Aset Lancar - Persediaan) ÷ Utang Lancar\n\n• <b>Cash Ratio ≥ 0,5x</b> — sehat\nKas ÷ Utang Lancar\n\nWarna hijau = baik, kuning = perlu perhatian, merah = bermasalah.',
        target: '#rasio-likuiditas', highlight: true },
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Rasio Profitabilitas',
        body:'Mengukur kemampuan menghasilkan laba:\n\n• <b>NPM (Net Profit Margin)</b> ≥ 10% = baik\nLaba Bersih ÷ Penjualan\n\n• <b>ROA</b> ≥ 5% = baik\nLaba Bersih ÷ Total Aset\n\n• <b>ROE</b> ≥ 15% = baik\nLaba Bersih ÷ Ekuitas\n\nSemakin tinggi = semakin menguntungkan.',
        target: '#rasio-profitabilitas', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Menggunakan',
        body:'Isi data dari laporan keuangan kamu di bagian kiri:\n\n1. Data Neraca (aset, liabilitas, ekuitas)\n2. Data Laba Rugi (penjualan, HPP, laba)\n3. Data Pasar (jika perusahaan publik)\n\nSemua rasio langsung dihitung otomatis di kanan.\nAda interpretasi warna dan benchmark di setiap rasio.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Rasio Keuangan Siap Dianalisis!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi data keuangan dan dapatkan 20+ rasio\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca interpretasi warna (hijau/kuning/merah)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bandingkan dengan benchmark industri\n\nJika ada rasio yang merah, tanya <b>Orias Assisten</b> untuk rekomendasi perbaikannya!',
        target: null }
    ]
  },

  'ai-intro': {
    title: 'Mengenal Orias Assisten', icon: '<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Orias Assisten — Asisten Keuangan Cerdas',
        body:'<b>Orias Assisten</b> adalah asisten akuntansi yang memahami bahasa sehari-hari.\n\nKamu tidak perlu hafal menu atau fitur — cukup ceritakan apa yang ingin dilakukan, dan AI akan bantu!',
        target: '.nav-item[onclick*="ai-assistant"]', navTo: 'ai-assistant' },
      { icon:'💬', title:'Cara Bicara dengan AI',
        body:'Kamu bisa bicara natural, contoh:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Kemarin beli laptop Rp 12jt untuk kantor, bayar tunai"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Gaji karyawan bulan ini Rp 8jt, belum dibayar"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Jual 50 unit barang @ Rp 25rb, bayar transfer"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Hitung penyusutan mesin 100jt umur 5 tahun"</i>\n\nAI akan pahami maksudmu dan buatkan jurnal/kalkulasi yang benar.',
        target: '#ai-input', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'Quick Chips — Pertanyaan Cepat',
        body:'Di atas kotak chat ada tombol-tombol <b>chip shortcut</b>.\n\nKlik salah satu untuk langsung mengirim pertanyaan umum ke AI tanpa perlu mengetik.\n\nChip akan hilang setelah kamu mulai chat — kamu bisa refresh halaman untuk munculkan lagi.',
        target: '#ai-chips', highlight: true },
      { icon:'<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Simpan Jurnal dari AI',
        body:'Jika AI membuatkan jurnal, akan muncul tombol:\n\n<b>"<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Jurnal ke Sistem"</b>\n\nKlik tombol itu → jurnal langsung masuk ke database tanpa perlu input manual!\n\nJuga ada tombol shortcut ke kalkulator yang relevan dari jawaban AI.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Siap Pakai AI!',
        body:'Sekarang kamu tahu cara pakai Orias Assisten:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Ketik transaksi dalam bahasa natural\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Minta hitung pajak, penyusutan, BEP, dll\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Simpan jurnal dari AI dengan satu klik\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanya cara pakai fitur apapun\n\nAI tidak pernah bingung — selalu siap membantu 24/7!',
        target: null }
    ]
  },

  'ai-advanced': {
    title: 'AI untuk Analisis Keuangan', icon: '✨',
    steps: [
      { icon:'✨', title:'Lebih dari Sekedar Input Transaksi',
        body:'Orias Assisten bukan hanya untuk input transaksi — dia bisa jadi konsultan keuangan pribadi kamu!\n\nDia punya akses ke data keuangan kamu yang sudah tercatat dan bisa memberikan analisis mendalam.',
        target: '.nav-item[onclick*="ai-assistant"]', navTo: 'ai-assistant' },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Minta Analisis Laporan',
        body:'Coba tanya AI:\n\n💬 <i>"Analisis kondisi keuangan bisnis saya sekarang"</i>\n💬 <i>"Apakah rasio keuangan saya bagus?"</i>\n💬 <i>"Ada masalah apa di laporan keuangan saya?"</i>\n💬 <i>"Kenapa laba saya kecil padahal penjualan banyak?"</i>\n\nAI akan baca data jurnal dan berikan insight spesifik!',
        target: '#ai-input', highlight: true },
      { icon:'🎯', title:'Minta Rekomendasi',
        body:'AI juga bisa kasih rekomendasi:\n\n💬 <i>"Bagaimana cara meningkatkan profit margin saya?"</i>\n💬 <i>"Akun apa yang perlu saya tambahkan untuk bisnis restoran?"</i>\n💬 <i>"Saya mau ajukan kredit bank, dokumen apa yang perlu disiapkan?"</i>',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'AI Siap Jadi Konsultan Kamu!',
        body:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI paham bahasa natural dan konteks\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI baca data keuangan kamu secara real-time\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI tahu semua standar PSAK & perpajakan Indonesia\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI bisa jelaskan ulang dengan cara berbeda jika belum paham',
        target: null }
    ]
  },

  // ═══ FITUR BARU ═══

  'tut-jurnal-berulang': {
    title: 'Jurnal Berulang', icon: '<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Apa itu Jurnal Berulang?',
        body:'Jurnal Berulang adalah template transaksi yang berjalan otomatis sesuai jadwal.\n\nContoh penggunaan:\n💼 Gaji karyawan → tiap bulan tanggal 25\n🏠 Sewa kantor → tiap bulan tanggal 1\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Cicilan → tiap bulan\n<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Langganan software → tiap tahun\n\nSekali setup, sistem yang mencatat otomatis!',
        navTo: 'jurnal-berulang' },
      { icon:'+', title:'Cara Membuat Jurnal Berulang',
        body:'1. Buka menu <b>J. Berulang</b> di sidebar\n2. Ketuk <b>+ Tambah Berulang</b>\n3. Isi nama template (contoh: "Gaji Karyawan")\n4. Pilih frekuensi: Harian / Mingguan / Bulanan / Triwulan / Tahunan\n5. Pilih tanggal mulai\n6. Pilih akun Debit dan Kredit\n7. Isi nominal dan keterangan\n8. Ketuk <b>Simpan</b>',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>', title:'Menjalankan Jurnal Tertunda',
        body:'Sistem otomatis deteksi jurnal yang tertunda saat app dibuka.\n\n<b>Jalankan satu:</b> Ketuk tombol <i class="ti ti-player-play" style="font-size:11px;vertical-align:-1px;"></i> di baris jurnal\n<b>Jalankan semua:</b> Ketuk tombol <b>▶ Jalankan Semua Tertunda</b>\n\nSetelah dijalankan, jurnal otomatis tercatat di Jurnal Umum dan tanggal berikutnya diperbarui otomatis.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Tips Jurnal Berulang',
        body:'💡 Tips:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Gunakan keterangan "[Auto] Nama Jurnal" agar mudah diidentifikasi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Set tanggal berakhir jika transaksi ada batas waktu (cicilan selesai)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Nonaktifkan (<i class="ti ti-player-pause" style="font-size:11px;vertical-align:-1px;"></i>) jika sementara tidak perlu tanpa menghapus template\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek riwayat eksekusi di bagian bawah halaman',
        target: null }
    ]
  },

  'tut-invoice': {
    title: 'Invoice & Piutang', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Apa itu Fitur Invoice?',
        body:'Fitur Invoice memungkinkan kamu:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Buat invoice profesional untuk pelanggan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lacak status: Draft → Terkirim → Lunas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Deteksi otomatis invoice yang sudah jatuh tempo\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal piutang dibuat otomatis saat invoice dikirim\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal penerimaan kas dibuat otomatis saat tandai lunas',
        navTo: 'invoice' },
      { icon:'+', title:'Cara Membuat Invoice',
        body:'1. Buka menu <b>Invoice</b> → ketuk <b>+ Buat Invoice</b>\n2. No. Invoice otomatis terisi (bisa diubah)\n3. Isi nama pelanggan dan tanggal jatuh tempo\n4. Tambah item/jasa: nama, qty, harga\n5. Centang PPN 12% jika dikenakan pajak\n6. Pilih akun piutang dan akun pendapatan\n7. Ketuk <b>Simpan & Terkirim</b> → jurnal piutang otomatis dibuat!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Tandai Invoice Lunas',
        body:'Saat pelanggan membayar:\n1. Temukan invoice di daftar\n2. Ketuk tombol <b><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lunas</b>\n3. Isi tanggal pembayaran dan nominal\n4. Pilih akun kas/bank penerima\n5. Ketuk <b>Konfirmasi Lunas & Buat Jurnal</b>\n\nJurnal: Kas (Debit) | Piutang Usaha (Kredit) — otomatis!',
        target: null },
      { icon:'🔍', title:'Filter & Monitoring',
        body:'Gunakan filter status untuk monitoring:\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Semua</b> — lihat semua invoice\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Draft</b> — belum dikirim ke pelanggan\n<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Terkirim</b> — menunggu pembayaran\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Lunas</b> — sudah dibayar\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Jatuh Tempo</b> — lewat tanggal bayar\n\nKPI cards di atas menampilkan total tagihan, lunas, belum lunas, dan jumlah jatuh tempo.',
        target: null }
    ]
  },

  'tut-rekonsiliasi': {
    title: 'Rekonsiliasi Bank', icon: '<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Apa itu Rekonsiliasi Bank?',
        body:'Rekonsiliasi bank adalah proses mencocokkan mutasi di rekening bank dengan jurnal yang sudah dicatat di OAS.\n\nManfaatnya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Temukan transaksi yang belum dicatat\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Deteksi selisih atau kesalahan pencatatan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pastikan saldo buku = saldo bank\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Import transaksi bank langsung jadi jurnal',
        navTo: 'rekonsiliasi' },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Upload CSV Mutasi Bank',
        body:'1. Buka menu <b>Rekonsiliasi</b>\n2. Pilih nama bank (BCA/Mandiri/BNI/BRI/Generic)\n3. Download mutasi rekening dari internet banking dalam format CSV\n4. Tap zona upload atau drag file CSV ke sana\n5. File langsung diparse — lihat ringkasan di panel kanan',
        target: null },
      { icon:'🔍', title:'Proses Pencocokan',
        body:'Ketuk <b><i class="ti ti-search" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Proses Rekonsiliasi</b> — sistem otomatis:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Cocok</b> — tanggal & nominal sama dengan jurnal\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Beda Nominal</b> — tanggal sama tapi nominal berbeda\n<i class="ti ti-question-mark" style="color:var(--red);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Belum Cocok</b> — tidak ada jurnal yang sesuai\n\nGunakan filter untuk fokus ke yang belum cocok.',
        target: null },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Import Transaksi Bank',
        body:'Untuk transaksi <b><i class="ti ti-question-mark" style="color:var(--red);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum Cocok</b>:\n\n<b>Satu-satu:</b> Ketuk <b><i class="ti ti-download ti-inline"></i> Import</b> di baris transaksi\n<b>Semua sekaligus:</b> Ketuk <b><i class="ti ti-download ti-inline"></i> Import Belum Cocok</b>\n\nJurnal otomatis dibuat dari data mutasi bank. Kamu bisa edit akun setelahnya di Jurnal Umum.',
        target: null }
    ]
  },

  'tut-kurs': {
    title: 'Multi Mata Uang & Kurs', icon: '💱',
    steps: [
      { icon:'💱', title:'Fitur Multi Mata Uang',
        body:'OAS mendukung 6 mata uang: IDR, USD, SGD, EUR, MYR, JPY.\n\nFitur ini berguna untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bisnis yang bertransaksi dalam mata uang asing\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Konversi cepat antar mata uang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tracking nilai kurs terkini\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Update kurs manual atau otomatis',
        navTo: 'kurs' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Update Kurs',
        body:'<b>Update Otomatis:</b>\nKetuk tombol <b><i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Update Kurs</b> di pojok kanan atas — kurs langsung diperbarui.\n\n<b>Update Manual:</b>\nDi panel kanan "Atur Kurs Manual", isi nilai kurs terbaru per USD, lalu ketuk <b><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Kurs</b>.\n\nKurs disimpan di perangkat dan dipakai untuk konversi.',
        target: null },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Konverter Cepat',
        body:'Panel kiri "Konverter Cepat":\n1. Isi nominal yang ingin dikonversi\n2. Pilih mata uang asal (Dari)\n3. Pilih mata uang tujuan (Ke)\n4. Hasil konversi muncul otomatis real-time\n\nContoh: 1.000.000 IDR → berapa USD? Langsung terhitung!',
        target: null }
    ]
  },

  'tut-notifikasi': {
    title: 'Notifikasi & Alert', icon: '🔔',
    steps: [
      { icon:'🔔', title:'Alert Keuangan Otomatis',
        body:'Sistem notifikasi OAS memantau kondisi keuangan bisnis kamu secara otomatis.\n\nAda 5 tipe alert:\n💸 Arus kas negatif\n<i class="ti ti-chart-bar ti-inline"></i> Anggaran terlampaui\n⏰ Invoice jatuh tempo\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Saldo akun di bawah batas\n📉 Laba bersih negatif',
        navTo: 'notifikasi' },
      { icon:'+', title:'Cara Membuat Alert',
        body:'1. Buka menu <b>Notifikasi</b>\n2. Ketuk <b>+ Tambah Alert</b>\n3. Beri nama alert (contoh: "Peringatan Arus Kas")\n4. Pilih tipe alert dari daftar\n5. Isi parameter jika diperlukan (contoh: batas % untuk anggaran)\n6. Ketuk <b>Simpan Alert</b>\n\nAlert langsung aktif dan dicek setiap ada perubahan data.',
        target: null },
      { icon:'🔴', title:'Membaca Alert Aktif',
        body:'Saat ada kondisi yang terpenuhi:\n\n🔴 <b>Alert bahaya</b> — latar merah (arus kas negatif, jatuh tempo)\n🟡 <b>Alert peringatan</b> — latar kuning (mendekati batas)\n\nAngka merah di ikon 🔔 di sidebar menunjukkan jumlah alert aktif.\n\nRiwayat semua notifikasi tersimpan di panel kanan.',
        target: null }
    ]
  },

  'tut-anggaran': {
    title: 'Anggaran vs Aktual', icon: '🎯',
    steps: [
      { icon:'🎯', title:'Mengapa Perlu Anggaran?',
        body:'Anggaran (budget) adalah target pengeluaran atau pendapatan per akun per bulan.\n\nDengan fitur ini kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Set target realistis per kategori\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Monitor apakah pengeluaran sesuai rencana\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lihat variance (selisih anggaran vs aktual)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dapat peringatan saat melebihi anggaran',
        navTo: 'anggaran' },
      { icon:'+', title:'Set Anggaran Baru',
        body:'1. Buka menu <b>Anggaran</b>\n2. Ketuk <b>+ Set Anggaran</b>\n3. Pilih akun (misalnya: Beban Gaji, Beban Sewa)\n4. Pilih periode bulan (YYYY-MM)\n5. Isi nominal target anggaran\n6. Tambah catatan opsional\n7. Ketuk <b>Simpan Anggaran</b>',
        target: null },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Membaca Progress Anggaran',
        body:'Panel "Progress Anggaran Bulan Ini" menampilkan:\n\n🟢 <b>Hijau</b> — masih di bawah 80% → aman\n🟡 <b>Kuning</b> — 80–100% → perhatikan\n🔴 <b>Merah</b> — melewati 100% → melebihi anggaran!\n\nTabel detail menampilkan semua akun dengan variance dan status on-track/melebihi.',
        target: null },
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Chart Anggaran vs Aktual',
        body:'Chart batang di panel kanan membandingkan:\n\n🔵 <b>Batang biru</b> — nominal anggaran yang ditetapkan\n🟢 <b>Batang hijau</b> — aktual dari jurnal yang sudah tercatat\n\nKlik chart untuk tampilan HD yang lebih besar dan jelas.',
        target: null }
    ]
  },

  'tut-pajak': {
    title: 'Pajak Otomatis', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Pajak Otomatis di OAS',
        body:'OAS otomatis menghitung pajak dari data jurnal kamu:\n\n💰 <b>PPN 12%</b> — dari transaksi penjualan & pembelian\n👤 <b>PPh 21</b> — pajak gaji karyawan (progresif)\n🏢 <b>PPh 23</b> — jasa, royalti, sewa, dividen, bunga\n\nHitung otomatis, buat jurnal pajak satu klik!',
        navTo: 'pajak' },
      { icon:'💰', title:'PPN Keluaran & Masukan',
        body:'Sistem otomatis scan jurnal penjualan dan pembelian:\n\n<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>PPN Keluaran</b> = PPN dari penjualan (hutang ke negara)\n<i class="ti ti-download ti-inline"></i> <b>PPN Masukan</b> = PPN dari pembelian (kredit pajak)\n<i class="ti ti-scale ti-inline"></i> <b>Kurang/(Lebih) Bayar</b> = Keluaran minus Masukan\n\nKetuk <b><i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Hitung Ulang</b> untuk perbarui kalkulasi.',
        target: null },
      { icon:'👤', title:'PPh 21 — Pajak Gaji',
        body:'1. Isi <b>Total Gaji Bruto/Bulan</b> dan <b>Jumlah Karyawan</b>\n2. Sistem otomatis hitung PKP, biaya jabatan, PTKP\n3. Tarif progresif: 5% / 15% / 25% / 30% / 35%\n4. Ketuk <b><i class="ti ti-notebook" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Buat Jurnal PPh 21</b>\n\nJurnal: Beban Gaji (D) | Hutang PPh 21 (K) | Kas (K)',
        target: null },
      { icon:'🏢', title:'PPh 23 — Jasa & Royalti',
        body:'1. Pilih jenis penghasilan (Jasa 2%, Royalti 15%, Sewa 2%, dll)\n2. Isi nilai bruto\n3. PPh otomatis terhitung\n4. Ketuk <b><i class="ti ti-notebook" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Buat Jurnal PPh 23</b>\n\nRingkasan SPT Tahunan di panel kanan merangkum semua penghasilan bruto, HPP, dan PPN wajib bayar untuk pelaporan.',
        target: null }
    ]
  },

  'tut-analitik': {
    title: 'Analitik & Tren Bisnis', icon: '<i class="ti ti-chart-bar ti-inline"></i>',
    steps: [
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Dashboard Analitik',
        body:'Halaman Analitik menampilkan 10+ grafik visual dari data jurnal kamu:\n\n<i class="ti ti-chart-bar ti-inline"></i> Pendapatan vs Beban per Bulan\n<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Tren Laba Bersih\n<i class="ti ti-droplet ti-inline"></i> Arus Kas Bersih per Bulan\n🌊 Waterfall Laba-Rugi\n📉 Growth MoM (%)\n🍩 Distribusi Beban (Donut)\n💰 Posisi Keuangan\n🎯 Margin per Bulan\n🔮 Proyeksi Keuangan',
        navTo: 'analitik' },
      { icon:'📱', title:'Scroll Horizontal di Mobile',
        body:'Di HP, chart kadang tampak sempit karena banyak data bulan.\n\n👆 <b>Geser kiri-kanan</b> di area chart untuk scroll horizontal\n• Label bulan dan tahun tampil 2 baris (tidak bertabrakan)\n\nScrollbar tipis muncul di bawah chart sebagai indikator posisi.',
        target: null },
      { icon:'🔍', title:'Tampilan Chart HD',
        body:'Ketuk/klik chart mana saja untuk membuka modal HD!\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Chart diperbesar mengisi layar penuh\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Resolusi super tajam\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Scroll horizontal jika data banyak\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tutup dengan ketuk ✕ atau area gelap atau tekan Escape',
        target: null },
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Export Analitik',
        body:'Data analitik bisa diekspor!\n\n1. Ketuk <b>Export Laporan</b> di sidebar\n2. Centang <b><i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Grafik Analitik Bisnis</b>\n3. Pilih format Excel\n4. Ketuk Export\n\nSheet "<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Analitik Bisnis" berisi data 12 bulan: pendapatan, beban, laba, margin, dan pertumbuhan MoM.',
        target: null }
    ]
  },

  'tut-chart-hd': {
    title: 'Chart HD & Zoom', icon: '🔍',
    steps: [
      { icon:'🔍', title:'Fitur Chart HD',
        body:'Semua chart di halaman Analitik bisa diklik untuk membuka tampilan HD!\n\nCaranya:\n👆 <b>Mobile</b>: Tap chart\n🖱️ <b>Desktop</b>: Klik chart\n\nModal akan terbuka dengan chart diperbesar mengisi layar — sangat berguna untuk presentasi atau analisis detail.',
        navTo: 'analitik' },
      { icon:'📱', title:'Scroll Horizontal',
        body:'Setiap chart di mobile punya scroll horizontal sendiri (bukan seluruh halaman).\n\nLabel format baru:\n• Baris atas: nama bulan (Jan, Feb, Mar)\n• Baris bawah: tahun (2025, 2026)\n\nLabel tidak bertabrakan lagi meski data banyak!',
        target: null }
    ]
  },

  'export-laporan': {
    title: 'Export PDF, Excel & CSV', icon: '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Export Laporan',
        body:'OAS mendukung export ke 3 format:\n\n<i class="ti ti-chart-bar ti-inline"></i> <b>Excel (.xlsx)</b> — tabel terformat, formula aktif\n📄 <b>PDF</b> — siap cetak/kirim, bisa tambah logo\n<i class="ti ti-clipboard-list ti-inline"></i> <b>CSV</b> — untuk Google Sheets / analisis eksternal\n\nBuka: Sidebar → <b>Export Laporan</b>',
        target: null },
      { icon:'✨', title:'Export Fitur Baru',
        body:'Selain laporan standar, sekarang bisa export:\n\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Invoice & Piutang</b> — semua invoice + status\n<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Jurnal Berulang</b> — daftar template aktif\n🎯 <b>Anggaran vs Aktual</b> — realisasi per akun\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Laporan Pajak</b> — rekap PPN & riwayat transaksi\n<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Analitik Bisnis</b> — data 12 bulan tren keuangan',
        target: null },
      { icon:'📄', title:'Export PDF dengan Logo',
        body:'Saat pilih format PDF:\n1. Upload logo perusahaan (PNG/JPG/SVG, maks 2MB)\n2. Logo muncul di pojok kiri atas setiap halaman\n3. Isi nama perusahaan dan periode\n4. Setiap laporan dipisah per halaman otomatis',
        target: null },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Template Excel',
        body:'Ada 2 template Excel:\n\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Template Data</b> — data mentah per sheet, formula referensi\n<i class="ti ti-settings ti-inline"></i> <b>Template Hitung Otomatis</b> — formula Excel aktif, ubah di sheet INPUT → semua laporan update otomatis\n\nTemplate Hitung Otomatis cocok untuk akuntan yang mau edit dan analisis di Excel.',
        target: null }
    ]
  },

  'tut-shortcut': {
    title: 'Keyboard Shortcut', icon: '⌨️',
    steps: [
      { icon:'⌨️', title:'Shortcut Keyboard OAS',
        body:'Shortcut untuk kerja lebih cepat:\n\n<b>Ctrl+N</b> — Input transaksi baru\n<b>Ctrl+S</b> — Simpan data ke cloud\n<b>Ctrl+/</b> — Buka AI Assisten\n<b>Ctrl+E</b> — Buka modal Export\n<b>Ctrl+F</b> — Fokus ke pencarian\n<b>Escape</b> — Tutup modal / picker\n<b>Alt+←</b> — Kembali ke halaman sebelumnya\n\nShortcut aktif di semua halaman.',
        target: null }
    ]
  },

  'tut-mobile': {
    title: 'Penggunaan di Mobile', icon: '📱',
    steps: [
      { icon:'📱', title:'OAS di Mobile',
        body:'OAS dirancang mobile-first dengan fitur:\n\n🔃 <b>Pull-to-refresh</b> — tarik ke bawah untuk refresh data\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Bottom sheet picker</b> — pilih akun/opsi dari bawah layar\n📲 <b>Install sebagai PWA</b> — buka seperti aplikasi native\n👆 <b>Swipe & scroll</b> — navigasi intuitif',
        target: null },
      { icon:'📲', title:'Install sebagai App',
        body:'Buka sidebar → scroll ke bawah → ketuk <b>📲 Install App</b>\n\nSetelah install:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Icon OAS muncul di home screen\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Buka tanpa URL bar browser\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tampilan fullscreen\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akses lebih cepat\n\nPanduan detail otomatis muncul sesuai browser kamu.',
        target: null },
      { icon:'🔃', title:'Pull-to-Refresh',
        body:'Saat berada di paling atas halaman:\n\n1. Tarik layar ke bawah dengan jari\n2. Muncul indikator loading\n3. Lepas saat indikator berputar\n4. Data direfresh!\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Hanya isi konten yang refresh — header/topbar tetap di tempat.',
        target: null }
    ]
  },

  'tut-backup': {
    title: 'Backup & Sinkronisasi', icon: '☁️',
    steps: [
      { icon:'☁️', title:'Simpan Data ke Cloud',
        body:'OAS mendukung 2 mode penyimpanan:\n\n<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> <b>Mode Tamu (Lokal)</b> — data tersimpan di browser perangkat ini saja\n☁️ <b>Mode Login (Cloud)</b> — data tersimpan di Supabase, bisa diakses dari perangkat manapun\n\nMode cloud memerlukan akun gratis di Supabase.',
        target: null },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Export Backup JSON',
        body:'Cara backup manual:\n1. Buka sidebar → <b>Kelola</b>\n2. Ketuk <b>Export Backup JSON</b>\n3. File JSON diunduh ke perangkat\n\nFile JSON berisi semua jurnal, akun, pengaturan, invoice, anggaran, dan data lainnya.',
        target: null },
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Import / Restore Backup',
        body:'Cara restore dari backup:\n1. Buka sidebar → <b>Kelola</b>\n2. Ketuk <b>Import Backup JSON</b>\n3. Pilih file JSON backup\n4. Konfirmasi restore\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Import akan menggantikan semua data yang ada sekarang.',
        target: null }
    ]
  },

  'saldo-awal': {
    title: 'Setup Saldo Awal', icon: '🏁',
    steps: [
      { icon:'🏁', title:'Mengapa Perlu Saldo Awal?',
        body:'Saldo awal adalah posisi keuangan bisnis kamu sebelum mulai mencatat di OAS.\n\nContoh:\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kamu punya kas Rp 50 juta\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Tabungan bank Rp 200 juta\n🏠 Aset gedung Rp 500 juta\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Utang bank Rp 150 juta\n\nSemua ini perlu diinput agar laporan keuangan akurat dari hari pertama.',
        target: null },
      { icon:'<i class="ti ti-settings ti-inline"></i>', title:'Cara Input Saldo Awal',
        body:'1. Buka <b>Dashboard</b> → ketuk tombol <b>Saldo Awal</b>\n2. Isi saldo untuk setiap akun yang relevan\n3. Sistem akan buat jurnal pembuka otomatis\n\nAlternatif: Input manual via <b>Jurnal Manual</b> dengan keterangan "Saldo Awal [nama akun]"\n\nAkun yang biasanya perlu saldo awal:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kas & Bank\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Piutang (jika ada)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aset Tetap\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Utang (jika ada)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Modal Pemilik',
        target: 'button[onclick*="saldoAwal"], button[onclick*="saldo-awal"]', navTo: 'dashboard' }
    ]
  }
};

// Runtime state
let activeTutId = null;
let tutStep = 0;
let tutHighlighted = null;

// Start tutorial by ID
function startTutorialById(id) {
  tutRestore();
  setTimeout(initTutDrag, 300);
  if(id === 'semua') {
    // Run all in sequence — flatten all steps with section markers
    const allIds = Object.keys(TUT_MODULES);
    runSequential(allIds, 0);
    return;
  }
  activeTutId = id;
  tutStep = 0;
  document.getElementById('tut-backdrop').style.display = 'block';
  document.getElementById('tut-complete').style.display = 'none';
  closeSidebar();
  renderTutStep();
}
