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

  const bg = isLight ? "#EEF1F4" : "#0D0D0D";
  const surface = isLight ? "#FFFFFF" : "#141619";
  const accentText = isLight ? "#7A5C00" : "#D4A72C";
  const accentFill = "#D4A72C";
  const es = isLight ? "#4F7A99" : "#A9C6DC";
  const textColor = isLight ? "#0D0D0D" : "#EEF1F4";
  const mutedColor = isLight ? "#4A5663" : "rgba(238,241,244,0.70)";
  const trackBg = isLight ? "rgba(79,122,153,0.22)" : "rgba(169,198,220,0.20)";
  const plateTextColor = "#0D0D0D";
  const versionColor = isLight ? "#4A5663" : "rgba(238,241,244,0.55)";

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
            {/* Crystal facet octagonal chamfered frame */}
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "0ms" }}
              points="16,4 64,4 76,16 76,64 64,76 16,76 4,64 4,16"
              id="logo-bg-circle"
              fill={surface}
              stroke={es}
              strokeWidth="1.5"
            />
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "60ms" }}
              points="58,4 76,22 76,16 64,4"
              fill={accentFill}
            />
            {/* Pillar & base */}
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "110ms" }}
              x="38.5"
              y="17"
              width="3"
              height="36"
              fill={es}
            />
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "190ms" }}
              points="28,53 52,53 56,57 24,57"
              fill={es}
            />
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "260ms" }}
              x="30"
              y="59"
              width="20"
              height="2.5"
              fill={es}
              opacity="0.65"
            />
            {/* Balance beam */}
            <rect
              className="logo-part"
              style={{ ["--part-delay" as string]: "340ms" }}
              x="17"
              y="22.5"
              width="46"
              height="2.5"
              fill={textColor}
            />
            {/* Center Emas facet fulcrum diamond */}
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "420ms" }}
              points="40,19 44.5,23.5 40,28 35.5,23.5"
              fill={accentFill}
            />
            {/* Suspension lines */}
            <line
              className="logo-part"
              style={{ ["--part-delay" as string]: "500ms" }}
              x1="22"
              y1="25"
              x2="22"
              y2="37"
              stroke={es}
              strokeWidth="1.5"
            />
            <line
              className="logo-part"
              style={{ ["--part-delay" as string]: "500ms" }}
              x1="58"
              y1="25"
              x2="58"
              y2="37"
              stroke={es}
              strokeWidth="1.5"
            />
            {/* Flat Emas balance plates with Tinta text (8.7:1 contrast) */}
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "590ms" }}
              points="13,36 31,36 28,45 16,45"
              fill={accentFill}
            />
            <polygon
              className="logo-part"
              style={{ ["--part-delay" as string]: "590ms" }}
              points="49,36 67,36 64,45 52,45"
              fill={accentFill}
            />
            <text
              className="logo-part"
              style={{ ["--part-delay" as string]: "680ms" }}
              x="22"
              y="42.5"
              textAnchor="middle"
              fill={plateTextColor}
              id="logo-rp-text"
              fontSize="7"
              fontWeight="700"
              fontFamily="'IBM Plex Mono', monospace"
            >
              Rp
            </text>
            <text
              className="logo-part"
              style={{ ["--part-delay" as string]: "680ms" }}
              x="58"
              y="42.5"
              textAnchor="middle"
              fill={plateTextColor}
              id="logo-eq-text"
              fontSize="8"
              fontWeight="700"
              fontFamily="'IBM Plex Mono', monospace"
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
              fontVariantNumeric: "tabular-nums",
              color: accentText,
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
              background: accentFill,
              borderRadius: "2px",
              transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
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
          color: versionColor,
        }}
      >
        Powered by{" "}
        <span
          id="loading-orias-accent"
          style={{ color: accentText, fontWeight: 700 }}
        >
          Orias
        </span>
      </div>
    </div>
  );
}
