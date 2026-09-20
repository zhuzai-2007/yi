import assert from "node:assert/strict";
import texts from "../lib/iching/data/hexagrams.json";
import related from "../lib/iching/data/related.json";
import { trigrams, kingWenTable, names } from "../lib/iching/data/trigrams";
import type { HexagramText } from "../lib/iching/data/types";
export function validateData(data: HexagramText[]) {
  assert.equal(data.length, 64);
  assert.equal(new Set(data.map((h) => h.number)).size, 64);
  assert.equal(new Set(data.map((h) => h.name)).size, 64);
  for (const h of data) {
    assert.ok(Number.isInteger(h.number) && h.number >= 1 && h.number <= 64);
    assert.equal(h.name, names[h.number - 1]);
    const l = trigrams.findIndex((t) => t.key === h.lowerTrigram),
      u = trigrams.findIndex((t) => t.key === h.upperTrigram);
    assert.ok(l >= 0 && u >= 0);
    assert.equal(kingWenTable[l][u], h.number);
    assert.equal(h.unicode, String.fromCodePoint(0x4dc0 + h.number - 1));
    assert.equal(h.lines.length, 6);
    for (const text of [
      h.judgment,
      h.tuan,
      h.greatImage,
      ...h.lines.flatMap((l) => [l.text, l.littleImage]),
    ]) {
      assert.ok(
        typeof text === "string" && text.trim().length > 0,
        `${h.number}: missing text`,
      );
      assert.doesNotMatch(
        text,
        /[{}<>]|\[\[|TODO|undefined/,
        `${h.number}: unparsed markup`,
      );
    }
    if (h.number <= 2) {
      assert.ok(h.special?.wenyan);
      assert.ok(h.special?.specialImage);
      assert.ok(h.number === 1 ? h.special.yongJiu : h.special.yongLiu);
      assert.equal(
        h.number === 1 ? h.special.yongLiu : h.special.yongJiu,
        undefined,
      );
    } else assert.equal(h.special, undefined);
    assert.ok(h.source.url.includes("oldid=" + h.source.revision));
    assert.match(h.source.sha256, /^[a-f0-9]{64}$/);
  }
}
validateData(texts as HexagramText[]);
for (const entry of Object.values(related)) {
  assert.equal(new Set(entry.passages.flatMap((p) => p.numbers)).size, 64);
  for (const p of entry.passages) {
    assert.ok(p.text.trim());
    assert.doesNotMatch(p.text, /[{}<>]|\[\[/);
  }
}
console.log(
  "PASS: 64 hexagrams, 384 line texts, 384 little images, 64 tuan/great images, Qian/Kun special fields, mapping and provenance.",
);
