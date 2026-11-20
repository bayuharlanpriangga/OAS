// Baca parameter hasil redirect OAuth dari URL. Fungsi murni, dites di tests/oauth-url.test.js.
// Dulu deteksi memakai includes('code='), yang juga cocok dengan "error_code=" pada redirect
// error Supabase, sehingga halaman salah menganggap itu kode login dan macet di "Menghubungkan...".

/**
 * search: location.search, hash: location.hash.
 * Return {kode, token, error}:
 *   kode  : ada parameter ?code= (PKCE) dan bukan redirect error
 *   token : ada access_token di hash (implicit flow)
 *   error : pesan error dari redirect (error_description / error_code / error), '' bila tidak ada
 */
function bacaParamOAuth(search, hash) {
  const sp = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const hp = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const error = sp.get('error_description') || hp.get('error_description')
    || sp.get('error_code') || hp.get('error_code')
    || sp.get('error') || hp.get('error') || '';
  return {
    kode: !error && sp.has('code'),
    token: !error && hp.has('access_token'),
    error: error
  };
}
