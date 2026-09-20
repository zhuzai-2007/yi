"use client";
import { useState } from "react";
import texts from "../lib/iching/data/hexagrams.json";
import type { HexagramText } from "../lib/iching/data/types";
import { reviewNotes } from "../lib/iching/data/review-notes";
import {
  changeLine,
  getHexagram,
  getLineTitle,
  getStructuralRelations,
  getYinYang,
  isMoving,
  type Bit,
  type LineValue,
} from "../lib/iching/core";
import { LINE_NAMES, type CastRecord } from "../lib/casting";
import HexagramDiagram from "./HexagramDiagram";
import { AllLines, Passage, Related, Wings } from "./ClassicalText";
import Structure from "./Structure";
import { Localize } from "./Language";
import { ThrowHistory } from "./ThrowHistory";

function HexReading({
  kind,
  bits,
  values,
}: {
  kind: string;
  bits: Bit[];
  values?: readonly LineValue[];
}) {
  const [tab, setTab] = useState("经");
  const hex = getHexagram(bits),
    data = texts.find((t) => t.number === hex.number) as HexagramText;
  const moving = values?.flatMap((v, i) => (isMoving(v) ? [i] : [])) || [];
  return (
    <Localize>
      <section className="hex-reading" aria-label={kind}>
        <div className="reading-heading">
          <div>
            <p className="section-label">
              {kind} / 第 {hex.number} 卦
            </p>
            <h2>
              {hex.fullName} <span className="unicode">{hex.unicode}</span>
            </h2>
          </div>
        </div>
        <div className="reading-nav" aria-label={`${kind}阅读维度`}>
          {["经", "传", "结构"].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="reading-content">
          {reviewNotes[hex.number] && (
            <details className="version-note">
              <summary>版本与校勘说明 · 非经传原文</summary>
              <p>{reviewNotes[hex.number]}</p>
            </details>
          )}
          {tab === "经" && (
            <>
              <Passage kind="经" label="卦辞" text={data.judgment} />
              <AllLines data={data} bits={bits} moving={moving} />
            </>
          )}
          {tab === "传" && (
            <>
              <Wings data={data} />
              <details>
                <summary>小象传 · 六爻逐条阅读</summary>
                {data.lines.map((l, i) => (
                  <Passage
                    key={i}
                    label={`${getLineTitle(bits[i], i)} · 小象`}
                    text={l.littleImage}
                  />
                ))}
              </details>
            </>
          )}
          {tab === "结构" && <Structure bits={bits} values={values} />}
          <div className="text-source">
            <a href={data.source.url} target="_blank" rel="noreferrer">
              维基文库《周易》· 固定修订 ↗
            </a>
            <p>
              经为卦爻辞，传为《易传》原文，结构为位置规则推导。电子文本已核验完整性，尚待底本逐字校勘。
            </p>
          </div>
        </div>
      </section>
    </Localize>
  );
}
function relationText(bits: Bit[], i: number) {
  const r = getStructuralRelations(bits)[i];
  return `${r.central ? "得中" : "不得中"}，${r.correct ? "得正" : "不正"}，与${getLineTitle(bits[r.respondingIndex], r.respondingIndex)}${r.responsive ? "相应" : "不应"}`;
}
export default function Reader({ record }: { record: CastRecord }) {
  const values = record.lines,
    bits = values.map(getYinYang),
    changed = values.map(changeLine);
  const base = getHexagram(bits),
    next = getHexagram(changed),
    moving = values.flatMap((v, i) => (isMoving(v) ? [i] : []));
  return (
    <Localize>
      <div className="results v2-results">
        <section className="record-heading">
          <p className="section-label">起卦记录</p>
          <h1>
            {record.question ? (
              <span data-verbatim>{record.question}</span>
            ) : (
              "未填写所问"
            )}
          </h1>
          <p className="record-meta">
            <span>
              时间：
              <time dateTime={record.createdAt}>
                {record.createdAt
                  .replace("T", " ")
                  .replace(/:00(?=[+-]|Z)/, " ")}
              </time>
            </span>
            <span>
              方式：{record.method === "manual" ? "直接输入" : "三钱法"}
            </span>
          </p>
          <p className="muted small">
            起卦时间与所问内容仅用于记录，不参与当前卦象结构计算。
          </p>
        </section>
        <section className="overview" aria-label="卦象总览">
          <div className="overview-top">
            <span className="section-label">本卦 → 动爻 → 之卦</span>
            <span className="small muted">初至上 {values.join(" ")}</span>
          </div>
          <div className="hex-pair">
            {[
              { kind: "本卦", hex: base, b: bits },
              { kind: "之卦", hex: next, b: changed },
            ].map(({ kind, hex, b }, i) => (
              <div className="hex-column" key={kind}>
                <p className="hex-kind">
                  {kind}
                  <span>第 {hex.number} 卦</span>
                </p>
                <h2>
                  {hex.fullName} <span className="unicode">{hex.unicode}</span>
                </h2>
                <HexagramDiagram bits={b} moving={moving} changed={i === 1} />
                <div className="trigram-pair">
                  <span>
                    上 {hex.upper.unicode} {hex.upper.name} · {hex.upper.nature}
                  </span>
                  <span>
                    下 {hex.lower.unicode} {hex.lower.name} · {hex.lower.nature}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="change-summary">
            {moving.length
              ? moving.map((i) => getLineTitle(bits[i], i)).join("、") + "动"
              : "无动爻 · 本卦与之卦相同"}
            <span>{moving.length} 爻变</span>
          </p>
          {(values.every((v) => v === 9) || values.every((v) => v === 6)) && (
            <p className="special-condition">
              六爻皆为{LINE_NAMES[values[0]]}。本卦「经」中可阅读
              {values[0] === 9 ? "用九" : "用六"}及其象辞。
            </p>
          )}
        </section>
        <section className="moving-section" aria-label="动爻与变化">
          <p className="section-label">变化 / 按初至上排列</p>
          <h2>动爻与结构变化</h2>
          {moving.length === 0 && (
            <p className="muted">六爻皆静，没有发生阴阳变化。</p>
          )}
          <div className="moving-grid">
            {moving.map((i) => (
              <article className="moving-card" key={i}>
                <h3>
                  {getLineTitle(bits[i], i)}{" "}
                  <span className="moving-tag">动</span> →{" "}
                  {getLineTitle(changed[i], i)}
                </h3>
                <p>
                  原：{bits[i] ? "阳" : "阴"} · 动：{LINE_NAMES[values[i]]} ·
                  变：{changed[i] ? "阳" : "阴"}
                </p>
                <p>原结构：{relationText(bits, i)}</p>
                <p>
                  变后：{getLineTitle(changed[i], i)}，
                  {relationText(changed, i)}
                </p>
              </article>
            ))}
          </div>
          <details className="raw-input">
            <summary>查看原始记录与三钱结果</summary>
            <p>六爻（初至上）：{values.join(" / ")}</p>
            {record.method === "three-coins" ? (
              <ThrowHistory throws={record.throws} />
            ) : (
              <p className="muted">直接输入记录，没有三枚钱的原始投掷结果。</p>
            )}
          </details>
        </section>
        <HexReading kind="本卦" bits={bits} values={values} />
        <HexReading kind="之卦" bits={changed} />
        <section className="other-classics">
          <p className="section-label">其他经典关联</p>
          <h2>序卦、杂卦与文言</h2>
          {[...new Set([base.number, next.number])].map((n) => (
            <details key={n}>
              <summary>
                {getHexagram(n === base.number ? bits : changed).fullName} ·
                经典关联
              </summary>
              <Related
                data={texts.find((t) => t.number === n) as HexagramText}
              />
            </details>
          ))}
        </section>
        <p className="boundary">
          仅展示《周易》《易传》及阴阳爻位结构；不作吉凶评分，不加入其他占筮体系。
        </p>
      </div>
    </Localize>
  );
}
