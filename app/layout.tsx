import type { Metadata } from "next";
import "./globals.css";
import "./v2.css";
import { LanguageProvider } from "../components/Language";
import Shell from "../components/Shell";
export const metadata: Metadata = {
  title: "周易 · 经传与结构",
  description:
    "输入六爻，查看《周易》经传与卦象结构。原典阅读器与确定性结构计算器。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>
          <Shell>{children}</Shell>
        </LanguageProvider>
      </body>
    </html>
  );
}
