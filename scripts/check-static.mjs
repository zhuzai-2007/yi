import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import {
  UNCACHED_ARTIFACTS,
  artifactUrl,
  cachePrefix,
  digest,
  scopePath,
  validateBasePath,
  webManifest,
} from "./pwa.mjs";
const base = validateBasePath(process.env.NEXT_PUBLIC_BASE_PATH || "");
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
  assert(
    html.includes(`href="${base}/manifest.webmanifest"`),
    `Manifest link: ${route}`,
  );
  assert(
    html.includes(`href="${base}/icons/yi-touch-180.png"`),
    `Touch icon: ${route}`,
  );
  assert(
    html.includes(`rel="icon" href="${base}/icon.svg"`),
    `Favicon: ${route}`,
  );
  await access("out/icon.svg");
  assert(html.includes(`${base}/sw.js`), `Registration URL: ${route}`);
  const serialized = html.replace(/\\"/g, '"');
  assert(
    serialized.includes(`"swUrl":"${base}/sw.js"`) &&
      serialized.includes(`"scope":"${scopePath(base)}"`),
    `Registration props: ${route}`,
  );
  if (base)
    assert(
      !/(?:src|href)="\/(?:_next\/|sw\.js|manifest\.webmanifest|icons\/)/.test(
        html,
      ),
      `Root URL escaped basePath: ${route}`,
    );
}
const manifest = JSON.parse(await readFile("out/manifest.webmanifest", "utf8"));
assert.deepEqual(manifest, webManifest(base));
for (const icon of manifest.icons) {
  assert(icon.src.startsWith(scopePath(base)));
  const bytes = await readFile(`out/${icon.src.slice(scopePath(base).length)}`);
  assert.equal(
    bytes.readUInt32BE(16) + "x" + bytes.readUInt32BE(20),
    icon.sizes,
    "Icon dimensions",
  );
}
const config = JSON.parse(await readFile("out/precache.json", "utf8"));
assert.equal(config.basePath, base);
assert.equal(config.scope, scopePath(base));
assert.equal(config.cachePrefix, cachePrefix(base));
assert.equal(
  config.cacheName,
  config.cachePrefix + config.fingerprint.slice(0, 24),
);
const sw = await readFile("out/sw.js", "utf8");
const template = await readFile("scripts/sw-template.js", "utf8");
assert.equal(
  sw,
  template.replace("/* PWA_CONFIG */ null", JSON.stringify(config)),
  "Generated SW must match audited template",
);
assert.equal(
  config.fingerprint,
  digest(
    template + JSON.stringify({ basePath: base, entries: config.entries }),
  ),
);
assert(
  !/Bearer |apiKey|chat\/completions|https?:\/\//.test(sw),
  "SW contains no credentials or provider URLs",
);
const urls = new Set();
for (const entry of config.entries) {
  assert.equal(entry.url, artifactUrl(entry.file, base));
  assert(!urls.has(entry.url), "Duplicate precache URL");
  urls.add(entry.url);
  assert.equal(
    entry.sha256,
    digest(await readFile(`out/${entry.file}`)),
    `Artifact integrity: ${entry.file}`,
  );
}
async function scan(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory())
      files.push(
        ...(await scan(
          `${directory}/${entry.name}`,
          `${prefix}${entry.name}/`,
        )),
      );
    else if (!UNCACHED_ARTIFACTS.has(prefix + entry.name))
      files.push(prefix + entry.name);
  }
  return files.sort();
}
assert.deepEqual(
  config.entries.map((entry) => entry.file).sort(),
  await scan("out"),
  "Complete export precached",
);
for (const route of ["", "cast/", "records/", "record/"])
  assert(urls.has(scopePath(base) + route));
console.log(
  `PASS: four routes, manifest/icons, registration, ${urls.size} verified precache artifacts under ${scopePath(base)}; no rewrite fallback.`,
);
