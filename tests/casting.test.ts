import test from "node:test";
import assert from "node:assert/strict";
import {
  appendThrow,
  COIN_VALUES,
  coinValue,
  dateWithOffset,
  finishDraft,
  tossCoins,
  type Draft,
  type Coins,
} from "../lib/casting";
const blank = (): Draft => ({
  schemaVersion: 1,
  id: "test-draft",
  question: "",
  startTime: "2026-09-20T09:50:00+08:00",
  method: "three-coins",
  convention: COIN_VALUES,
  throws: [],
  currentStep: 0,
});
test("all eight three-coin outcomes: exact values and 1:3:3:1 distribution", () => {
  const counts = [0, 0, 0, 0];
  for (let n = 0; n < 8; n++) {
    const coins = [0, 1, 2].map((i) =>
      (n >> i) & 1 ? "heads" : "tails",
    ) as Coins;
    const v = coinValue(coins);
    assert.equal(v, 6 + coins.filter((c) => c === "heads").length);
    counts[v - 6]++;
  }
  assert.deepEqual(counts, [1, 3, 3, 1]);
  assert.equal(coinValue(["tails", "tails", "tails"]), 6);
  assert.equal(coinValue(["tails", "tails", "heads"]), 7);
  assert.equal(coinValue(["tails", "heads", "heads"]), 8);
  assert.equal(coinValue(["heads", "heads", "heads"]), 9);
});
test("random byte parity gives precisely equal heads/tails; failure never falls back to Math.random", () => {
  const counts = { heads: 0, tails: 0 };
  for (let n = 0; n < 256; n++)
    for (const side of tossCoins((bytes) => {
      bytes.fill(n);
      return bytes;
    }))
      counts[side]++;
  assert.deepEqual(counts, { heads: 384, tails: 384 });
  assert.throws(
    () =>
      tossCoins(() => {
        throw new Error("unavailable");
      }),
    /unavailable/,
  );
});
test("six throws are immutable and bottom-to-top; metadata never affects calculation", () => {
  let draft = blank();
  const old = draft;
  const coins: Coins[] = [
    ["tails", "tails", "heads"],
    ["heads", "heads", "heads"],
    ["tails", "tails", "heads"],
    ["tails", "tails", "heads"],
    ["tails", "tails", "tails"],
    ["tails", "tails", "heads"],
  ];
  coins.forEach((c, i) => {
    draft = appendThrow(draft, c);
    assert.equal(draft.throws[i].lineIndex, i);
    assert.equal(draft.currentStep, i + 1);
  });
  assert.equal(old.currentStep, 0);
  assert.equal(old.throws.length, 0);
  assert.deepEqual(finishDraft(draft).lines, [7, 9, 7, 7, 6, 7]);
  assert.deepEqual(
    finishDraft({
      ...draft,
      question: "different",
      startTime: "2000-01-01T00:00:00Z",
    }).lines,
    finishDraft(draft).lines,
  );
  assert.throws(() => appendThrow(draft, coins[0]));
  assert.throws(() => finishDraft(blank()));
});
test("local timestamp includes offset and rejects invalid calendar values", () => {
  assert.match(
    dateWithOffset("2026-09-20T09:50"),
    /^2026-09-20T09:50:00[+-]\d{2}:\d{2}$/,
  );
  for (const v of ["", "2026-02-30T10:00", "invalid"])
    assert.throws(() => dateWithOffset(v));
});
