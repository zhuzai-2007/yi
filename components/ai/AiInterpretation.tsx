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
  deleteInterpretation,
  loadInterpretation,
  saveInterpretation,
} from "../../lib/ai/storage";
import type {
  CachedInterpretation,
  InterpretationMode,
} from "../../lib/ai/types";
import { Tabs } from "../result/Tabs";
import { Localize } from "../Language";
import { useAiSettings } from "./AiSettingsProvider";
import { AiResult } from "./AiResult";
const modes = [
  { id: "plain", label: "白话导读" },
  { id: "classical", label: "原典细读" },
  { id: "question", label: "结合所问" },
];
export default function AiInterpretation({ record }: { record: CastRecord }) {
  const [mode, setMode] = useState<InterpretationMode>("plain");
  const { config, openSettings, cacheRevision } = useAiSettings();
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
  }, [key, context, config, cacheRevision]);
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
        <h2>AI 解读</h2>
        <div className="ai-service-status">
          <span>
            {config.model && config.endpoint && config.apiKey ? (
              <>
                AI 服务：<span data-verbatim>{config.model}</span>
                {entry && (
                  <>
                    {" "}
                    ·{" "}
                    <time dateTime={entry.metadata.generatedAt}>
                      {new Date(entry.metadata.generatedAt).toLocaleTimeString(
                        "zh-CN",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </time>
                  </>
                )}
              </>
            ) : (
              "尚未配置 AI 服务"
            )}
          </span>
          <button onClick={openSettings} aria-haspopup="dialog">
            {config.model ? "设置" : "去设置"}
          </button>
        </div>{" "}
        <Tabs
          items={modes.map((item) => ({
            ...item,
            disabled: item.id === "question" && !record.question.trim(),
          }))}
          active={mode}
          onChange={(value) => setMode(value as InterpretationMode)}
          label="AI 解读模式"
          className="secondary-tabs ai-mode-tabs"
        >
          {!entry && (
            <>
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
            </>
          )}
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
              <AiResult result={entry.result} context={context} />
            </>
          )}
        </Tabs>
      </section>
    </Localize>
  );
}
