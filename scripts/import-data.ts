import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { trigrams, kingWenTable, names } from "../lib/iching/data/trigrams";
import { getLineTitle } from "../lib/iching/core";
import type { HexagramText } from "../lib/iching/data/types";
const sourceNames =
  "乾 坤 屯 蒙 需 訟 師 比 小畜 履 泰 否 同人 大有 謙 豫 隨 蠱 臨 觀 噬嗑 賁 剝 復 无妄 大畜 頤 大過 坎 離 咸 恒 遯 大壯 晉 明夷 家人 睽 蹇 解 損 益 夬 姤 萃 升 困 井 革 鼎 震 艮 漸 歸妹 豐 旅 巽 兌 渙 節 中孚 小過 既濟 未濟".split(
    " ",
  );
function source(name: string) {
  const raw = readFileSync(`sources/${name}.json`, "utf8");
  const page = Object.values(JSON.parse(raw).query.pages)[0] as {
    title: string;
    revisions: { revid: number; slots: { main: { "*": string } } }[];
  };
  const rev = page.revisions[0];
  return {
    raw: rev.slots.main["*"],
    metadata: {
      url: `https://zh.wikisource.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${rev.revid}`,
      revision: String(rev.revid),
      sha256: createHash("sha256").update(raw).digest("hex"),
    },
  };
}
const notes: { number: number; note: string }[] = [];
function clean(s: string, number: number): string {
  return s
    .replace(/\{\{\*\|([^{}]*)\}\}/g, (_, note) => {
      if (!notes.some((n) => n.number === number && n.note === note))
        notes.push({ number, note });
      return "";
    })
    .replace(/-\{([^{}]*)\}-/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/'{2,}/g, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^[*#:;]+\s*/, "")
    .trim();
}
const output: HexagramText[] = sourceNames.map((name, index) => {
  const number = index + 1,
    { raw, metadata } = source(name);
  const sections: Record<string, string[]> = {
    jing: [],
    tuan: [],
    xiang: [],
    wenyan: [],
  };
  let section = "";
  for (const row of raw
    .replace(/<[^>]*>/gs, (m) => m.replace(/\n/g, " "))
    .split("\n")) {
    const line = clean(row, number);
    if (line === "易經：") {
      section = "jing";
      continue;
    }
    if (line === "彖曰：") {
      section = "tuan";
      continue;
    }
    if (line === "象曰：") {
      section = "xiang";
      continue;
    }
    if (line === "文言曰：") {
      section = "wenyan";
      continue;
    }
    if (section && line && row.startsWith("*")) {
      if (section === "jing" && row.startsWith("***"))
        sections.jing[0] += "\n" + line;
      else sections[section].push(line);
    }
  }
  const lowerIndex = kingWenTable.findIndex((row) =>
    row.some((n) => n === number),
  );
  const upperIndex = kingWenTable[lowerIndex].findIndex((n) => n === number);
  const lower = trigrams[lowerIndex],
    upper = trigrams[upperIndex];
  const sourceTrigrams: Record<string, string> = {
    乾: "乾",
    兑: "兌",
    离: "離",
    震: "震",
    巽: "巽",
    坎: "坎",
    艮: "艮",
    坤: "坤",
  };
  const flat = clean(raw, number).replace(/\s/g, "");
  if (
    !flat.includes(
      sourceTrigrams[lower.name] + "下" + sourceTrigrams[upper.name] + "上",
    )
  )
    throw new Error(`${name}: source trigram orientation mismatch`);
  const expected = number <= 2 ? 8 : 7;
  if (
    sections.jing.length !== expected ||
    sections.xiang.length !== expected ||
    !sections.tuan.length
  )
    throw new Error(
      `${number} ${name}: section counts ${JSON.stringify(Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.length])))}`,
    );
  const bits = (lower.binary + upper.binary).split("").map(Number);
  const lines = sections.jing.slice(1, 7).map((text, i) => {
    const title = getLineTitle(bits[i] as 0 | 1, i);
    if (!new RegExp("^" + title + "[：，]").test(text))
      throw new Error(`${name}: unexpected line title ${text}`);
    return {
      text: text.slice(title.length + 1),
      littleImage: sections.xiang[i + 1],
    };
  });
  const special =
    number <= 2
      ? {
          [number === 1 ? "yongJiu" : "yongLiu"]: sections.jing[7].replace(
            /^用[九六]：/,
            "",
          ),
          specialImage: sections.xiang[7],
          wenyan: sections.wenyan.join("\n\n"),
        }
      : undefined;
  return {
    number,
    name: names[index],
    unicode: String.fromCodePoint(0x4dc0 + index),
    lowerTrigram: lower.key,
    upperTrigram: upper.key,
    judgment: sections.jing[0],
    tuan: sections.tuan.join("\n"),
    greatImage: sections.xiang[0],
    lines,
    ...(special ? { special } : {}),
    source: metadata,
  };
});
writeFileSync(
  "lib/iching/data/hexagrams.json",
  JSON.stringify(output, null, 2) + "\n",
);
writeFileSync(
  "sources/editorial-notes.json",
  JSON.stringify(notes, null, 2) + "\n",
);
const related = Object.fromEntries(
  ["序卦", "雜卦"].map((name) => {
    const { raw, metadata } = source(name);
    const passages = raw
      .split("==校詁版==")[0]
      .split("\n")
      .filter((r) => r.startsWith(":"))
      .map((row) => {
        const numbers = [...row.matchAll(/\[\[周易\/([^|\]]+)/g)].map((m) => {
          const target = m[1] === "恆" ? "恒" : m[1];
          const index = sourceNames.indexOf(target);
          if (index < 0) throw new Error("Unknown linked hexagram " + target);
          return index + 1;
        });
        return { numbers, text: clean(row, 0) };
      });
    if (new Set(passages.flatMap((p) => p.numbers)).size !== 64)
      throw new Error(name + ": incomplete explicit associations");
    return [name, { source: metadata, passages }];
  }),
);
writeFileSync(
  "lib/iching/data/related.json",
  JSON.stringify(related, null, 2) + "\n",
);
console.log(
  `Imported ${output.length} hexagrams; ${notes.length} editorial notes isolated.`,
);
