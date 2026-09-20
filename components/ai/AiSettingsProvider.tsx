"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AI_KEYS,
  DEFAULT_CONFIG,
  readConfig,
  saveConfig,
  clearConfig,
} from "../../lib/ai/storage";
import type { AiConfig } from "../../lib/ai/types";
import { Localize } from "../Language";
import { AiSettings } from "./AiSettings";
const SettingsContext = createContext({
  config: DEFAULT_CONFIG,
  openSettings: () => {},
  cacheRevision: 0,
});
export const useAiSettings = () => useContext(SettingsContext);
export function AiSettingsProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [opened, setOpened] = useState(false),
    [note, setNote] = useState(""),
    [cacheRevision, setCacheRevision] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    function read() {
      try {
        setConfig(readConfig(sessionStorage, localStorage));
      } catch {
        setNote("浏览器存储不可用，设置仅保留在当前页面。");
      }
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  useEffect(() => {
    if (!opened) return;
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      opener.current?.focus({ preventScroll: true });
    };
  }, [opened]);
  function update(next: AiConfig) {
    setConfig(next);
    setNote("");
    try {
      saveConfig(sessionStorage, localStorage, next);
    } catch {
      setNote("设置未能完整保存，请检查浏览器存储权限；当前页面仍可使用。");
    }
  }
  return (
    <SettingsContext.Provider
      value={{
        config,
        cacheRevision,
        openSettings: () => {
          opener.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          setOpened(true);
        },
      }}
    >
      {children}
      {opened && (
        <dialog
          ref={dialog}
          className="settings-dialog"
          aria-labelledby="settings-title"
          onCancel={() => setOpened(false)}
          onClose={() => setOpened(false)}
        >
          <Localize>
            <div className="settings-heading">
              <h2 id="settings-title">设置</h2>
              <button
                autoFocus
                onClick={() => setOpened(false)}
                aria-label="关闭设置"
              >
                关闭
              </button>
            </div>
            <AiSettings
              config={config}
              onChange={update}
              disabled={false}
              onClear={() => {
                try {
                  clearConfig(sessionStorage, localStorage);
                  setConfig({ ...DEFAULT_CONFIG });
                  setNote("已清除 AI 配置和保存的 API Key。");
                } catch {
                  setNote("无法完整清除 AI 配置，请检查浏览器存储权限。");
                }
              }}
              onClearCache={() => {
                try {
                  localStorage.removeItem(AI_KEYS.cache);
                  setCacheRevision((v) => v + 1);
                  setNote("已清除 AI 解读缓存。");
                } catch {
                  setNote("无法清除缓存，请检查浏览器存储权限。");
                }
              }}
            />
            <p role="status" className="small">
              {note}
            </p>
          </Localize>
        </dialog>
      )}
    </SettingsContext.Provider>
  );
}
export function SettingsButton() {
  const { openSettings } = useAiSettings();
  return (
    <Localize>
      <button onClick={openSettings} aria-haspopup="dialog">
        设置
      </button>
    </Localize>
  );
}
