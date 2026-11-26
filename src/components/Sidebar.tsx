"use client";

import type { ComponentType } from "react";
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
  Truck,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { NAV_GROUPS } from "@/config/navigation";
import { callOasGlobal } from "@/lib/shared/legacy-store";
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
  truck: Truck,
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
          <div className="logo-brand">
            <span className="logo-facet" aria-hidden="true" />
            <span>OAS</span>
            <span className="logo-sub">Akuntansi</span>
          </div>
          <button
            type="button"
            className="logo-close"
            aria-label="Tutup menu"
            onClick={() => callOasGlobal("closeSidebar")}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div id="sidebar-account-area" className="sidebar-account-area">
          <div id="acc-switch-wrap" className="acc-switch-wrap">
            <div
              id="user-company-chip"
              onClick={() => callOasGlobal("toggleAccountSwitcher")}
              title="Ganti akun atau riwayat login"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  callOasGlobal("toggleAccountSwitcher");
                }
              }}
            >
              <div
                className="chip-avatar"
                id="chip-avatar"
                suppressHydrationWarning
              >
                ?
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="chip-name"
                  id="chip-company-name"
                  suppressHydrationWarning
                >
                  Memuat...
                </div>
                <div
                  id="chip-sub"
                  suppressHydrationWarning
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    lineHeight: 1.25,
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
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.2 }}>
                Bisnis aktif
              </div>
              <div
                id="sidebar-bisnis-aktif"
                suppressHydrationWarning
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--text)",
                }}
              >
                -
              </div>
            </div>
            <ChevronDown
              size={14}
              strokeWidth={2}
              style={{ color: "var(--accent2)", flexShrink: 0 }}
            />
          </button>
        </div>

        <nav className="nav" aria-label="Navigasi utama">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <div className="nav-group-label">{group.label}</div>
              <div className={group.singleColumn ? "nav-grid single" : "nav-grid"}>
                {group.items.map((item) => {
                  const IconComponent = NAV_ICON_MAP[item.icon];
                  const classes = [
                    "nav-card",
                    item.defaultActive ? "active" : "",
                    item.accentClass ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <button
                      type="button"
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
                      >
                        <IconComponent size={16} strokeWidth={1.9} />
                      </span>
                      {item.labelId ? (
                        <span id={item.labelId} suppressHydrationWarning>
                          {item.label}
                        </span>
                      ) : (
                        <span>{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <div
              id="save-indicator"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--green)",
                fontWeight: 600,
              }}
            >
              <span
                id="save-dot"
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "1px",
                  transform: "rotate(45deg)",
                  background: "var(--green)",
                  display: "inline-block",
                }}
              />
              <span id="save-text" suppressHydrationWarning>
                Tersimpan
              </span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              OAS
            </span>
          </div>

          <button
            type="button"
            id="pwa-install-btn"
            className="btn btn-ghost btn-sm"
            onClick={() => callOasGlobal("handlePwaInstall")}
            style={{ width: "100%", marginBottom: "6px" }}
          >
            <Download size={14} strokeWidth={2} style={{ color: "var(--accent2)" }} />
            <span id="pwa-btn-text" suppressHydrationWarning>
              Pasang aplikasi
            </span>
          </button>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
            }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => callOasGlobal("manualSave")}
              data-tooltip="Ctrl+S"
            >
              <Save size={13} strokeWidth={2} style={{ color: "var(--accent2)" }} />
              Simpan
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => callOasGlobal("openStorageModal")}
              data-tooltip="Kelola Data"
            >
              <FolderOpen size={13} strokeWidth={2} style={{ color: "var(--accent2)" }} />
              Kelola
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
