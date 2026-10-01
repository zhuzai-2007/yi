import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./v2.css";
import "./v3.css";
import "./v4.css";
import "./v4-1.css";
import { LanguageProvider } from "../components/Language";
import Shell from "../components/Shell";
import PwaRegistration from "../components/PwaRegistration";
import { sitePath } from "../lib/navigation";
export const metadata: Metadata = {
  title: "周易 · 经传与结构",
  description:
    "输入六爻，查看《周易》经传与卦象结构。原典阅读器与确定性结构计算器。",
  manifest: sitePath("/manifest.webmanifest"),
  icons: {
    icon: [{ url: sitePath("/icon.svg"), type: "image/svg+xml" }],
    apple: [
      {
        url: sitePath("/icons/yi-touch-180.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: { capable: true, title: "周易", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#f6f3ec" };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <PwaRegistration swUrl={sitePath("/sw.js")} scope={sitePath("/")} />
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
