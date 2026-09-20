import { useId, useState } from "react";
import type { AiConfig } from "../../lib/ai/types";
import { Localize } from "../Language";
export function AiSettings({
  config,
  onChange,
  onClear,
  disabled,
}: {
  config: AiConfig;
  onChange: (config: AiConfig) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const id = useId(),
    [visible, setVisible] = useState(false);
  return (
    <Localize>
      <details className="ai-settings">
        <summary>AI 设置</summary>
        <fieldset disabled={disabled}>
          <label htmlFor={`${id}-endpoint`}>API Endpoint</label>
          <input
            id={`${id}-endpoint`}
            type="url"
            value={config.endpoint}
            autoComplete="off"
            placeholder="https://api.example.com/v1/chat/completions"
            onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
          />
          <p className="small muted">填写完整的 chat completions 接口地址。</p>
          <label htmlFor={`${id}-model`}>Model</label>
          <input
            id={`${id}-model`}
            value={config.model}
            maxLength={200}
            autoComplete="off"
            placeholder="模型名称"
            onChange={(e) => onChange({ ...config, model: e.target.value })}
          />
          <label htmlFor={`${id}-key`}>API Key</label>
          <div className="ai-key-field">
            <input
              id={`${id}-key`}
              type={visible ? "text" : "password"}
              value={config.apiKey}
              maxLength={4000}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
            />
            <button
              type="button"
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? "隐藏" : "显示"}
            </button>
          </div>
          <label className="ai-checkbox">
            <input
              type="checkbox"
              checked={config.remember}
              onChange={(e) =>
                onChange({ ...config, remember: e.target.checked })
              }
            />
            在此设备记住 API Key
          </label>
          <p className="small muted">
            API Key 仅保存在当前浏览器中，并会直接发送到你配置的 API
            Endpoint。公共设备请勿保存。
          </p>
          {config.remember && (
            <p className="small">API Key 将保存在此浏览器本地存储中。</p>
          )}
          <label htmlFor={`${id}-format`}>输出格式</label>
          <select
            id={`${id}-format`}
            value={config.structured ? "schema" : "json"}
            onChange={(e) =>
              onChange({ ...config, structured: e.target.value === "schema" })
            }
          >
            <option value="schema">JSON Schema · 推荐</option>
            <option value="json">JSON-only · 兼容模式</option>
          </select>
          <p className="small muted">
            接口不支持 JSON Schema 时可切换；两种格式都执行本地严格校验。
          </p>
          <button type="button" onClick={onClear}>
            清除 AI 设置
          </button>
        </fieldset>
        <p className="small muted">
          卦例本身仍保存在你的浏览器中。只有在你主动生成 AI
          解读时，本次相关卦象材料和所问内容才会发送至你配置的 API。
        </p>
      </details>
    </Localize>
  );
}
