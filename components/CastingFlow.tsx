"use client";
import { useEffect, useRef, useState } from "react";
import { navigate } from "../lib/navigation";
import Link from "./SiteLink";
import {
  appendThrow,
  COIN_VALUES,
  finishDraft,
  LINE_NAMES,
  tossCoins,
  type Draft,
} from "../lib/casting";
import { clearDraft, loadDraft, saveDraft, saveRecord } from "../lib/storage";
import { getYinYang, isMoving, positions } from "../lib/iching/core";
import { Localize } from "./Language";
import { LineMark } from "./HexagramDiagram";
import { ThrowHistory } from "./ThrowHistory";
export default function CastingFlow() {
  const [draft, setDraft] = useState<Draft | null>(null),
    [ready, setReady] = useState(false),
    [resume, setResume] = useState(false),
    [error, setError] = useState(""),
    [unsaved, setUnsaved] = useState(false),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    // Browser-only persisted state must hydrate after the static HTML's initial render.
    try {
      const d = loadDraft(localStorage);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(d);
      setResume(Boolean(d && d.currentStep > 0));
    } catch {
      setError("无法读取草稿，已有数据未被覆盖。请检查浏览器存储。");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!unsaved) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [unsaved]);
  function persist(next: Draft) {
    saveDraft(localStorage, next);
    if (next.currentStep === 6) {
      saveRecord(localStorage, finishDraft(next));
      clearDraft(localStorage);
      navigate(`/record/?id=${encodeURIComponent(next.id)}`, true);
    }
    setUnsaved(false);
  }
  function toss() {
    if (!draft || lock.current || unsaved || draft.currentStep >= 6) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const stored = loadDraft(localStorage);
      if (JSON.stringify(stored) !== JSON.stringify(draft))
        throw new Error("草稿已在其他页面改变，请刷新后继续，避免覆盖。");
      const next = appendThrow(draft, tossCoins());
      setDraft(next);
      try {
        persist(next);
      } catch {
        setUnsaved(true);
        setError("本次结果尚未完整保存。请重试保存；不会重新投掷。");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "安全随机源不可用，请使用 HTTPS 或本地 localhost。",
      );
    } finally {
      window.setTimeout(() => {
        lock.current = false;
        setBusy(false);
      }, 240);
    }
  }
  function retry() {
    if (!draft) return;
    try {
      persist(draft);
      setError("");
    } catch {
      setError("仍无法保存，请检查浏览器存储空间或权限。当前结果保留在本页。");
    }
  }
  const last = draft?.throws.at(-1);
  return (
    <Localize>
      <section className="flow-heading">
        <p className="section-label">三钱法 / 由下而上</p>
        <h1>一爻一记，六爻成象。</h1>
        <p data-verbatim>{draft?.question}</p>
      </section>
      {!ready ? (
        <p role="status">正在读取本地草稿…</p>
      ) : !draft ? (
        <div className="notice">
          <p>当前没有可继续的起卦草稿。</p>
          <Link href="/">返回起卦</Link>
        </div>
      ) : resume ? (
        <div className="notice">
          <h2>发现一个未完成的起卦记录。</h2>
          <p>已记录 {draft.currentStep} / 6 爻。保留每次三枚钱的原始结果。</p>
          <div className="action-row">
            <button
              className="button-link"
              onClick={() => {
                setResume(false);
                if (draft.currentStep === 6) retry();
              }}
            >
              继续
            </button>
            <button
              onClick={() => {
                try {
                  clearDraft(localStorage);
                  navigate("/", true);
                } catch {
                  setError("无法清除草稿。");
                }
              }}
            >
              重新开始
            </button>
          </div>
        </div>
      ) : (
        <div className="casting-layout">
          <section className="coin-stage" aria-label="三钱投掷">
            <p className="section-label">已完成 {draft.currentStep} / 6 爻</p>
            <h2>
              {draft.currentStep < 6
                ? `第${["一", "二", "三", "四", "五", "六"][draft.currentStep]}投 · ${positions[draft.currentStep]}爻`
                : "六爻已齐"}
            </h2>
            <div
              className={`coins ${busy ? "just-tossed" : ""}`}
              key={draft.currentStep}
            >
              {[0, 1, 2].map((i) => (
                <div className="coin" key={i}>
                  <span>
                    {last ? (last.coins[i] === "heads" ? "正" : "背") : "·"}
                  </span>
                  <small>{last ? COIN_VALUES[last.coins[i]] : "待掷"}</small>
                </div>
              ))}
            </div>
            <div className="last-throw" aria-live="polite">
              {last ? (
                <>
                  <strong>
                    {positions[last.lineIndex]}爻 · {LINE_NAMES[last.value]}
                  </strong>
                  <p>
                    {last.coins.map((c) => COIN_VALUES[c]).join(" + ")} ={" "}
                    {last.value}
                    {isMoving(last.value) ? " · 动" : " · 静"}
                  </p>
                </>
              ) : (
                <p>准备好后，掷出第一爻。</p>
              )}
            </div>
            <details className="coin-rules">
              <summary>规则说明</summary>
              <p>
                正面 = {COIN_VALUES.heads}，背面 = {COIN_VALUES.tails}
                。三枚钱之和：6 老阴、7 少阳、8 少阴、9 老阳。
              </p>
              <p>
                每枚钱使用浏览器安全随机源，正背等概率。第一次写入初爻，第六次写入上爻。
              </p>
            </details>
          </section>
          <section className="building-hex" aria-label="当前已生成卦象">
            <p className="section-label">当前卦象 / 初爻在下</p>
            <div className="draft-diagram">
              {[5, 4, 3, 2, 1, 0].map((i) => {
                const t = draft.throws[i];
                return (
                  <div className={`draft-row ${t ? "" : "pending"}`} key={i}>
                    <span>{positions[i]}爻</span>
                    {t ? (
                      <LineMark bit={getYinYang(t.value)} />
                    ) : (
                      <span className="pending-mark">待生成</span>
                    )}
                    <span>
                      {t
                        ? `${t.value}${isMoving(t.value) ? " 动" : " 静"}`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="muted small">↑ 第一次从初爻开始，依次向上。</p>
          </section>
          <div className="throw-action">
            {draft.currentStep < 6 && (
              <button
                className="primary"
                disabled={busy || unsaved}
                onClick={toss}
              >
                掷第{["一", "二", "三", "四", "五", "六"][draft.currentStep]}爻
              </button>
            )}
            {(unsaved || draft.currentStep === 6) && (
              <button className="button-link" onClick={retry}>
                重试保存并继续
              </button>
            )}
            <p className="muted small">
              每一投自动保存；可中途离开，稍后继续。
            </p>
          </div>
          <details className="flow-history">
            <summary>已投掷的原始结果（{draft.currentStep}）</summary>
            <ThrowHistory throws={draft.throws} />
          </details>
        </div>
      )}
      <p className="error" role="alert">
        {error}
      </p>
    </Localize>
  );
}
