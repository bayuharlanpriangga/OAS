"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const STATUS_BREAKPOINTS: Array<[number, string]> = [
  [0, "Memuat akun..."],
  [8, "Inisialisasi jurnal..."],
  [20, "Memuat data tersimpan..."],
  [35, "Menyiapkan laporan..."],
  [52, "Memuat kalkulator..."],
  [68, "Menyiapkan AI Orias..."],
  [80, "Menyelesaikan setup..."],
  [92, "Siap!"],
];

interface LoadingOverlayProps {
  scriptsReady: boolean;
}

export default function LoadingOverlay({ scriptsReady }: LoadingOverlayProps) {
  const [pct, setPct] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [isLight, setIsLight] = useState(false);

  useLayoutEffect(() => {
    try {
      const theme =
        (window as unknown as { __initialTheme?: string }).__initialTheme ||
        localStorage.getItem("oas_theme") ||
        "dark";
      setIsLight(theme === "light");
    } catch {
      setIsLight(false);
    }
  }, []);

  useEffect(() => {
    if (removed) return;

    const timer = window.setInterval(() => {
      setPct((prev) => {
        if (prev >= 100) return 100;
        // Hold at 92% until runtime scripts finish loading
        if (prev >= 92 && !scriptsReady) return 92;
        if (scriptsReady && prev >= 88) return Math.min(100, prev + 4);
        return prev + 1;
      });
    }, 28);

    return () => window.clearInterval(timer);
  }, [scriptsReady, removed]);

  useEffect(() => {
    if (pct < 100) return;

    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
      const removeTimer = window.setTimeout(() => {
        setRemoved(true);
        try {
          document.getElementById("anti-glitch-style")?.remove();
        } catch {}
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
      }, 500);
      return () => window.clearTimeout(removeTimer);
    }, 200);

    return () => window.clearTimeout(fadeTimer);
  }, [pct]);

  if (removed) return null;

  const bg = isLight ? "#f8fafc" : "#0d0f14";
  const surface = isLight ? "#ffffff" : "#1c2030";
  const accent = isLight ? "#16a34a" : "#4ade80";
  const accent2 = isLight ? "#0891b2" : "#22d3ee";
  const textColor = isLight ? "#0f172a" : "#e2e8f0";
  const mutedColor = "#64748b";
  const trackBg = isLight ? "#e2e8f0" : "#252a3a";
  const plateTextColor = isLight ? "#ffffff" : "#0d0f14";

  let statusMsg = STATUS_BREAKPOINTS[0][1];
  for (let i = 0; i < STATUS_BREAKPOINTS.length; i++) {
    if (pct >= STATUS_BREAKPOINTS[i][0]) {
      statusMsg = STATUS_BREAKPOINTS[i][1];
    }
  }

  return (
    <div
      id="app-loading"
      className={fadingOut ? "fade-out" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        background: bg,
        color: textColor,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div id="loading-logo-wrap" style={{ marginBottom: "18px" }}>
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            id="loading-logo-svg"
          >
            <circle
              className="logo-part"
              style={{ ["--part-delay" as string]: "0ms" }}
              cx="40"
              cy="40"
              r="38"
              id="logo-bg-circle"
              fill={surface}
              stroke={accent}
              strokeWidth="1.5"
            />
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "110ms" }}
              x="38.5"
              y="16"
              width="3"
              height="36"
              rx="1.5"
              fill="#4ade80"
            />
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "190ms" }}
              x="26"
              y="51"
              width="28"
              height="4"
              rx="2"
              fill="#4ade80"
            />
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "260ms" }}
              x="30"
              y="55"
              width="20"
              height="3"
              rx="1.5"
              fill="#4ade80"
              opacity="0.7"
            />
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "340ms" }}
              x="18"
              y="22"
              width="44"
              height="3"
              rx="1.5"
              fill="#22d3ee"
            />
            <circle
              className="logo-part"
              style={{ ["--part-delay" as string]: "420ms" }}
              cx="40"
              cy="23.5"
              r="3"
              fill="#f59e0b"
            />
            <line
              className="logo-part"
              style={{ ["--part-delay" as string]: "500ms" }}
              x1="22"
              y1="25"
              x2="22"
              y2="37"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              className="logo-part"
              style={{ ["--part-delay" as string]: "500ms" }}
              x1="58"
              y1="25"
              x2="58"
              y2="37"
              stroke="#22d3ee"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <ellipse
              className="logo-part"
              style={{ ["--part-delay" as string]: "590ms" }}
              cx="22"
              cy="38.5"
              rx="9"
              ry="3"
              fill="#4ade80"
              opacity="0.85"
            />
            <ellipse
              className="logo-part"
              style={{ ["--part-delay" as string]: "590ms" }}
              cx="58"
              cy="38.5"
              rx="9"
              ry="3"
              fill="#4ade80"
              opacity="0.85"
            />
            <text
              className="logo-part"
              style={{ ["--part-delay" as string]: "680ms" }}
              x="22"
              y="37.5"
              textAnchor="middle"
              fill={plateTextColor}
              id="logo-rp-text"
              fontSize="7"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              Rp
            </text>
            <text
              className="logo-part"
              style={{ ["--part-delay" as string]: "680ms" }}
              x="58"
              y="37.5"
              textAnchor="middle"
              fill={plateTextColor}
              id="logo-eq-text"
              fontSize="8"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              =
            </text>
          </svg>
        </div>
        <div
          id="loading-company-name"
          style={{
            fontSize: "22px",
            fontWeight: 800,
            letterSpacing: "0.02em",
            fontFamily: "'IBM Plex Mono', monospace",
            color: textColor,
          }}
        >
          OAS
        </div>
        <div
          id="loading-subtitle"
          style={{
            fontSize: "12px",
            marginTop: "6px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: mutedColor,
          }}
        >
          Orias Accounting System
        </div>
      </div>

      <div style={{ width: "240px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
          }}
        >
          <span
            id="loading-status"
            style={{
              fontSize: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              color: mutedColor,
            }}
          >
            {statusMsg}
          </span>
          <span
            id="loading-pct"
            style={{
              fontSize: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              color: accent,
            }}
          >
            {pct}%
          </span>
        </div>
        <div
          id="loading-bar-track"
          style={{
            height: "4px",
            borderRadius: "2px",
            overflow: "hidden",
            background: trackBg,
          }}
        >
          <div
            id="loading-bar"
            style={{
              height: "100%",
              width: `${pct}%`,
              background: `linear-gradient(90deg,${accent},${accent2})`,
              borderRadius: "2px",
              transition: "width 0.25s ease",
            }}
          />
        </div>
      </div>

      <div
        id="loading-version"
        style={{
          position: "absolute",
          bottom: "32px",
          fontSize: "11px",
          color: isLight ? "#94a3b8" : "#334155",
        }}
      >
        Powered by{" "}
        <span
          id="loading-orias-accent"
          style={{ color: accent, fontWeight: 700 }}
        >
          Orias
        </span>
      </div>
    </div>
  );
}
