import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  UNCACHED_ARTIFACTS,
  artifactUrl,
  cachePrefix,
  digest,
  scopePath,
  validateBasePath,
  webManifest,
} from "./pwa.mjs";

const root = resolve("out");
const basePath = validateBasePath(process.env.NEXT_PUBLIC_BASE_PATH || "");
await writeFile(
  resolve(root, "manifest.webmanifest"),
  JSON.stringify(webManifest(basePath), null, 2) + "\n",
);
async function scan(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = prefix + entry.name;
    if (entry.isDirectory())
      files.push(...(await scan(resolve(directory, entry.name), file + "/")));
    else if (entry.isFile() && !UNCACHED_ARTIFACTS.has(file)) files.push(file);
    else if (!entry.isFile())
      throw new Error("Unexpected non-file build artifact");
  }
  return files.sort();
}
const entries = [];
let size = 0;
for (const file of await scan(root)) {
  const bytes = await readFile(resolve(root, file));
  size += bytes.length;
  entries.push({
    file,
    url: artifactUrl(file, basePath),
    sha256: digest(bytes),
  });
}
if (new Set(entries.map((entry) => entry.url)).size !== entries.length)
  throw new Error("Duplicate precache URL");
const template = await readFile(
  new URL("./sw-template.js", import.meta.url),
  "utf8",
);
const fingerprint = digest(template + JSON.stringify({ basePath, entries }));
const config = {
  basePath,
  scope: scopePath(basePath),
  cachePrefix: cachePrefix(basePath),
  cacheName: cachePrefix(basePath) + fingerprint.slice(0, 24),
  fingerprint,
  entries,
};
await writeFile(
  resolve(root, "precache.json"),
  JSON.stringify(config, null, 2) + "\n",
);
await writeFile(
  resolve(root, "sw.js"),
  template.replace("/* PWA_CONFIG */ null", JSON.stringify(config)),
);
console.log(
  `PWA: ${entries.length} artifacts, ${(size / 1048576).toFixed(2)} MiB, scope ${config.scope}, cache ${config.cacheName}`,
);
