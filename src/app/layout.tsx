import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAS | Software Akuntansi",
  description:
    "Software akuntansi lengkap: jurnal, laporan keuangan, invoice, pajak otomatis, analitik bisnis.",
  applicationName: "OAS Akuntansi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OAS",
  },
  verification: {
    google: "oFjtSELQXopEuDKY5zHTOu-yiMuQ9SwTbWNWyRLYPE8",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><polygon points='40,4 72,22 72,58 40,76 8,58 8,22' fill='%230D0D0D' stroke='%23A9C6DC' stroke-width='2.5'/><rect x='38.5' y='18' width='3' height='34' fill='%23FFD026'/><rect x='26' y='52' width='28' height='4' fill='%23EEF1F4'/><rect x='18' y='24' width='44' height='3' fill='%23A9C6DC'/><circle cx='40' cy='25.5' r='3.5' fill='%23FFD026'/><line x1='22' y1='27' x2='22' y2='39' stroke='%23A9C6DC' stroke-width='1.5'/><line x1='58' y1='27' x2='58' y2='39' stroke='%23A9C6DC' stroke-width='1.5'/><polygon points='13,40 31,40 28,44 16,44' fill='%23FFD026'/><polygon points='49,40 67,40 64,44 52,44' fill='%23EEF1F4'/></svg>",
    apple:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><polygon points='256,20 460,138 460,374 256,492 52,374 52,138' fill='%230D0D0D' stroke='%23A9C6DC' stroke-width='14'/><rect x='246' y='112' width='20' height='220' fill='%23FFD026'/><rect x='166' y='332' width='180' height='24' fill='%23EEF1F4'/><rect x='116' y='152' width='280' height='20' fill='%23A9C6DC'/></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const ANTI_GLITCH_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem('oas_theme');
    if (saved) {
      window.__initialTheme = saved;
    } else {
      window.__initialTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
    }
  } catch(e) { window.__initialTheme = 'dark'; }
  var isLight = window.__initialTheme === 'light';
  var bg = isLight ? '#EEF1F4' : '#0D0D0D';
  if (isLight) document.documentElement.classList.add('light-mode');
  else document.documentElement.classList.remove('light-mode');
  var agStyle = document.createElement('style');
  agStyle.id = 'anti-glitch-style';
  agStyle.textContent = 'html,body{background:' + bg + ' !important;overflow:hidden;}';
  document.head.appendChild(agStyle);
  var metaTC = document.getElementById('meta-theme-color');
  if (metaTC) metaTC.setAttribute('content', bg);
  var metaCS = document.getElementById('meta-color-scheme');
  if (metaCS) metaCS.setAttribute('content', isLight ? 'light' : 'dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="theme-color"
          id="meta-theme-color"
          content="#0D0D0D"
          suppressHydrationWarning
        />
        <meta
          name="color-scheme"
          id="meta-color-scheme"
          content="dark light"
          suppressHydrationWarning
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Script id="oas-anti-glitch" strategy="beforeInteractive">
          {ANTI_GLITCH_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
