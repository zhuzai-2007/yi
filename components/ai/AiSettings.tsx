import { useId, useState } from "react";
import type { AiConfig } from "../../lib/ai/types";
import { Localize } from "../Language";
export function AiSettings({
  config,
  onChange,
  onClear,
  onClearCache,
  disabled,
}: {
  config: AiConfig;
  onChange: (config: AiConfig) => void;
  onClear: () => void;
  onClearCache: () => void;
  disabled: boolean;
}) {
  const id = useId(),
    [visible, setVisible] = useState(false);
  return (
    <Localize>
      <section className="ai-settings">
        <h3>AI 服务</h3>
        <fieldset disabled={disabled}>
          <label htmlFor={`${id}-endpoint-mode`}>接口地址类型</label>
          <select
            id={`${id}-endpoint-mode`}
            value={config.endpointMode}
            onChange={(e) =>
              onChange({
                ...config,
                endpointMode: e.target.value as AiConfig["endpointMode"],
              })
            }
          >
            <option value="base">Base URL</option>
            <option value="full">完整接口地址</option>
          </select>
          <label htmlFor={`${id}-endpoint`}>API Endpoint / Base URL</label>
          <input
            id={`${id}-endpoint`}
            type="url"
            value={config.endpoint}
            autoComplete="off"
            placeholder="https://api.example.com/v1/chat/completions"
            onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
          />
          <p className="small muted">
            {config.endpointMode === "base"
              ? "在此地址后拼接 /chat/completions；如需 /v1，请包含在地址中。"
              : "使用完整 Chat Completions URL，不再拼接路径。"}
          </p>
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
            value={config.outputFormat}
            onChange={(e) =>
              onChange({
                ...config,
                outputFormat: e.target.value as AiConfig["outputFormat"],
              })
            }
          >
            <option value="auto">自动</option>
            <option value="json_schema">JSON Schema</option>
            <option value="json_object">JSON only</option>
          </select>
          <p className="small muted">
            自动优先采用兼容性较好的 JSON
            only；所有格式均检查内容完整性与引用来源。
          </p>
          <h3>数据</h3>
          <button type="button" onClick={onClearCache}>
            清除 AI 解读缓存
          </button>
          <button type="button" onClick={onClear}>
            清除 AI 配置
          </button>
        </fieldset>
        <p className="small muted">
          卦例本身仍保存在你的浏览器中。只有在你主动生成 AI
          解读时，本次相关卦象材料和所问内容才会发送至你配置的 API。
        </p>
      </section>
    </Localize>
  );
}
