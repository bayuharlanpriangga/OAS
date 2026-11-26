import {
  getWin,
  type DbAdapterLike,
  type DbQueryBuilderLike,
} from "@/lib/shared/legacy-store";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://bcaxdjlyijyfzskbshcz.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjYXhkamx5aWp5Znpza2JzaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTY5MjYsImV4cCI6MjA5MzI5MjkyNn0.9vJCqtnE9k33BD6oe0AwZW_xvvZa2Dak1BzA-P9FfzE";

export interface AuthStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface RawSupabaseClient {
  auth: DbAdapterLike["auth"];
  from: (name: string) => DbQueryBuilderLike;
  rpc?: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
}

let _cachedStorage: AuthStorageLike | null = null;
let _supaClient: RawSupabaseClient | null = null;
let _dbAdapter: DbAdapterLike | null = null;

export function getAuthStorage(): AuthStorageLike {
  if (_cachedStorage) return _cachedStorage;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("_oas_test", "1");
      localStorage.removeItem("_oas_test");
      _cachedStorage = localStorage;
      return _cachedStorage;
    } catch {
      // fallback
    }
    try {
      sessionStorage.setItem("_oas_test", "1");
      sessionStorage.removeItem("_oas_test");
      console.warn("[Auth] localStorage diblokir, pakai sessionStorage");
      _cachedStorage = sessionStorage;
      return _cachedStorage;
    } catch {
      // fallback
    }
  }
  const mem: Record<string, string> = {};
  _cachedStorage = {
    getItem: (k) => mem[k] ?? null,
    setItem: (k, v) => {
      mem[k] = v;
    },
    removeItem: (k) => {
      delete mem[k];
    },
  };
  return _cachedStorage;
}

export function initDbAdapter(): DbAdapterLike | null {
  if (typeof window === "undefined") return null;
  if (_dbAdapter) return _dbAdapter;

  const win = getWin();
  const supaLib = win?.supabase as
    | {
        createClient: (
          url: string,
          key: string,
          opts: unknown
        ) => RawSupabaseClient;
      }
    | undefined;
  if (!supaLib || typeof supaLib.createClient !== "function") {
    return null;
  }

  const storage = getAuthStorage();
  const client = supaLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
      storageKey: "oas_oas_auth",
      storage,
    },
  });

  _supaClient = client;
  _dbAdapter = {
    isConnected: () => !!_supaClient,
    auth: {
      signInWithPassword: (opts) => client.auth.signInWithPassword(opts),
      signUp: (opts) => client.auth.signUp(opts),
      signOut: (opts) => client.auth.signOut(opts),
      signInWithOAuth: (opts) => client.auth.signInWithOAuth(opts),
      getSession: () => client.auth.getSession(),
      getUser: () => client.auth.getUser(),
      onAuthStateChange: (cb) => client.auth.onAuthStateChange(cb),
      resetPasswordForEmail: (email, opts) =>
        client.auth.resetPasswordForEmail(email, opts),
      updateUser: (opts) => client.auth.updateUser(opts),
      refreshSession: (opts) => client.auth.refreshSession(opts),
      setSession: (opts) => client.auth.setSession(opts),
      exchangeCodeForSession: (code) => client.auth.exchangeCodeForSession(code),
      linkIdentity: (opts) => client.auth.linkIdentity(opts),
      unlinkIdentity: (identity) => client.auth.unlinkIdentity(identity),
    },
    table: (name) => client.from(name),
    rpc: (fn, params) => {
      if (typeof client.rpc === "function") {
        return client.rpc(fn, params);
      }
      return Promise.resolve({
        data: null,
        error: { message: "Offline: RPC tidak tersedia" },
      });
    },
  };

  if (win) {
    win.SUPABASE_URL = SUPABASE_URL;
    win.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
    win._authStorage = storage;
    win._supa = client;
    win.DB = _dbAdapter;
  }

  return _dbAdapter;
}

export function getDB(): DbAdapterLike | null {
  return _dbAdapter || initDbAdapter();
}

export function getSupaClient(): RawSupabaseClient | null {
  if (!_supaClient) initDbAdapter();
  return _supaClient;
}

export const getSupa = getSupaClient;
