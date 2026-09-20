import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { Converter } from "opencc-js";
import source from "../lib/iching/data/hexagrams.json";
import simplified from "../lib/iching/data/simplified.json";
test("generated simplified classical text is current and original variants remain intact", () => {
  execFileSync(process.execPath, [
    "scripts/generate-simplified.mjs",
    "--check",
  ]);
  const raw = source[0].judgment;
  const convert = Converter({ from: "t", to: "cn" });
  assert.equal(
    (simplified as Record<string, string>)[raw],
    raw
      .split("乾")
      .map((part) => convert(part))
      .join("乾"),
  );
  assert.match(
    (simplified as Record<string, string>)[source[0].lines[2].text],
    /乾乾/,
  );
  assert.match((simplified as Record<string, string>)[raw], /^乾/);
  assert.match(source[0].judgment, /貞/);
  assert.match((simplified as Record<string, string>)[raw], /贞/);
  assert.match(source[0].tuan, /大和/);
});
