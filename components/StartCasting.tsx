"use client";
import { useEffect, useState } from "react";
import { navigate } from "../lib/navigation";
import Link from "./SiteLink";
import {
  COIN_VALUES,
  dateWithOffset,
  localDateTime,
  type Draft,
  type Method,
} from "../lib/casting";
import { clearDraft, loadDraft, saveDraft, saveRecord } from "../lib/storage";
import type { LineValue, Six } from "../lib/iching/core";
import LineInput from "./LineInput";
import { Localize } from "./Language";
export default function StartCasting() {
  const [question, setQuestion] = useState(""),
    [time, setTime] = useState(""),
    [method, setMethod] = useState<Method>("three-coins");
  const [draft, setDraft] = useState<Draft | null>(null),
    [ready, setReady] = useState(false),
    [manual, setManual] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    // Local time and saved draft are unavailable while prerendering the static HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(localDateTime());
    try {
      setDraft(loadDraft(localStorage));
    } catch {
      setError("无法读取起卦草稿。请检查浏览器存储；已有数据未被覆盖。");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (manual)
      document
        .querySelector(".manual-section")
        ?.scrollIntoView({ block: "start" });
  }, [manual]);
  function start() {
    setError("");
    try {
      const startTime = dateWithOffset(time);
      if (method === "manual") {
        setManual(true);
        return;
      }
      // Re-read before writing, so another tab's unfinished draft is not silently replaced.
      const existing = loadDraft(localStorage);
      if (existing) {
        setDraft(existing);
        return;
      }
      const next: Draft = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        question,
        startTime,
        method: "three-coins",
        convention: COIN_VALUES,
        throws: [],
        currentStep: 0,
      };
      saveDraft(localStorage, next);
      navigate("/cast/");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "无法保存草稿，请检查浏览器存储。",
      );
    }
  }
  function saveManual(lines: Six<LineValue>) {
    try {
      const record = {
        schemaVersion: 1 as const,
        id: crypto.randomUUID(),
        question,
        createdAt: dateWithOffset(time),
        method: "manual" as const,
        convention: COIN_VALUES,
        throws: [],
        lines,
      };
      saveRecord(localStorage, record);
      navigate(`/record/?id=${encodeURIComponent(record.id)}`);
    } catch {
      setError("无法保存卦例，请检查时间和浏览器存储。输入仍保留在当前页面。");
    }
  }
  return (
    <Localize>
      <section className="intro">
        <div>
          <p className="eyebrow">起卦工作台</p>
          <h1>观其象，读其辞。</h1>
          <p className="intro-description">
            《周易》经传阅读 · 卦象结构计算 · 三钱起卦记录
          </p>
        </div>
      </section>
      <div className="start-layout">
        <section className="start-card">
          <p className="section-label">由初至上 / 留下一则记录</p>
          <h2>起一卦</h2>
          {draft && (
            <div className="notice" role="status">
              <strong>发现一个未完成的起卦记录。</strong>
              <p>已记录 {draft.currentStep} / 6 爻。</p>
              <div className="action-row">
                <Link className="button-link" href="/cast/">
                  继续
                </Link>
                <button
                  onClick={() => {
                    try {
                      clearDraft(localStorage);
                      setDraft(null);
                      setError("");
                    } catch {
                      setError("无法清除草稿，请检查浏览器存储。");
                    }
                  }}
                >
                  重新开始
                </button>
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <label className="field-label" htmlFor="question">
              所问何事 <span className="muted small">可留空</span>
            </label>
            <textarea
              id="question"
              maxLength={10000}
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="只为自己留一份记录"
            />
            <label className="field-label" htmlFor="start-time">
              起卦时间
            </label>
            <input
              id="start-time"
              type="datetime-local"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <fieldset className="method-choices">
              <legend>起卦方式</legend>
              {(
                [
                  ["three-coins", "三钱法 · 推荐"],
                  ["manual", "直接输入六爻"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="method"
                    value={value}
                    checked={method === value}
                    onChange={() => {
                      setMethod(value);
                      setManual(false);
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <button type="submit" className="primary" disabled={!ready}>
              开始起卦 <span>→</span>
            </button>
          </form>
          <p className="muted small form-note">
            起卦时间与所问内容仅用于记录，不参与当前卦象结构计算。
          </p>
          <p role="alert" className="error">
            {error}
          </p>
        </section>
        <aside className="start-aside">
          <p className="section-label">规则与边界</p>
          <h2>三钱，一爻。</h2>
          <p>
            本工具采用：正面 = {COIN_VALUES.heads}，背面 = {COIN_VALUES.tails}。
          </p>
          <p>
            每次掷三枚钱，合计得一爻。
            <br />6 老阴 · 7 少阳 · 8 少阴 · 9 老阳。
            <br />
            第一次为初爻，第六次为上爻。
          </p>
          <p>从本卦到之卦，只展示阴阳变化与爻位结构。经、传各有出处。</p>
          <div className="privacy-note">
            <strong>记录只留在此处</strong>
            <p>
              卦例仅保存在当前浏览器中。清除浏览器数据或更换设备可能导致记录丢失。
            </p>
            <p>
              可在「卦例」主动导出 JSON 备份。没有账号、云同步或问题文本上传。
            </p>
          </div>
        </aside>
      </div>
      {manual && (
        <section className="manual-section" aria-label="直接输入六爻">
          <LineInput onSubmit={saveManual} />
        </section>
      )}
    </Localize>
  );
}
