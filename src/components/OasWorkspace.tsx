"use client";

import { useEffect, useState } from "react";
import { registerOasCoreBridge } from "@/lib/bridge";
import LoadingOverlay from "./LoadingOverlay";

const EXTERNAL_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
];

const OAS_ENGINE_SCRIPTS = [
  "/js/00-db-adapter.js",
  "/js/01-state.js",
  "/js/02-utils.js",
  "/js/03-widgets.js",
  "/js/04-navigasi-tema.js",
  "/js/05-akun.js",
  "/js/06-transaksi.js",
  "/js/07-jurnal-laporan.js",
  "/js/08-kartu-stock.js",
  "/js/09-produk.js",
  "/js/10-aset-tetap.js",
  "/js/11-kontak-invoice.js",
  "/js/12-kalkulator.js",
  "/js/13-analitik-dashboard.js",
  "/js/14-export.js",
  "/js/15-storage.js",
  "/js/16-auth-company.js",
  "/js/17-profil-perusahaan.js",
  "/js/18-audit-permission.js",
  "/js/19-fitur-tambahan.js",
  "/js/20-ai-chat.js",
  "/js/21-settings.js",
  "/js/22-cloud-records.js",
  "/js/23-penomoran.js",
  "/js/24-aging.js",
  "/js/25-aging-ui.js",
  "/js/26-daftar-bisnis.js",
  "/js/27-oauth-url.js",
  "/js/28-bill.js",
  "/js/29-bill-ui.js",
  "/js/30-aging-hutang.js",
  "/js/31-pembayaran.js",
  "/js/32-pembayaran-ui.js",
  "/js/33-urut-jurnal.js",
  "/js/34-kartu-kontak.js",
  "/js/35-dok.js",
  "/js/36-penawaran-ui.js",
  "/js/37-pesanan-jual.js",
  "/js/38-pesanan-jual-ui.js",
  "/js/39-pesanan-invoice.js",
  "/js/99-init.js",
];

function loadScriptSequential(src: string, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timeout loading script: ${src}`));
    }, timeoutMs);

    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.body.appendChild(script);
  });
}

export default function OasWorkspace() {
  const [scriptsReady, setScriptsReady] = useState(false);

  useEffect(() => {
    const win = window as unknown as {
      __oasBooted?: boolean;
      supabase?: unknown;
    };
    if (win.__oasBooted) {
      setScriptsReady(true);
      return;
    }
    win.__oasBooted = true;

    let cancelled = false;

    async function bootOasRuntime() {
      registerOasCoreBridge();
      const host = window.location.hostname;
      const isDevPreview =
        host.startsWith("ais-dev-") ||
        host === "localhost" ||
        host === "127.0.0.1";

      // Clear any stale Service Worker from static pre-migration builds in dev preview
      if (isDevPreview && "serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        } catch {}
      }

      const domReadyQueue: Array<() => void> = [];
      const loadQueue: Array<() => void> = [];

      const origDocAdd = document.addEventListener.bind(document);
      const origWinAdd = window.addEventListener.bind(window);

      const needDomShim = document.readyState !== "loading";
      const needLoadShim = document.readyState === "complete";

      if (needDomShim) {
        document.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) {
          if (type === "DOMContentLoaded" && typeof listener === "function") {
            domReadyQueue.push(() =>
              listener.call(document, new Event("DOMContentLoaded"))
            );
            return;
          }
          return origDocAdd(type, listener, options);
        } as typeof document.addEventListener;

        window.addEventListener = function (
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) {
          if (type === "DOMContentLoaded" && typeof listener === "function") {
            domReadyQueue.push(() =>
              listener.call(window, new Event("DOMContentLoaded"))
            );
            return;
          }
          if (
            needLoadShim &&
            type === "load" &&
            typeof listener === "function"
          ) {
            loadQueue.push(() => listener.call(window, new Event("load")));
            return;
          }
          return origWinAdd(type, listener, options);
        } as typeof window.addEventListener;
      }

      try {
        for (const src of EXTERNAL_SCRIPTS) {
          try {
            await loadScriptSequential(src, 4000);
          } catch (err) {
            console.warn("[OAS Next] CDN script warning:", src, err);
          }
        }

        if (!win.supabase) {
          win.supabase = {
            createClient: () => ({
              auth: {
                signInWithPassword: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                signUp: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                signOut: async () => ({ error: null }),
                signInWithOAuth: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                getSession: async () => ({
                  data: { session: null },
                  error: null,
                }),
                getUser: async () => ({ data: { user: null }, error: null }),
                onAuthStateChange: () => ({
                  data: { subscription: { unsubscribe: () => {} } },
                }),
                resetPasswordForEmail: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                updateUser: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                refreshSession: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                setSession: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                exchangeCodeForSession: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                linkIdentity: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
                unlinkIdentity: async () => ({
                  data: null,
                  error: { message: "Offline" },
                }),
              },
              from: () => ({
                select: () => ({
                  eq: () => ({
                    single: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }

        for (const src of OAS_ENGINE_SCRIPTS) {
          try {
            await loadScriptSequential(src, 10000);
          } catch (err) {
            console.error("[OAS Next] Engine script error:", src, err);
          }
        }
      } finally {
        if (needDomShim) {
          document.addEventListener = origDocAdd;
          window.addEventListener = origWinAdd;
        }
      }

      for (const cb of domReadyQueue) {
        try {
          cb();
        } catch (err) {
          console.error("[OAS Next] DOMContentLoaded hook error:", err);
        }
      }

      for (const cb of loadQueue) {
        try {
          cb();
        } catch (err) {
          console.error("[OAS Next] load hook error:", err);
        }
      }

      if (!isDevPreview && "serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("SW register gagal:", err));
      }

      if (!cancelled) {
        setScriptsReady(true);
      }
    }

    bootOasRuntime().catch((err) => {
      console.error("[OAS Next] Boot error:", err);
      if (!cancelled) setScriptsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return <LoadingOverlay scriptsReady={scriptsReady} />;
}
