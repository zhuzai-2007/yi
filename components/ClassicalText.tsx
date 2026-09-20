import { Localize, Classic } from "./Language";
import type { HexagramText } from "../lib/iching/data/types";
import {
  getLineTitle,
  getStructuralRelations,
  type Bit,
} from "../lib/iching/core";
import related from "../lib/iching/data/related.json";
export function Passage({
  label,
  text,
  kind = "传",
}: {
  label: string;
  text: string;
  kind?: string;
}) {
  return (
    <Localize>
      <div className="passage">
        <div className="passage-label">
          <span className="source-tag">{kind}</span>
          {label}
        </div>
        <p className="classic">
          <Classic text={text} />
        </p>
      </div>
    </Localize>
  );
}
export function LineText({
  data,
  bits,
  index,
  moving = false,
}: {
  data: HexagramText;
  bits: readonly Bit[];
  index: number;
  moving?: boolean;
}) {
  const r = getStructuralRelations(bits)[index];
  return (
    <Localize>
      <article className={`line-text ${moving ? "active-line" : ""}`}>
        <div className="line-heading">
          <h4>{getLineTitle(bits[index], index)}</h4>
          {moving && <span className="moving-tag">动爻</span>}
        </div>
        <Passage kind="经" label="爻辞" text={data.lines[index].text} />
        <Passage label="小象传" text={data.lines[index].littleImage} />
        <p className="small">
          <span className="source-tag">结构</span>比：
          {r.neighbors.map((i) => getLineTitle(bits[i], i)).join("、")}；承：
          {r.supports === null
            ? "无"
            : getLineTitle(bits[r.supports], r.supports)}
          ；乘：{r.rides === null ? "无" : getLineTitle(bits[r.rides], r.rides)}
          。
        </p>
        <details className="inline-structure">
          <summary>
            <span className="source-tag">结构</span>
            {r.central ? "得中" : "不得中"} · {r.correct ? "得正" : "不正"} · 与
            {getLineTitle(bits[r.respondingIndex], r.respondingIndex)}
            {r.responsive ? "相应" : "不应"}{" "}
            <span className="why">为什么？</span>
          </summary>
          <p>
            第{index + 1}爻
            {r.central
              ? "位于三爻卦的中央，因此得中"
              : "不在三爻卦的中央，因此不得中"}
            。第{index + 1}位为{index % 2 === 0 ? "阳" : "阴"}位，此爻为
            {bits[index] ? "阳" : "阴"}，因此{r.correct ? "得正" : "不正"}
            。对应的第{r.respondingIndex + 1}爻与此爻阴阳
            {r.responsive ? "相异，因此有应" : "相同，因此不应"}。
          </p>
        </details>
      </article>
    </Localize>
  );
}
export function AllLines({
  data,
  bits,
  moving = [],
  showSpecial = true,
}: {
  data: HexagramText;
  bits: readonly Bit[];
  moving?: number[];
  showSpecial?: boolean;
}) {
  return (
    <Localize>
      <section>
        <div className="section-label">经 / 六爻全览</div>
        <h3>从初爻，读至上爻</h3>
        {data.lines.map((_, i) => (
          <details className="line-disclosure" key={i}>
            <summary>
              <span>{getLineTitle(bits[i], i)}</span>
              <span className="line-excerpt">
                <Classic text={data.lines[i].text} />
              </span>
              {moving.includes(i) && <span className="moving-tag">动</span>}
            </summary>
            <LineText
              data={data}
              bits={bits}
              index={i}
              moving={moving.includes(i)}
            />
          </details>
        ))}
        {showSpecial && data.special && (
          <div className="special-text">
            <Passage
              kind="经"
              label={data.number === 1 ? "用九" : "用六"}
              text={(data.special.yongJiu || data.special.yongLiu)!}
            />
            <Passage label="用九 / 用六之象" text={data.special.specialImage} />
            <p className="muted small">
              乾坤专属附文，独立于六条爻辞；此处不采用后世取辞规则。
            </p>
          </div>
        )}
      </section>
    </Localize>
  );
}
export function Wings({ data }: { data: HexagramText }) {
  return (
    <Localize>
      <>
        <Passage label="彖传" text={data.tuan} />
        <Passage label="大象传" text={data.greatImage} />
      </>
    </Localize>
  );
}
export function Related({ data }: { data: HexagramText }) {
  return (
    <Localize>
      <section className="related">
        <div className="section-label">传 / 经典关联</div>
        <h3>在经传之间参读</h3>
        {data.special && (
          <details>
            <summary>文言传 · {data.name}</summary>
            <Passage label="文言传" text={data.special.wenyan} />
            <p className="muted small">
              《文言传》仅附于乾、坤，并非六十四卦皆有。
            </p>
          </details>
        )}
        {Object.entries(related).map(([name, entry]) => (
          <details key={name}>
            <summary>
              {name === "序卦" ? "序卦传 · 卦序关系" : "杂卦传 · 相关句"}
            </summary>
            {entry.passages
              .filter((p) => p.numbers.includes(data.number))
              .map((p, i) => (
                <Passage key={i} label={name + "传"} text={p.text} />
              ))}
            <a
              className="source-link"
              href={entry.source.url}
              target="_blank"
              rel="noreferrer"
            >
              维基文库 · 固定修订 {entry.source.revision} ↗
            </a>
          </details>
        ))}
        <p className="muted small">
          《系辞》《说卦》属于整体理论，本页不将其改写为单卦解释。关联依据来源的明确卦名链接，不附现代占断。
        </p>
      </section>
    </Localize>
  );
}
