import texts from "../iching/data/hexagrams.json";
import type { HexagramText } from "../iching/data/types";
import {
  getHexagram,
  getLineTitle,
  getStructuralRelations,
  type Bit,
} from "../iching/core";
import type {
  InterpretationContext,
  InterpretationMode,
  Source,
} from "./types";
/** Consumes the existing engine's results. Never delegates calculation to a provider. */
export function buildInterpretationContext(
  input: {
    bits: readonly Bit[];
    changed: readonly Bit[];
    moving: readonly number[];
    question: string;
  },
  mode: InterpretationMode,
): InterpretationContext {
  const { bits, changed, moving, question } = input;
  const original = getHexagram(bits),
    next = getHexagram(changed);
  const structure = {
    original: getStructuralRelations(bits),
    changed: getStructuralRelations(changed),
  };
  const sources: Source[] = [];
  for (const [prefix, hex, lines] of [
    ["original", original, bits],
    ["changed", next, changed],
  ] as const) {
    const data = texts.find((t) => t.number === hex.number) as HexagramText;
    const add = (
      suffix: string,
      type: Source["type"],
      label: string,
      text: string,
    ) => {
      if (text)
        sources.push({
          source_id: `${prefix}.${suffix}`,
          type,
          label: `${prefix === "original" ? "本卦" : "之卦"} · ${label}`,
          text,
        });
    };
    add("judgment", "jing", `${hex.name}卦卦辞`, data.judgment);
    add("tuan", "zhuan", `${hex.name}彖传`, data.tuan);
    add("image", "zhuan", `${hex.name}大象`, data.greatImage);
    for (const i of moving) {
      const title = getLineTitle(lines[i], i),
        row = structure[prefix][i];
      add(`line.${i + 1}`, "jing", `${title}爻辞`, data.lines[i].text);
      add(
        `line.${i + 1}.image`,
        "zhuan",
        `${title}小象`,
        data.lines[i].littleImage,
      );
      const name = (n: number | null) =>
        n === null ? "无" : getLineTitle(lines[n], n);
      sources.push({
        source_id: `structure.${prefix}.line.${i + 1}`,
        type: "structure",
        label: `${prefix === "original" ? "本卦" : "之卦"} · ${title}结构`,
        text: `${title}：${row.bit ? "阳" : "阴"}；${row.central ? "得中" : "不得中"}；${row.correct ? "得正" : "不正"}；应位${name(row.respondingIndex)}，${row.responsive ? "有应" : "不应"}；比：${row.neighbors.map(name).join("、")}；承：${name(row.supports)}；乘：${name(row.rides)}。中正应承乘比均为位置关系，不作现实吉凶判断。`,
      });
    }
    if (data.special && moving.length === 6) {
      add(
        "special",
        "jing",
        hex.number === 1 ? "用九" : "用六",
        data.special.yongJiu || data.special.yongLiu || "",
      );
      add("special.image", "zhuan", "用辞象传", data.special.specialImage);
    }
  }
  return {
    interpretation_mode: mode,
    question,
    facts: {
      original_hexagram: {
        number: original.number,
        name: original.name,
        symbol: original.unicode,
        lines: [...bits],
      },
      moving_lines: moving.map((i) => ({
        position: i + 1,
        name: getLineTitle(bits[i], i),
      })),
      changed_hexagram: {
        number: next.number,
        name: next.name,
        symbol: next.unicode,
        lines: [...changed],
      },
      has_changes: moving.length > 0,
    },
    structure,
    sources,
  };
}
