export type NavIconKey =
  | "layout-dashboard"
  | "circle-plus"
  | "book"
  | "banknote"
  | "receipt"
  | "shopping-cart"
  | "library"
  | "scale"
  | "trending-up"
  | "landmark"
  | "arrow-left-right"
  | "area-chart"
  | "bar-chart-3"
  | "package"
  | "list"
  | "factory"
  | "users"
  | "building-2"
  | "candlestick-chart"
  | "ruler"
  | "zap"
  | "refresh-cw"
  | "file-spreadsheet"
  | "clock"
  | "file-text"
  | "clipboard-list"
  | "git-compare"
  | "circle-dollar-sign"
  | "bell"
  | "target"
  | "receipt-text"
  | "graduation-cap"
  | "bot"
  | "shield-check"
  | "upload"
  | "moon"
  | "log-in"
  | "settings"
  | "truck";

export type NavCardAction =
  | { type: "page"; pageId: string }
  | {
      type: "global";
      fn: string;
      closeSidebarAfter?: boolean;
      dataAction?: string;
    };

export interface NavCardItem {
  id: string;
  label: string;
  icon: NavIconKey;
  action: NavCardAction;
  dataPage?: string;
  elementId?: string;
  iconId?: string;
  labelId?: string;
  accentClass?: string;
  defaultActive?: boolean;
}

export interface NavGroup {
  label: string;
  singleColumn?: boolean;
  items: readonly NavCardItem[];
}

export interface PageMeta {
  title: string;
  subtitle: string;
}
