"use client";

import type { ComponentType } from "react";
import { motion } from "motion/react";
import {
  AreaChart,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  Book,
  Bot,
  Building2,
  CandlestickChart,
  ChevronDown,
  CircleDollarSign,
  CirclePlus,
  ClipboardList,
  Clock,
  Download,
  Factory,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  GitCompare,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  Library,
  List,
  LogIn,
  Moon,
  Package,
  Receipt,
  ReceiptText,
  RefreshCw,
  Ruler,
  Save,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { callOasGlobal } from "@/lib/legacy-actions";
import type { NavCardItem, NavIconKey } from "@/types";

interface IconProps {
  size?: number;
  strokeWidth?: number;
}

const NAV_ICON_MAP: Record<NavIconKey, ComponentType<IconProps>> = {
  "layout-dashboard": LayoutDashboard,
  "circle-plus": CirclePlus,
  book: Book,
  banknote: Banknote,
  receipt: Receipt,
  "shopping-cart": ShoppingCart,
  library: Library,
  scale: Scale,
  "trending-up": TrendingUp,
  landmark: Landmark,
  "arrow-left-right": ArrowLeftRight,
  "area-chart": AreaChart,
  "bar-chart-3": BarChart3,
  package: Package,
  list: List,
  factory: Factory,
  users: Users,
  "building-2": Building2,
  "candlestick-chart": CandlestickChart,
  ruler: Ruler,
  zap: Zap,
  "refresh-cw": RefreshCw,
  "file-spreadsheet": FileSpreadsheet,
  clock: Clock,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
  "git-compare": GitCompare,
  "circle-dollar-sign": CircleDollarSign,
  bell: Bell,
  target: Target,
  "receipt-text": ReceiptText,
  "graduation-cap": GraduationCap,
  bot: Bot,
  "shield-check": ShieldCheck,
  upload: Upload,
  moon: Moon,
  "log-in": LogIn,
  settings: Settings,
};

function handleNavCardClick(item: NavCardItem) {
  if (item.action.type === "page") {
    callOasGlobal("showPage", item.action.pageId);
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      callOasGlobal("closeSidebar");
    }
    return;
  }

  callOasGlobal(item.action.fn);
  if (
    item.action.closeSidebarAfter ||
    (typeof window !== "undefined" && window.innerWidth <= 768)
  ) {
    callOasGlobal("closeSidebar");
  }
}

