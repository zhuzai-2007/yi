"use client";
import { useState } from "react";
import texts from "../lib/iching/data/hexagrams.json";
import type { HexagramText } from "../lib/iching/data/types";
import {
  changeLine,
  getHexagram,
  getLineTitle,
  getStructuralRelations,
  getYinYang,
  isMoving,
  type Bit,
} from "../lib/iching/core";
import type { CastRecord } from "../lib/casting";
import HexagramDiagram, { LineMark } from "./HexagramDiagram";
import { Passage, Related } from "./ClassicalText";
import Structure from "./Structure";
import { Localize } from "./Language";
import { ThrowHistory } from "./ThrowHistory";
import { Tabs } from "./result/Tabs";
import { HexagramTab } from "./result/HexagramTab";
const tabs = [
  { id: "overview", label: "总览" },
  { id: "moving", label: "动爻" },
  { id: "base", label: "本卦" },
  { id: "next", label: "之卦" },
  { id: "structure", label: "结构" },
  { id: "classics", label: "原典关联" },
];
function stateText(bits: Bit[], i: number) {
  const r = getStructuralRelations(bits)[i];
  return `${r.central ? "得中" : "不得中"} · ${r.correct ? "得正" : "不正"}`;
}
function Relation({ bits, index }: { bits: Bit[]; index: number }) {
  const r = getStructuralRelations(bits)[index];
  return (
    <Localize>
      <p className="relation-summary">
        {bits[index] ? "阳" : "阴"} · {stateText(bits, index)}
        <br />
        应位：{getLineTitle(bits[r.respondingIndex], r.respondingIndex)} ·{" "}
        {r.responsive ? "有应" : "不应"}
      </p>
    </Localize>
  );
}
export default function Reader({ record }: { record: CastRecord }) {
  const [tab, setTab] = useState("overview");
  const bits = record.lines.map(getYinYang),
    changed = record.lines.map(changeLine);
  const base = getHexagram(bits),
    next = getHexagram(changed);
  const data = texts.find((t) => t.number === base.number) as HexagramText,
    nextData = texts.find((t) => t.number === next.number) as HexagramText;
  const moving = record.lines.flatMap((v, i) => (isMoving(v) ? [i] : []));
  const summary = moving.length
    ? moving.map((i) => getLineTitle(bits[i], i)).join("、") + "动"
    : "无动爻 · 本卦与之卦相同";
  const comparison = (full: boolean) => (
    <div className="moving-comparisons">
      {moving.length === 0 ? (
        <p className="muted">本卦无动爻，未生成结构性爻变。</p>
      ) : (
        moving.map((i) => (
          <article className="moving-comparison" key={i}>
            <div className="comparison-pair">
              {[
                { b: bits, d: data, label: "原爻" },
                { b: changed, d: nextData, label: "变爻" },
              ].map(({ b, d, label }, j) => (
                <div key={label}>
                  <p className="section-label">{label}</p>
                  <h3>
                    {getLineTitle(b[i], i)}
                    {j === 0 && <span className="moving-tag">动</span>}
                  </h3>
                  {full && <LineMark bit={b[i]} />}
                  <Relation bits={b} index={i} />
                  {full && (
                    <Passage kind="经" label="爻辞" text={d.lines[i].text} />
                  )}
                </div>
              ))}
              <span className="comparison-arrow" aria-hidden="true">
                →
              </span>
            </div>
          </article>
        ))
      )}
    </div>
  );
  return (
    <Localize>
      <div className="result-shell">
        <section className="record-heading">
          <h1>
            {record.question ? (
              <span data-verbatim>{record.question}</span>
            ) : (
              "未填写所问"
            )}
          </h1>
          <p className="record-meta">
            <time dateTime={record.createdAt}>
              {record.createdAt.replace("T", " ")}
            </time>{" "}
            · {record.method === "manual" ? "直接输入" : "三钱法"}
          </p>
        </section>
        <section className="result-summary" aria-label="卦象总览">
          {[
            { hex: base, b: bits, label: "本卦" },
            { hex: next, b: changed, label: "之卦" },
          ].map(({ hex, b, label }, i) => (
            <div className="summary-hex" key={label}>
              <div>
                <p className="section-label">
                  {label} · 第 {hex.number} 卦
                </p>
                <h2>
                  {hex.fullName} <span className="unicode">{hex.unicode}</span>
                </h2>
              </div>
              <HexagramDiagram bits={b} moving={moving} changed={i === 1} />
            </div>
          ))}
          <div className="summary-change">
            <span aria-hidden="true">→</span>
            <p className="change-summary">{summary}</p>
          </div>
        </section>
        <Tabs
          items={tabs}
          active={tab}
          onChange={setTab}
          label="结果阅读"
          className="result-tabs"
        >
          {tab === "overview" && (
            <section className="overview-tab">
              <p className="section-label">总览 / 本次起卦</p>
              <div className="judgment-pair">
                <Passage
                  kind="经"
                  label={`${base.fullName} · 卦辞`}
                  text={data.judgment}
                />
                <Passage
                  kind="经"
                  label={`${next.fullName} · 卦辞`}
                  text={nextData.judgment}
                />
              </div>
              <h2>本次动爻</h2>
              {moving.length ? (
                moving.map((i) => (
                  <div className="overview-moving" key={i}>
                    <Passage
                      kind="经"
                      label={getLineTitle(bits[i], i)}
                      text={data.lines[i].text}
                    />
                    <p className="muted">
                      {getLineTitle(bits[i], i)} · {stateText(bits, i)} →{" "}
                      {getLineTitle(changed[i], i)} · {stateText(changed, i)}
                    </p>
                  </div>
                ))
              ) : (
                <p>本卦无动爻，未生成结构性爻变。</p>
              )}
              {data.special &&
                record.lines.every((v) => v === 9 || v === 6) && (
                  <p>
                    六爻皆动，本卦「经」可阅读
                    {base.number === 1 ? "用九" : "用六"}。
                  </p>
                )}
              <details className="raw-input">
                <summary>查看原始记录与三钱结果</summary>
                <p>六爻（初至上）：{record.lines.join(" / ")}</p>
                {record.method === "three-coins" ? (
                  <ThrowHistory throws={record.throws} />
                ) : (
                  <p>直接输入记录，没有三枚钱的原始投掷结果。</p>
                )}
                <p className="muted">时间与所问仅用于记录，不参与结构计算。</p>
              </details>
            </section>
          )}
          {tab === "moving" && (
            <section>
              <h2>动爻 · 原爻到变爻</h2>
              {comparison(true)}
            </section>
          )}
          {tab === "base" && (
            <HexagramTab kind="本卦" bits={bits} moving={moving} />
          )}
          {tab === "next" && (
            <HexagramTab kind="之卦" bits={changed} moving={[]} />
          )}
          {tab === "structure" && (
            <section>
              <p className="section-label">结构 / 位置事实</p>
              <h2>本卦 → 之卦</h2>
              {comparison(false)}
              <details className="full-structure">
                <summary>查看完整六爻结构表</summary>
                <h3>本卦</h3>
                <Structure bits={bits} values={record.lines} />
                <h3>之卦</h3>
                <Structure bits={changed} />
              </details>
            </section>
          )}
          {tab === "classics" && (
            <section className="other-classics">
              <h2>原典关联</h2>
              {[
                data,
                ...(data.number === nextData.number ? [] : [nextData]),
              ].map((d) => (
                <section key={d.number}>
                  <h3>{d.name}</h3>
                  <Related data={d} />
                  <a
                    className="source-link"
                    href={d.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    《周易》固定修订 · 来源 ↗
                  </a>
                </section>
              ))}
            </section>
          )}
        </Tabs>
      </div>
    </Localize>
  );
}
