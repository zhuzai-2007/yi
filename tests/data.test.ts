import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import data from "../lib/iching/data/hexagrams.json";
import related from "../lib/iching/data/related.json";
import { validateData } from "../scripts/validate-data";
import type { HexagramText } from "../lib/iching/data/types";
test("entire static corpus satisfies schema and source hashes", () => {
  validateData(data as HexagramText[]);
  for (const h of data) {
    const name = decodeURIComponent(
      new URL(h.source.url).searchParams.get("title")!,
    ).split("/")[1];
    assert.equal(
      createHash("sha256")
        .update(readFileSync(`sources/${name}.json`, "utf8"))
        .digest("hex"),
      h.source.sha256,
    );
  }
});
test("validator fails on missing text and misplaced special fields", () => {
  const copy = structuredClone(data) as HexagramText[];
  copy[13].lines[1].littleImage = "";
  assert.throws(() => validateData(copy));
  const wrong = structuredClone(data) as HexagramText[];
  wrong[13].special = wrong[0].special;
  assert.throws(() => validateData(wrong));
});
test("source-derived regression passages and complete Kun judgment", () => {
  assert.equal(data[13].lines[1].text, "大車以載，有攸往，无咎。");
  assert.equal(data[13].lines[1].littleImage, "大車以載，積中不敗也。");
  assert.equal(data[13].lines[4].text, "厥孚交如，威如；吉。");
  assert.match(data[1].judgment, /安貞，吉/);
  assert.match(data[0].special!.wenyan, /其唯聖人乎/);
  assert.match(data[28].judgment, /^習坎：/);
});
test("sequence and miscellaneous: complete explicit associations and source hashes", () => {
  for (const [name, entry] of Object.entries(related)) {
    assert.equal(new Set(entry.passages.flatMap((p) => p.numbers)).size, 64);
    assert.equal(
      createHash("sha256")
        .update(readFileSync(`sources/${name}.json`, "utf8"))
        .digest("hex"),
      entry.source.sha256,
    );
    for (const p of entry.passages) {
      assert.ok(p.text.length > 0);
      assert.doesNotMatch(p.text, /[{}<>]|\[\[/);
      assert.ok(p.numbers.every((n) => n >= 1 && n <= 64));
    }
  }
  assert.match(
    related["序卦"].passages.find((p) => p.numbers.includes(14))!.text,
    /與人同者，物必歸焉/,
  );
  assert.equal(
    related["雜卦"].passages.find((p) => p.numbers.includes(14))!.text,
    "大有眾也，同人親也。",
  );
});
