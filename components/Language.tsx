"use client";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Converter } from "opencc-js";
import simplified from "../lib/iching/data/simplified.json";
import { STORAGE_KEYS } from "../lib/storage";
export type Language = "simplified" | "traditional";
const simplify = Converter({ from: "t", to: "cn" });
// Preserve the qián glyph in hexagram names and reading notes.
const toSimple = (text: string) =>
  text
    .split("乾")
    .map((part) => simplify(part))
    .join("乾");
const toTraditional = Converter({ from: "cn", to: "t" });
const LanguageContext = createContext<{
  language: Language;
  setLanguage: (l: Language) => void;
}>({ language: "simplified", setLanguage: () => {} });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("simplified");
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.language) === "traditional") {
        // Apply the browser preference after hydration; the exported HTML defaults to simplified.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState("traditional");
        document.documentElement.lang = "zh-Hant";
      }
    } catch {
      /* Reading remains available when browser storage is disabled. */
    }
  }, []);
  function setLanguage(l: Language) {
    setLanguageState(l);
    document.documentElement.lang = l === "simplified" ? "zh-Hans" : "zh-Hant";
    try {
      localStorage.setItem(STORAGE_KEYS.language, l);
    } catch {
      /* Preference is optional. */
    }
  }
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
/** Translate presentation text only. Never transform field values, links, or private records. */
export function Localize({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const convert = language === "simplified" ? toSimple : toTraditional;
  function visit(node: ReactNode): ReactNode {
    return Children.map(node, (child) => {
      if (typeof child === "string") return convert(child);
      if (!isValidElement<Record<string, unknown>>(child)) return child;
      if (child.props["data-verbatim"]) return child;
      const props: Record<string, unknown> = {};
      for (const key of ["aria-label", "title", "placeholder"])
        if (typeof child.props[key] === "string")
          props[key] = convert(child.props[key] as string);
      return cloneElement(
        child,
        props,
        visit(child.props.children as ReactNode),
      );
    });
  }
  return <>{visit(children)}</>;
}
export function Classic({ text }: { text: string }) {
  const { language } = useLanguage();
  return (
    <span data-verbatim>
      {language === "simplified"
        ? ((simplified as Record<string, string>)[text] ?? text)
        : text}
    </span>
  );
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div className="language-switch" aria-label="简繁切换">
      <button
        aria-label="切换为简体中文"
        aria-pressed={language === "simplified"}
        onClick={() => setLanguage("simplified")}
      >
        简
      </button>
      <span aria-hidden="true">|</span>
      <button
        aria-label="切換為繁體中文"
        aria-pressed={language === "traditional"}
        onClick={() => setLanguage("traditional")}
      >
        繁
      </button>
    </div>
  );
}
