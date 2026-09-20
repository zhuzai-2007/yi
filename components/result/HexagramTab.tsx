"use client";
import { useState } from "react";
import texts from "../../lib/iching/data/hexagrams.json";
import type { HexagramText } from "../../lib/iching/data/types";
import { reviewNotes } from "../../lib/iching/data/review-notes";
import { getHexagram, type Bit } from "../../lib/iching/core";
import { AllLines, Passage, Wings } from "../ClassicalText";
import { Localize } from "../Language";
import { Tabs } from "./Tabs";
const tabs = [
  { id: "jing", label: "经" },
  { id: "zhuan", label: "传" },
  { id: "lines", label: "六爻" },
];
export function HexagramTab({
  kind,
  bits,
  moving,
}: {
  kind: string;
  bits: Bit[];
  moving: number[];
}) {
  const [tab, setTab] = useState("jing");
  const hex = getHexagram(bits),
    data = texts.find((t) => t.number === hex.number) as HexagramText;
  return (
    <Localize>
      <section aria-label={kind} className="hex-reading-v3">
        <p className="section-label">
          {kind} / 第 {hex.number} 卦
        </p>
        <h2>
          {hex.fullName} {hex.unicode}
        </h2>
        <Tabs
          items={tabs}
          active={tab}
          onChange={setTab}
          label={`${kind}阅读维度`}
          className="secondary-tabs"
        >
          {tab === "jing" && (
            <>
              <Passage kind="经" label="卦辞" text={data.judgment} />
              {data.special && (
                <>
                  <Passage
                    kind="经"
                    label={data.number === 1 ? "用九" : "用六"}
                    text={(data.special.yongJiu || data.special.yongLiu)!}
                  />
                  <Passage
                    label="用九 / 用六之象"
                    text={data.special.specialImage}
                  />
                </>
              )}
            </>
          )}
          {tab === "zhuan" && <Wings data={data} />}
          {tab === "lines" && (
            <AllLines
              data={data}
              bits={bits}
              moving={moving}
              showSpecial={false}
            />
          )}
        </Tabs>
        {reviewNotes[hex.number] && (
          <details className="version-note">
            <summary>版本与校勘说明 · 非经传原文</summary>
            <p>{reviewNotes[hex.number]}</p>
          </details>
        )}
        <div className="text-source">
          <a href={data.source.url} target="_blank" rel="noreferrer">
            维基文库《周易》· 固定修订 ↗
          </a>
          <p>
            经为卦爻辞，传为《易传》原文，结构为位置规则推导。电子文本尚待底本逐字校勘。
          </p>
        </div>
      </section>
    </Localize>
  );
}
