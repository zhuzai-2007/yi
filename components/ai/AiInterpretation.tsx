"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CastRecord } from "../../lib/casting";
import { changeLine, getYinYang, isMoving } from "../../lib/iching/core";
import { buildInterpretationContext } from "../../lib/ai/context";
import { generateInterpretation } from "../../lib/ai/generate";
import { OpenAICompatibleTransport } from "../../lib/ai/transport";
import { AiError } from "../../lib/ai/errors";
import { ValidationError } from "../../lib/ai/validator";
import { AI_PROMPT_VERSION } from "../../lib/ai/prompt";
import {
  cacheKey,
  clearConfig,
  DEFAULT_CONFIG,
  deleteInterpretation,
  loadInterpretation,
  readConfig,
  saveConfig,
  saveInterpretation,
} from "../../lib/ai/storage";
import type {
  AiConfig,
  CachedInterpretation,
  InterpretationMode,
} from "../../lib/ai/types";
import { Tabs } from "../result/Tabs";
import { Localize } from "../Language";
import { AiSettings } from "./AiSettings";
import { AiResult } from "./AiResult";
const modes = [
  { id: "plain", label: "白话导读" },
  { id: "classical", label: "原典细读" },
  { id: "question", label: "结合所问" },
];
export default function AiInterpretation({ record }: { record: CastRecord }) {
  const [mode, setMode] = useState<InterpretationMode>("plain"),
    [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [entry, setEntry] = useState<CachedInterpretation | null>(null),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [details, setDetails] = useState<string[]>([]),
    [note, setNote] = useState("");
  const request = useRef<AbortController | null>(null);
  const context = useMemo(
    () =>
      buildInterpretationContext(
        {
          bits: record.lines.map(getYinYang),
          changed: record.lines.map(changeLine),
          moving: record.lines.flatMap((v, i) => (isMoving(v) ? [i] : [])),
          question: record.question,
        },
        mode,
      ),
    [record, mode],
  );
  const key = cacheKey(record, mode, config.model);
  useEffect(() => {
    try {
      // Browser credentials are read only after hydration; this never sends a request.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConfig(readConfig(sessionStorage, localStorage));
    } catch {
      setNote("浏览器存储不可用；设置仅保留在当前页面。");
    }
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, []);
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    // Context changes invalidate in-flight work and revalidate cache against current facts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStage("");
    setError("");
    setDetails([]);
    try {
      setEntry(loadInterpretation(localStorage, key, context, config.model));
    } catch {
      setEntry(null);
    }
  }, [key, context, config.model]);
  function updateConfig(next: AiConfig) {
    setConfig(next);
    setNote("");
    try {
      saveConfig(sessionStorage, localStorage, next);
    } catch {
      setNote("设置未能完整保存，请检查浏览器存储权限；当前页面仍可使用。");
    }
  }
  async function generate() {
    if (request.current || (mode === "question" && !record.question.trim()))
      return;
    const controller = new AbortController();
    request.current = controller;
    setEntry(null);
    setError("");
    setDetails([]);
    setNote("");
    setStage("正在整理卦象材料……");
    // Bound a stalled provider; cleanup on completion, cancel, tab exit, or record change.
    const timeout = window.setTimeout(() => controller.abort(), 120000);
    try {
      const result = await generateInterpretation(
        new OpenAICompatibleTransport(config),
        context,
        controller.signal,
        setStage,
      );
      if (controller.signal.aborted || request.current !== controller) return;
      const fresh: CachedInterpretation = {
        result,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: config.model.trim(),
          mode,
          promptVersion: AI_PROMPT_VERSION,
        },
      };
      setEntry(fresh);
      try {
        saveInterpretation(localStorage, key, result, mode, config.model);
      } catch {
        setNote("解读已通过校验，但未能保存到本地。当前页面仍可阅读。");
      }
    } catch (e) {
      if (request.current !== controller) return;
      setError(
        e instanceof AiError || e instanceof ValidationError
          ? e.message
          : "AI 解读生成失败，请稍后重试。",
      );
      if (e instanceof ValidationError) setDetails(e.codes);
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setStage("");
      }
    }
  }
  return (
    <Localize>
      <section className="ai-interpretation">
        <p className="section-label">AI / 阅读辅助</p>
        <h2>AI 辅助解读</h2>
        <p className="ai-disclaimer">
          以下内容由 AI
          根据本次卦象、经典原文与结构信息生成，仅作为阅读和理解辅助，不构成确定性预测。
        </p>
        <AiSettings
          config={config}
          disabled={!!stage}
          onChange={updateConfig}
          onClear={() => {
            try {
              clearConfig(sessionStorage, localStorage);
              setConfig({ ...DEFAULT_CONFIG });
              setNote("已清除 AI 设置和保存的 API Key。");
            } catch {
              setNote("无法完整清除 AI 设置，请检查浏览器存储权限。");
            }
          }}
        />
        <Tabs
          items={modes}
          active={mode}
          onChange={(value) => setMode(value as InterpretationMode)}
          label="AI 解读模式"
          className="secondary-tabs ai-mode-tabs"
        >
          <h3>
            {mode === "plain"
              ? "AI 白话导读"
              : mode === "classical"
                ? "AI 原典细读"
                : "AI 结合所问"}
          </h3>
          <p className="small muted">
            {mode === "plain"
              ? "帮助理解古文的现代含义，不是人工校订译文。"
              : mode === "classical"
                ? "结合经传与爻位结构讨论，不代表唯一权威解释。"
                : "经典依据与现实应用分开呈现，不能据此确定现实结果。"}
          </p>
          {mode === "question" && (
            <p className="ai-question">
              {record.question.trim() ? (
                <span data-verbatim>{record.question}</span>
              ) : (
                "本次记录未填写所问何事，无法使用‘结合所问’模式。"
              )}
            </p>
          )}
          <p className="small ai-consent">
            生成时，本次卦象、相关经典材料以及所问内容（如有）将发送至你配置的
            AI API。
          </p>
          {stage && (
            <p className="small muted">切换模式或离开此页签会取消当前生成。</p>
          )}
          <div className="action-row">
            <button
              className="primary"
              disabled={
                !!stage || (mode === "question" && !record.question.trim())
              }
              onClick={generate}
            >
              {entry ? "重新生成" : "生成解读"}
            </button>
            {stage && (
              <button onClick={() => request.current?.abort()}>取消</button>
            )}
            {entry && (
              <button
                onClick={() => {
                  try {
                    deleteInterpretation(localStorage, key);
                    setEntry(null);
                    setNote("已删除此 AI 解读。");
                  } catch {
                    setNote("删除失败，请检查浏览器存储权限。");
                  }
                }}
              >
                删除此 AI 解读
              </button>
            )}
          </div>
          <p role="status" className="small">
            {stage ? `正在生成 AI 辅助解读…… ${stage}` : note}
          </p>
          {error && (
            <div role="alert" className="error">
              <p>{error}</p>
              {details.length > 0 && (
                <details>
                  <summary>查看技术详情</summary>
                  <ul>
                    {details.map((code) => (
                      <li key={code} data-verbatim>
                        {code}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {entry && (
            <>
              <p className="small muted ai-metadata">
                已通过格式、动爻与来源 ID 校验 ·{" "}
                <span data-verbatim>{entry.metadata.model}</span> ·{" "}
                <time dateTime={entry.metadata.generatedAt}>
                  {entry.metadata.generatedAt.replace("T", " ").slice(0, 19)}{" "}
                  UTC
                </time>
              </p>
              <AiResult result={entry.result} context={context} />
            </>
          )}
        </Tabs>
      </section>
    </Localize>
  );
}
