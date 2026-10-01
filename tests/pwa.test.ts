import { test } from "node:test";
import assert from "node:assert/strict";
import {
  artifactUrl,
  cachePrefix,
  digest,
  scopePath,
  validateBasePath,
  webManifest,
} from "../scripts/pwa.mjs";

for (const base of ["", "/yi", "/reading/classics"]) {
  test(`PWA paths and install manifest: ${base || "/"}`, () => {
    assert.equal(scopePath(base), base + "/");
    assert.equal(artifactUrl("index.html", base), base + "/");
    for (const route of ["cast", "records", "record"])
      assert.equal(
        artifactUrl(route + "/index.html", base),
        `${base}/${route}/`,
      );
    assert.equal(
      artifactUrl("_next/static/test.js", base),
      `${base}/_next/static/test.js`,
    );
    assert.equal(
      artifactUrl("icons/纸 墨.png", base),
      `${base}/icons/${encodeURIComponent("纸 墨.png")}`,
    );
    const manifest = webManifest(base);
    assert.equal(manifest.start_url, base + "/");
    assert.equal(manifest.scope, base + "/");
    assert.equal(manifest.id, base + "/");
    assert.equal(manifest.display, "standalone");
    assert(
      manifest.icons.every((icon: { src: string }) =>
        icon.src.startsWith(base + "/icons/"),
      ),
    );
    assert(
      manifest.icons.some(
        (icon: { purpose: string }) => icon.purpose === "maskable",
      ),
    );
  });
}
test("PWA rejects unsafe base paths and artifact traversal", () => {
  for (const base of [
    "yi",
    "/yi/",
    "//yi",
    "/yi?x",
    "https://example.com",
    "/yi/#x",
    "/.",
    "/reading/../classics",
  ])
    assert.throws(() => validateBasePath(base));
  for (const file of ["", "../secret", "/index.html", "a\\b", "a//b"])
    assert.throws(() => artifactUrl(file, "/yi"));
});
test("PWA namespace is stable, deployment-scoped and fingerprint is content-derived", () => {
  const prefixes = ["", "/yi", "/reading/classics"].map(cachePrefix);
  assert.equal(new Set(prefixes).size, 3);
  assert.equal(cachePrefix("/yi"), cachePrefix("/yi"));
  assert.notEqual(digest("old html"), digest("new html"));
  assert.equal(digest("same bytes"), digest("same bytes"));
});
