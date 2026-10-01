import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { expect } from "@playwright/test";
import assert from "node:assert/strict";
import { digest } from "./pwa.mjs";

// Serve two SW revisions from memory, without modifying the deployable out/ directory.
export async function checkPwaUpdate(browser, config, record) {
  const original = await readFile("out/sw.js", "utf8");
  const fingerprint = digest(config.fingerprint + "local-update-regression");
  const next = {
    ...config,
    fingerprint,
    cacheName: config.cachePrefix + fingerprint.slice(0, 24),
  };
  let source = original;
  const root = resolve("out");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname === config.scope + "sw.js") {
        response.writeHead(200, {
          "Content-Type": "text/javascript",
          "Cache-Control": "no-store",
        });
        response.end(source);
        return;
      }
      if (!url.pathname.startsWith(config.scope))
        throw new Error("Outside scope");
      const path = url.pathname.endsWith("/")
        ? url.pathname + "index.html"
        : url.pathname;
      const file = resolve(
        root,
        decodeURIComponent(path.slice(config.scope.length)),
      );
      if (!file.startsWith(root + sep)) throw new Error("Outside export");
      const bytes = await readFile(file);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".webmanifest": "application/manifest+json",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".txt": "text/plain",
      };
      response.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}${config.basePath}`;
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(base + "/");
    await expect
      .poll(
        () =>
          page.evaluate(
            async () =>
              (await navigator.serviceWorker.getRegistration())?.active?.state,
          ),
        { timeout: 60000 },
      )
      .toBe("activated");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
      .toBe(true);
    await page.locator("#question").fill("更新期间正在输入的内容");
    const saved = JSON.stringify({ schemaVersion: 1, records: [record] });
    const recordKey = `zhouyi-v2:${config.basePath || "/"}:records`;
    const stale = config.cachePrefix + "old-version";
    await page.evaluate(
      async ({ stale, saved, recordKey }) => {
        await caches.open(stale);
        await caches.open("some-other-app-cache");
        localStorage.setItem(recordKey, saved);
      },
      { stale, saved, recordKey },
    );
    source = original.replace(JSON.stringify(config), JSON.stringify(next));
    const arriving = context.waitForEvent("serviceworker");
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration()).update();
    });
    const worker = await arriving;
    await expect
      .poll(
        () =>
          page.evaluate(
            async () =>
              (await navigator.serviceWorker.getRegistration()).waiting?.state,
          ),
        { timeout: 30000 },
      )
      .toBe("installed");
    const pending = await page.evaluate(() => caches.keys());
    assert(
      pending.includes(config.cacheName) &&
        pending.includes(next.cacheName) &&
        pending.includes(stale),
    );
    await expect(page.locator("#question")).toHaveValue(
      "更新期间正在输入的内容",
    );
    await page.reload();
    // Reload alone keeps the old document controlled; the waiting worker never forces it out.
    assert(
      (await page.evaluate(() => caches.keys())).includes(config.cacheName),
    );
    await page.close();
    await expect
      .poll(
        () =>
          worker.evaluate(
            async ({ current, old, stale }) => {
              const names = await caches.keys();
              return (
                names.includes(current) &&
                !names.includes(old) &&
                !names.includes(stale)
              );
            },
            { current: next.cacheName, old: config.cacheName, stale },
          ),
        { timeout: 30000 },
      )
      .toBe(true);
    const reopened = await context.newPage();
    await reopened.goto(base + "/");
    await expect
      .poll(async () => {
        const names = await reopened.evaluate(() => caches.keys());
        return (
          names.includes(next.cacheName) &&
          !names.includes(config.cacheName) &&
          !names.includes(stale) &&
          names.includes("some-other-app-cache")
        );
      })
      .toBe(true);
    assert.equal(
      await reopened.evaluate((key) => localStorage.getItem(key), recordKey),
      saved,
    );
    await context.setOffline(true);
    await reopened.goto(base + "/record/?id=" + record.id);
    await reopened.reload();
    await expect(reopened.locator(".result-summary")).toContainText("火天大有");
    await expect(reopened.locator(".result-summary")).toContainText("天火同人");
    return {
      waitingWithOpenTab: true,
      noForcedReload: true,
      newCache: next.cacheName,
      oldAndStaleRemoved: true,
      foreignPreserved: true,
      recordsPreserved: true,
      newVersionOfflineReload: true,
    };
  } finally {
    await context.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
