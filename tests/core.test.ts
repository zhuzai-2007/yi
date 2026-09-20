import { test } from "node:test";
import assert from "node:assert/strict";
import {
  changeLine,
  getHexagram,
  getChangedHexagram,
  getLineTitle,
  getStructuralRelations,
  getYinYang,
  isMoving,
  parseInput,
  parseLineValue,
} from "../lib/iching/core";
test("four pure cases", () => {
  for (const [v, base, changed] of [
    [7, 1, 1],
    [8, 2, 2],
    [9, 1, 2],
    [6, 2, 1],
  ]) {
    const input = parseInput(Array(6).fill(v).join(" "));
    assert.equal(getHexagram(input.map(getYinYang)).number, base);
    assert.equal(getChangedHexagram(input).number, changed);
  }
});
test("大有 → 同人 regression and structure", () => {
  const v = parseInput("7 9 7 7 6 7");
  const b = v.map(getYinYang),
    c = v.map(changeLine);
  assert.equal(getHexagram(b).fullName, "火天大有");
  assert.equal(getHexagram(b).unicode, "䷍");
  assert.equal(getHexagram(c).fullName, "天火同人");
  assert.equal(getHexagram(c).unicode, "䷌");
  assert.deepEqual(
    v.flatMap((n, i) => (isMoving(n) ? [getLineTitle(b[i], i)] : [])),
    ["九二", "六五"],
  );
  for (const i of [1, 4]) {
    const a = getStructuralRelations(b)[i],
      z = getStructuralRelations(c)[i];
    assert.equal(a.central, true);
    assert.equal(a.correct, false);
    assert.equal(a.responsive, true);
    assert.equal(z.centralCorrect, true);
    assert.equal(z.responsive, true);
  }
});
test("all 4096 inputs: coverage, changes, involution, orientation and relations", () => {
  const seen = new Set<number>();
  for (let n = 0; n < 4096; n++) {
    const v = parseInput(
      Array.from(
        { length: 6 },
        (_, i) => 6 + (Math.floor(n / 4 ** i) % 4),
      ).join(" "),
    );
    const b = v.map(getYinYang),
      c = v.map(changeLine);
    const h = getHexagram(b),
      z = getHexagram(c);
    seen.add(h.number);
    assert.ok(
      h.number >= 1 && h.number <= 64 && z.number >= 1 && z.number <= 64,
    );
    assert.equal(h.lower.binary, b.slice(0, 3).join(""));
    assert.equal(h.upper.binary, b.slice(3).join(""));
    assert.equal(
      b.filter((bit, i) => bit !== c[i]).length,
      v.filter(isMoving).length,
    );
    assert.deepEqual(
      c.map((bit, i) => (isMoving(v[i]) ? 1 - bit : bit)),
      b,
    );
    getStructuralRelations(b).forEach((r, i) => {
      assert.equal(r.central, i === 1 || i === 4);
      assert.equal(r.correct, b[i] === (i % 2 === 0 ? 1 : 0));
      assert.equal(r.responsive, b[i] !== b[(i + 3) % 6]);
      assert.equal(r.supports, i < 5 ? i + 1 : null);
      assert.equal(r.rides, i > 0 ? i - 1 : null);
    });
  }
  assert.equal(seen.size, 64);
});
test("reject malformed inputs; static values still use 六/九 titles", () => {
  for (const s of ["", "7 7 7", "7 7 7 7 7 10", "7 7 7 7 7 6.0", "777777"])
    assert.throws(() => parseInput(s));
  for (const v of [null, "7", 5, 10, NaN])
    assert.throws(() => parseLineValue(v));
  assert.equal(getLineTitle(getYinYang(7), 1), "九二");
  assert.equal(getLineTitle(getYinYang(8), 4), "六五");
});
