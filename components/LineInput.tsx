import { Localize } from "./Language";
import { useRef, useState } from "react";
import {
  getYinYang,
  parseInput,
  positions,
  type LineValue,
  type Six,
} from "../lib/iching/core";
import { LineMark } from "./HexagramDiagram";
const values: LineValue[] = [6, 7, 8, 9];
const descriptions: Record<LineValue, string> = {
  6: "老阴",
  7: "少阳",
  8: "少阴",
  9: "老阳",
};
export default function LineInput({
  onSubmit,
}: {
  onSubmit: (v: Six<LineValue>) => void;
}) {
  const [draft, setDraft] = useState<(LineValue | null)[]>(Array(6).fill(null));
  const [quick, setQuick] = useState("");
  const [error, setError] = useState("");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const next = draft.findIndex((v) => v === null);
  function choose(i: number, v: LineValue) {
    const updated = draft.map((n, j) => (j === i ? v : n));
    setDraft(updated);
    setError("");
    setQuick(updated.every((v) => v !== null) ? updated.join(" ") : "");
    const nextIndex = updated.findIndex((n) => n === null);
    if (nextIndex >= 0) refs.current[nextIndex]?.focus();
  }
  function submit() {
    if (draft.some((v) => v === null)) {
      setError("请完整录入六爻，从初爻开始。");
      return;
    }
    onSubmit(draft as unknown as Six<LineValue>);
    setError("");
  }
  return (
    <Localize>
      <aside className="input-panel" aria-labelledby="input-title">
        <div className="section-label">01 / 录入六爻</div>
        <h2 id="input-title">由下而上，依次记录</h2>
        <p className="muted small">从初爻到上爻输入。卦图由上向下显示。</p>
        <div className="input-rows">
          {[5, 4, 3, 2, 1, 0].map((i) => (
            <fieldset
              className={`input-row ${i === next ? "next" : ""}`}
              key={i}
            >
              <legend className="sr-only">{positions[i]}爻</legend>
              <span className="position">{positions[i]}爻</span>
              <div className="choices">
                {values.map((v) => (
                  <button
                    type="button"
                    key={v}
                    ref={
                      v === 6
                        ? (el) => {
                            refs.current[i] = el;
                          }
                        : undefined
                    }
                    aria-label={`${positions[i]}爻 ${v} ${descriptions[v]}`}
                    aria-pressed={draft[i] === v}
                    onClick={() => choose(i, v)}
                    className={draft[i] === v ? "selected" : ""}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="input-preview">
                {draft[i] !== null ? (
                  <LineMark bit={getYinYang(draft[i])} />
                ) : (
                  <span className="empty-line">—</span>
                )}
              </span>
            </fieldset>
          ))}
        </div>
        <p className="input-progress" aria-live="polite">
          {next < 0
            ? "六爻已齐，可以查看"
            : `↑ 从${positions[next]}爻${next === 0 ? "开始" : "继续"}`}
        </p>
        <div className="value-key">
          <span>6 老阴 · 动</span>
          <span>7 少阳 · 静</span>
          <span>8 少阴 · 静</span>
          <span>9 老阳 · 动</span>
        </div>
        <button className="primary" onClick={submit}>
          保存并查看结果 <span>↗</span>
        </button>
        <div className="input-actions">
          <button
            onClick={() => {
              setDraft(Array(6).fill(null));
              setQuick("");
              setError("");
            }}
          >
            清空输入
          </button>
          <button
            onClick={() => {
              const v = parseInput("7 9 7 7 6 7");
              setDraft([...v]);
              setQuick(v.join(" "));
              setError("");
            }}
          >
            载入大有示例
          </button>
        </div>
        <details className="quick-entry">
          <summary>快速输入六个数字</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const v = parseInput(quick);
                setDraft([...v]);
                setError("");
                onSubmit(v);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label htmlFor="quick">从初爻到上爻，以空格分隔</label>
            <div className="quick-field">
              <input
                id="quick"
                value={quick}
                placeholder="7 9 7 7 6 7"
                onChange={(e) => {
                  setQuick(e.target.value);
                  if (error) setError("");
                }}
                aria-describedby="input-error"
              />
              <button type="submit">保存并查看</button>
            </div>
          </form>
        </details>
        <p id="input-error" className="error" role="alert">
          {error}
        </p>
        <details className="input-note">
          <summary>为什么输入 7，爻名却用「九」？</summary>
          <p>
            6、7、8、9
            是录入数，区分阴阳与动静。经文以「九」称阳爻，以「六」称阴爻。因此少阳
            7 仍称九，少阴 8 仍称六。
          </p>
        </details>
      </aside>
    </Localize>
  );
}
