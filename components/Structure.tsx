import { Localize } from "./Language";
import {
  getStructuralRelations,
  positions,
  isMoving,
  type Bit,
  type LineValue,
} from "../lib/iching/core";
export default function Structure({
  bits,
  values,
}: {
  bits: readonly Bit[];
  values?: readonly LineValue[];
}) {
  const rows = getStructuralRelations(bits);
  return (
    <Localize>
      <section className="structure">
        <div className="section-label">结构 / 依爻位规则推导</div>
        <h3>六爻各有所位</h3>
        <details className="term-help">
          <summary>术语 ? · 中、正、应、比、承、乘</summary>
          <p>
            中：二、五位于三爻卦中央。正：阳居奇位，阴居偶位。应：初四、二五、三上对应，阴阳相异为有应。比：相邻。承：下爻承上爻。乘：上爻乘下爻。以上只说明位置，不作吉凶判断。
          </p>
        </details>
        <p className="muted">
          二、五得中；奇位为阳位，偶位为阴位。初与四、二与五、三与上对应，阴阳相异为有应。
        </p>
        {!values && (
          <p className="small muted">
            之卦展示变化后的阴阳位置，不赋予新一轮动静。
          </p>
        )}
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="六爻结构表，可横向滚动"
        >
          <table>
            <thead>
              <tr>
                {[
                  "爻位",
                  "阴阳",
                  "动静",
                  "爻名",
                  "中",
                  "正",
                  "中正",
                  "应位",
                  "相应",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.index}>
                  <td>{positions[r.index]}</td>
                  <td>{r.bit ? "阳" : "阴"}</td>
                  <td>
                    {values ? (isMoving(values[r.index]) ? "动" : "静") : "—"}
                  </td>
                  <th scope="row">{r.title}</th>
                  <td>{r.central ? "得中" : "—"}</td>
                  <td>{r.correct ? "得正" : "不正"}</td>
                  <td>{r.centralCorrect ? "是" : "—"}</td>
                  <td>{positions[r.respondingIndex]}</td>
                  <td>{r.responsive ? "有应" : "不应"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details>
          <summary>查看比、承、乘的逐对关系</summary>
          <p className="muted small">
            比仅表示相邻；下爻承上爻，上爻乘下爻。这些都是位置事实，不产生吉凶结论。
          </p>
          {rows.slice(0, 5).map((r, i) => (
            <p className="relation" key={i}>
              {r.title}（{r.bit ? "阳" : "阴"}）与{rows[i + 1].title}（
              {rows[i + 1].bit ? "阳" : "阴"}）相邻；{r.title}承
              {rows[i + 1].title}，{rows[i + 1].title}乘{r.title}。
            </p>
          ))}
        </details>
        <p className="boundary">
          「不正」不等于坏，「中正」也不保证吉。这里只展示结构事实。
        </p>
      </section>
    </Localize>
  );
}
