import { createHash } from "node:crypto";

// Deployment/worker control files are not application resources. Pages returns 404 for .nojekyll.
export const UNCACHED_ARTIFACTS = new Set([
  "sw.js",
  "precache.json",
  ".nojekyll",
]);

export function validateBasePath(base = "") {
  if (
    base &&
    (!/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(base) ||
      base.split("/").some((part) => part === "." || part === ".."))
  )
    throw new Error("Invalid NEXT_PUBLIC_BASE_PATH");
  return base;
}
export const scopePath = (base) => `${validateBasePath(base)}/`;
export function artifactUrl(file, base) {
  validateBasePath(base);
  if (
    !file ||
    file.includes("\\") ||
    file.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Invalid artifact path");
  const path =
    file === "index.html"
      ? ""
      : file.endsWith("/index.html")
        ? file.slice(0, -10)
        : file;
  return scopePath(base) + path.split("/").map(encodeURIComponent).join("/");
}
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const cachePrefix = (base) =>
  `yi-static-${digest(scopePath(base)).slice(0, 12)}-`;
export function webManifest(base) {
  const scope = scopePath(base);
  return {
    id: scope,
    name: "周易 · 经传与结构",
    short_name: "周易",
    description: "本地起卦、经传阅读与确定性卦象结构分析。",
    lang: "zh-CN",
    start_url: scope,
    scope,
    display: "standalone",
    theme_color: "#f6f3ec",
    background_color: "#f6f3ec",
    icons: [
      {
        src: `${scope}icons/yi-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${scope}icons/yi-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${scope}icons/yi-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
