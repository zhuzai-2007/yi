"use client";
import { AiSettingsProvider, SettingsButton } from "./ai/AiSettingsProvider";

import Link from "./SiteLink";
import { usePathname } from "next/navigation";
import { LanguageSwitch, Localize } from "./Language";
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AiSettingsProvider>
      <Localize>
        <a className="skip-link" href="#main">
          跳至主要内容
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="周易首页">
            <span className="seal">易</span>
            <span>
              周易 <small>经传与结构</small>
            </span>
          </Link>
          <nav className="main-nav" aria-label="主导航">
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
              起卦
            </Link>
            <Link
              href="/records/"
              aria-current={pathname === "/records/" ? "page" : undefined}
            >
              卦例
            </Link>
            <SettingsButton />
            <LanguageSwitch />
          </nav>
        </header>
      </Localize>
      <main
        className={`page v2-page ${/\/record\/?$/.test(pathname) ? "result-page" : ""}`}
        id="main"
      >
        {children}
      </main>
      <Localize>
        <footer>
          <span>周易 · 经传阅读与结构计算</span>
          <span>
            文本：维基文库贡献者 ·{" "}
            <a
              href="https://creativecommons.org/licenses/by-sa/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY-SA 4.0
            </a>
          </span>
        </footer>
      </Localize>
    </AiSettingsProvider>
  );
}
