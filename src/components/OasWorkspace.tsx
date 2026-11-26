"use client";

import { useEffect, useState } from "react";
import {
  SUPABASE_URL,
  checkJoinCodeInURL,
  initDbAdapter,
  initLocalStorageFull,
  initMobileKeyboardScrollFix,
  initStorageLight,
  initSupabase,
  loadProfilToSidebar,
  logStartupAudit,
  showDemoModeBanner,
} from "@/lib/cloud";
import {
  initCurrentDateLabel,
  initGlobalShortcuts,
  initInfoPopoverHover,
  initNavigationLifecycle,
  initPullToRefresh,
  setupNumberInputs,
} from "@/lib/core";
import { registerOasCoreBridge } from "@/lib/shared/bridge";
import { callOasGlobal } from "@/lib/shared/legacy-store";
import LoadingOverlay from "./LoadingOverlay";

const EXTERNAL_SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
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
      initNavigationLifecycle();
      initInfoPopoverHover();
      initCurrentDateLabel();
      initGlobalShortcuts();
      initPullToRefresh();
      initMobileKeyboardScrollFix();
      setTimeout(setupNumberInputs, 400);

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

      initDbAdapter();
      logStartupAudit();

      if (SUPABASE_URL.includes("YOUR_PROJECT")) {
        initLocalStorageFull();
        loadProfilToSidebar();
        callOasGlobal("checkShowOnboarding");
        showDemoModeBanner();
      } else {
        initStorageLight();
        void initSupabase();
      }

      if (new URLSearchParams(window.location.search).has("join")) {
        void checkJoinCodeInURL();
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
