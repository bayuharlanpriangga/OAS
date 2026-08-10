// ══════════════════════════════════════════════════════════════════════════
// DB ADAPTER — satu-satunya pintu masuk ke database.
//
// TUJUAN: kalau nanti mau ganti provider (Supabase → Firebase, backend
// sendiri, dll), yang diubah CUKUP isi file ini. Semua file lain manggil
// lewat `DB.auth.*` dan `DB.table(...)`, bukan langsung ke library Supabase.
//
// Wajib dimuat PALING PERTAMA di index.html, sebelum 01-state.js dkk:
//   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//   <script src="js/00-db-adapter.js"></script>
//   <script src="js/01-state.js"></script>
//   ...
// ══════════════════════════════════════════════════════════════════════════

// SUPABASE CONFIG 
const SUPABASE_URL = 'https://bcaxdjlyijyfzskbshcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYXhkamx5aWp5Znpza2JzaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY5MjYsImV4cCI6MjA5MzI5MjkyNn0.9vJCqtnE9k33BD6oe0AwZW_xvvZa2Dak1BzA-P9FfzE';

// Storage fallback: Edge/Safari bisa blokir localStorage via Tracking Prevention
// Gunakan sessionStorage atau memory sebagai fallback
const _authStorage = (() => {
  try {
    localStorage.setItem('_oas_test', '1');
    localStorage.removeItem('_oas_test');
    return localStorage;
  } catch(e) {}
  try {
    sessionStorage.setItem('_oas_test', '1');
    sessionStorage.removeItem('_oas_test');
    console.warn('[Auth] localStorage diblokir, pakai sessionStorage');
    return sessionStorage;
  } catch(e) {}
  console.warn('[Auth] sessionStorage juga diblokir, pakai memory storage');
  const _mem = {};
  return {
    getItem: k => _mem[k] ?? null,
    setItem: (k, v) => { _mem[k] = v; },
    removeItem: k => { delete _mem[k]; }
  };
})();

// Client Supabase asli — SENGAJA tetap ada di sini, tapi TIDAK dipakai
// langsung dari file lain manapun. Semua akses lewat objek DB di bawah.
const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    storageKey: 'oas_oas_auth',
    storage: _authStorage,
  }
});

// ══════════════════════════════════════════════════════════════════════════
// DB — adapter generik. Ini yang dipanggil dari 20 file js/ lainnya.
//
// Kalau nanti ganti provider: cukup tulis ulang isi tiap method di bawah
// supaya balikin bentuk data yang SAMA ({data, error} untuk query,
// {data:{session/user}, error} untuk auth) — file lain gak perlu disentuh.
// ══════════════════════════════════════════════════════════════════════════
const DB = {
  auth: {
    signInWithPassword:   (opts)        => _supa.auth.signInWithPassword(opts),
    signUp:               (opts)        => _supa.auth.signUp(opts),
    signOut:              (opts)        => _supa.auth.signOut(opts),
    signInWithOAuth:      (opts)        => _supa.auth.signInWithOAuth(opts),
    getSession:           ()            => _supa.auth.getSession(),
    getUser:              ()            => _supa.auth.getUser(),
    onAuthStateChange:    (cb)          => _supa.auth.onAuthStateChange(cb),
    resetPasswordForEmail:(email, opts) => _supa.auth.resetPasswordForEmail(email, opts),
    updateUser:           (opts)        => _supa.auth.updateUser(opts),
    refreshSession:       (opts)        => _supa.auth.refreshSession(opts),
    exchangeCodeForSession:(code)       => _supa.auth.exchangeCodeForSession(code),
    linkIdentity:         (opts)        => _supa.auth.linkIdentity(opts),
    unlinkIdentity:       (identity)    => _supa.auth.unlinkIdentity(identity),
  },

  // Query builder passthrough. Chain-nya (.select/.eq/.insert/.upsert/.single
  // dst) masih gaya Supabase — kalau provider baru nanti punya API beda,
  // titik yang perlu ditulis ulang cuma method table() ini, tapi cek juga
  // seluruh chain di call site (lihat catatan di README migrasi).
  table: (name) => _supa.from(name),
};
