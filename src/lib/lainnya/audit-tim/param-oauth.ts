export function bacaParamOAuth(
  search: string,
  hash: string
): { kode: boolean; token: boolean; error: string } {
  const sp = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const hp = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const error =
    sp.get("error_description") ||
    hp.get("error_description") ||
    sp.get("error_code") ||
    hp.get("error_code") ||
    sp.get("error") ||
    hp.get("error") ||
    "";
  return {
    kode: !error && sp.has("code"),
    token: !error && hp.has("access_token"),
    error,
  };
}