export default function Sidebar() {
  return (
    <>
      <div
        className="sidebar-overlay"
        id="sidebar-overlay"
        onClick={() => callOasGlobal("closeSidebar")}
      />

      <aside className="sidebar" id="sidebar">
        <div className="logo">
          <span style={{ color: "var(--accent)", letterSpacing: "0.08em" }}>
            OAS
          </span>
          <button
            type="button"
            className="logo-close"
            aria-label="Tutup menu"
            onClick={() => callOasGlobal("closeSidebar")}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div
          id="sidebar-account-area"
          style={{
            padding: "10px 12px 6px",
            borderBottom: "1px solid var(--border)",
            position: "relative",
          }}
        >
          <div id="acc-switch-wrap" className="acc-switch-wrap">
            <div
              id="user-company-chip"
              onClick={() => callOasGlobal("toggleAccountSwitcher")}
              title="Ganti akun / riwayat login"
              style={{
                width: "100%",
                borderRadius: "10px",
                padding: "8px 12px",
                justifyContent: "flex-start",
                gap: "10px",
                maxWidth: "100%",
                cursor: "pointer",
              }}
            >
              <div
                className="chip-avatar"
                id="chip-avatar"
                suppressHydrationWarning
                style={{
                  width: "36px",
                  height: "36px",
                  fontSize: "14px",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                ?
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="chip-name"
                  id="chip-company-name"
                  suppressHydrationWarning
                  style={{ fontSize: "13px" }}
                >
                  Memuat...
                </div>
                <div
                  id="chip-sub"
                  suppressHydrationWarning
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    marginTop: "1px",
                  }}
                >
                  Info akun
                </div>
              </div>
              <ChevronDown
                size={14}
                strokeWidth={2}
                style={{ color: "var(--muted)", flexShrink: 0 }}
              />
            </div>

            <div
              id="account-switcher-panel"
              className="acc-switch-panel"
              suppressHydrationWarning
            />
          </div>

          <button
            type="button"
            id="sidebar-accs-btn"
            className="sidebar-accs-btn"
            onClick={() => callOasGlobal("handleChipClick")}
            style={{
              width: "100%",
              marginTop: "6px",
              padding: "7px 12px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "12px",
              fontFamily: "var(--sans)",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "15px" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  lineHeight: 1.2,
                }}
              >
                Bisnis aktif
              </div>
              <div
                id="sidebar-bisnis-aktif"
                suppressHydrationWarning
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                —
              </div>
            </div>
            <span
              style={{
                color: "var(--muted)",
                fontSize: "10px",
                flexShrink: 0,
              }}
            >
              ▾
            </span>
          </button>
        </div>

        <motion.nav
          className="nav"
          initial={{ opacity: 0.92 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              <div
                className={
                  group.singleColumn ? "nav-grid single" : "nav-grid"
                }
              >
                {group.items.map((item) => {
                  const IconComponent = NAV_ICON_MAP[item.icon];
                  const classes = [
                    "nav-card",
                    item.defaultActive ? "active" : "",
                    item.accentClass ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const isThemeCard = item.id === "theme";

                  return (
                    <div
                      key={item.id}
                      id={item.elementId}
                      className={classes}
                      data-page={item.dataPage}
                      data-oas-action={
                        item.action.type === "global"
                          ? item.action.dataAction
                          : undefined
                      }
                      suppressHydrationWarning
                      onClick={() => handleNavCardClick(item)}
                    >
                      <span
                        className="nav-card-icon"
                        id={item.iconId}
                        suppressHydrationWarning={Boolean(item.iconId)}
                        style={
                          isThemeCard ||
                          item.id === "user-mgmt" ||
                          item.id === "join-code" ||
                          item.id === "settings"
                            ? {
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }
                            : undefined
                        }
                      >
                        <IconComponent
                          size={isThemeCard ? 14 : 18}
                          strokeWidth={2}
                        />
                      </span>
                      {item.labelId ? (
                        <span id={item.labelId} suppressHydrationWarning>
                          {item.label}
                        </span>
                      ) : (
                        item.label
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.nav>

        <div className="sidebar-footer" style={{ padding: "10px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <span style={{ fontSize: "10px", opacity: 0.6 }}>
              Dev — Bayu Harlan Priangga
            </span>
            <div
              id="save-indicator"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "10px",
                color: "var(--accent)",
              }}
            >
              <span
                id="save-dot"
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  display: "inline-block",
                }}
              />
              <span id="save-text" suppressHydrationWarning>
                Tersimpan
              </span>
            </div>
          </div>

          <motion.button
            type="button"
            id="pwa-install-btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => callOasGlobal("handlePwaInstall")}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg,rgba(74,222,128,0.15),rgba(34,211,238,0.15))",
              border: "1px solid rgba(74,222,128,0.35)",
              borderRadius: "8px",
              padding: "8px 4px",
              fontSize: "12px",
              color: "var(--accent)",
              cursor: "pointer",
              fontFamily: "var(--sans)",
              fontWeight: 700,
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <Download size={14} strokeWidth={2.1} />
            <span id="pwa-btn-text" suppressHydrationWarning>
              Install App
            </span>
          </motion.button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => callOasGlobal("manualSave")}
              data-tooltip="Ctrl+S"
              style={{
                background: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.25)",
                borderRadius: "6px",
                padding: "6px 4px",
                fontSize: "11px",
                color: "var(--accent)",
                cursor: "pointer",
                fontFamily: "var(--sans)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Save size={13} strokeWidth={2} /> Simpan
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => callOasGlobal("openStorageModal")}
              data-tooltip="Kelola Data"
              style={{
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.25)",
                borderRadius: "6px",
                padding: "6px 4px",
                fontSize: "11px",
                color: "var(--accent2)",
                cursor: "pointer",
                fontFamily: "var(--sans)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <FolderOpen size={13} strokeWidth={2} /> Kelola
            </motion.button>
          </div>
        </div>
      </aside>
    </>
  );
}
