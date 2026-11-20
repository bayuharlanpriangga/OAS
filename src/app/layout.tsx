import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAS — Software Akuntansi",
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
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><circle cx='40' cy='40' r='40' fill='%23ffffff'/><rect x='38.5' y='16' width='3' height='36' rx='1.5' fill='%234ade80'/><rect x='26' y='51' width='28' height='4' rx='2' fill='%234ade80'/><rect x='30' y='55' width='20' height='3' rx='1.5' fill='%234ade80' opacity='0.7'/><rect x='18' y='22' width='44' height='3' rx='1.5' fill='%2322d3ee'/><circle cx='40' cy='23.5' r='3' fill='%23f59e0b'/><line x1='22' y1='25' x2='22' y2='37' stroke='%2322d3ee' stroke-width='1.5' stroke-linecap='round'/><line x1='58' y1='25' x2='58' y2='37' stroke='%2322d3ee' stroke-width='1.5' stroke-linecap='round'/><ellipse cx='22' cy='38.5' rx='9' ry='3' fill='%234ade80' opacity='0.85'/><ellipse cx='58' cy='38.5' rx='9' ry='3' fill='%234ade80' opacity='0.85'/><text x='22' y='37.5' text-anchor='middle' fill='%230d0f14' font-size='7' font-weight='bold' font-family='sans-serif'>Rp</text><text x='58' y='37.5' text-anchor='middle' fill='%230d0f14' font-size='8' font-weight='bold' font-family='sans-serif'>=</text></svg>",
    apple:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><circle cx='256' cy='256' r='256' fill='%230d0f14'/><rect x='246' y='100' width='20' height='230' rx='10' fill='%234ade80'/><rect x='166' y='326' width='180' height='26' rx='13' fill='%234ade80'/><rect x='116' y='140' width='280' height='20' rx='10' fill='%2322d3ee'/></svg>",
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
  var bg = isLight ? '#f8fafc' : '#0d0f14';
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
        <meta name="theme-color" id="meta-theme-color" content="#0d0f14" />
        <meta name="color-scheme" id="meta-color-scheme" content="dark" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Script id="oas-anti-glitch" strategy="beforeInteractive">
          {ANTI_GLITCH_SCRIPT}
        </Script>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
