import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
for (const route of ["", "cast/", "records/", "record/"]) {
  const html = await readFile(`out/${route}index.html`, "utf8");
  const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((s) => s.includes("/_next/"));
  assert(assets.length > 0, `Missing assets in ${route}`);
  for (const asset of assets) {
    assert(asset.startsWith(`${base}/_next/`), `Wrong basePath: ${asset}`);
    await access(`out${asset.slice(base.length).split("?")[0]}`);
  }
  assert(
    html.includes(`href="${base}/records/"`),
    `Navigation path missing: ${route}`,
  );
}
console.log(
  `PASS: all four static routes and assets under ${base || "/"}; no rewrite fallback needed.`,
);
