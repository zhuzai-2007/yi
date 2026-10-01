import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { browserExecutable } from "./browser-executable.mjs";
import { checkPwaUpdate } from "./pwa-update-check.mjs";

const config = JSON.parse(readFileSync("out/precache.json", "utf8"));
assert.equal(
  process.env.NEXT_PUBLIC_BASE_PATH || "",
  config.basePath,
  "Build/server environment must match",
);
const base = (
  process.env.BROWSER_BASE_URL || `http://127.0.0.1:3030${config.basePath}`
).replace(/\/$/, "");
assert.equal(new URL(base + "/").pathname, config.scope);
const expectedScope = base + "/";
const origin = new URL(base).origin;
const checks = [],
  errors = [],
  unexpected = [];
let server, browser;
const fakeKey = "pwa-browser-fake-key-not-real";
const api = "https://yi-pwa-mock.invalid/v1/chat/completions";
let apiCalls = 0;
mkdirSync("artifacts", { recursive: true });
try {
  if (!process.env.BROWSER_BASE_URL) {
    server = spawn(process.execPath, ["scripts/serve.mjs"], {
      env: { ...process.env, PORT: "3030" },
      windowsHide: true,
      stdio: "pipe",
    });
    let failure = "";
    server.stderr.on("data", (data) => {
      failure += data;
    });
    await expect
      .poll(
        async () => {
          if (server.exitCode !== null)
            throw new Error("Static server failed: " + failure);
          try {
            return (await fetch(base + "/")).ok;
          } catch {
            return false;
          }
        },
        { timeout: 20000 },
      )
      .toBe(true);
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: browserExecutable(),
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  // A bootstrap image runs no registration script: create stale/foreign caches before first activation.
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.text().includes(fakeKey))
      errors.push("Credential leaked in console");
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    )
      errors.push(message.text());
  });
  context.on("request", (request) => {
    if (new URL(request.url()).origin !== origin && request.url() !== api)
      unexpected.push(request.url());
  });
  await context.route(api, async (route) => {
    apiCalls++;
    assert.equal(route.request().method(), "POST");
    assert.equal(route.request().headers().authorization, `Bearer ${fakeKey}`);
    const body = route.request().postDataJSON();
    const text = body.messages[1].content;
    const payload = JSON.parse(
      text.slice(
        text.indexOf("<payload>\n") + 10,
        text.lastIndexOf("\n</payload>"),
      ),
    );
    const result = {
      kind: "changing",
      reading: {
        text: "离线保存的导读：阅读大有，可以关注承担的条件与行动的配合。",
        evidence_source_ids: ["original.judgment"],
      },
      change_focus: payload.facts.moving_lines.map((line) => ({
        line: line.name,
        text: "这一爻可以结合经传与位置关系理解，不能据此确定现实结果。",
        evidence_source_ids: [`original.line.${line.position}`],
      })),
      application: null,
      boundary: {
        text: "本次导读只提供一种阅读角度，现实判断仍需要具体事实。",
      },
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    });
  });
  await page.goto(base + "/icons/yi-192.png");
  const foreign = "some-other-app-cache";
  const sibling = "yi-static-other-scope-old";
  const stale = config.cachePrefix + "old-version";
  await page.evaluate(
    async (names) => {
      for (const name of names) {
        const cache = await caches.open(name);
        await cache.put("/cache-owner-marker", new Response(name));
      }
    },
    [foreign, sibling, stale],
  );
  await page.goto(base + "/");
  await page.getByRole("heading", { name: "观其象，读其辞。" }).waitFor();
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
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
      timeout: 30000,
    })
    .toBe(true);
  const registration = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return {
      scope: registration.scope,
      active: registration.active.state,
      script: registration.active.scriptURL,
      updateViaCache: registration.updateViaCache,
    };
  });
  assert.deepEqual(registration, {
    scope: expectedScope,
    active: "activated",
    script: base + "/sw.js",
    updateViaCache: "none",
  });
  const cacheKeys = await page.evaluate(
    async (name) =>
      (await (await caches.open(name)).keys()).map((request) => request.url),
    config.cacheName,
  );
  assert.deepEqual(
    cacheKeys.sort(),
    config.entries.map((entry) => origin + entry.url).sort(),
  );
  const names = await page.evaluate(() => caches.keys());
  assert(!names.includes(stale));
  assert(
    names.includes(config.cacheName) &&
      names.includes(foreign) &&
      names.includes(sibling),
  );
  const manifest = await page.evaluate(async () =>
    (await fetch(document.querySelector('link[rel="manifest"]').href)).json(),
  );
  assert.equal(manifest.scope, config.scope);
  assert.equal(manifest.start_url, config.scope);
  for (const icon of manifest.icons)
    assert.equal((await context.request.get(origin + icon.src)).status(), 200);
  const cdp = await context.newCDPSession(page);
  const appManifest = await cdp.send("Page.getAppManifest");
  assert.deepEqual(appManifest.errors, []);
  await cdp.detach();
  // Native installation is unavailable in incognito; check it in a disposable normal profile.
  const installContext = await chromium.launchPersistentContext("", {
    headless: true,
    executablePath: browserExecutable(),
  });
  let installability;
  try {
    const installPage = await installContext.newPage();
    await installPage.goto(base + "/");
    await expect
      .poll(
        () =>
          installPage.evaluate(
            async () =>
              (await navigator.serviceWorker.getRegistration())?.active?.state,
          ),
        { timeout: 60000 },
      )
      .toBe("activated");
    await installPage.evaluate(() => navigator.serviceWorker.ready);
    const installCdp = await installContext.newCDPSession(installPage);
    installability = await installCdp.send("Page.getInstallabilityErrors");
    assert.deepEqual(installability.installabilityErrors, []);
  } finally {
    await installContext.close();
  }
  checks.push(
    "First online home: ready/controller/active/scope/updateViaCache; every artifact precached; manifest/icons 200; scoped stale cleanup preserves foreign and sibling caches",
  );

  // No cast/records/record page has been visited online. Each must load offline on first visit.
  await context.setOffline(true);
  async function coldRouteReady(route) {
    if (!route)
      await expect(
        page.getByRole("heading", { name: "观其象，读其辞。" }),
      ).toBeVisible();
    else if (route === "cast/")
      await expect(page.locator("main")).toContainText(
        "当前没有可继续的起卦草稿。",
      );
    else if (route === "records/")
      await expect(
        page.getByRole("heading", { name: "尚无卦例" }),
      ).toBeVisible();
    else
      await expect(page.locator("main [role=status]")).toContainText(
        "未找到此卦例",
      );
  }
  for (const route of ["", "cast/", "records/", "record/?id=missing"]) {
    await page.goto(`${base}/${route}`);
    await coldRouteReady(route);
    await page.reload();
    await coldRouteReady(route);
  }
  checks.push(
    "Cold offline first visits and direct reloads of all four routes, after online home only",
  );
  await context.setOffline(false);
  const unknown = await page.goto(base + "/not-a-static-route/");
  assert.equal(unknown.status(), 404);
  await expect(
    page.getByRole("heading", { name: "观其象，读其辞。" }),
  ).toHaveCount(0);
  const primary = page.getByRole("tablist", { name: "结果阅读", exact: true });
  const select = (name) =>
    primary.getByRole("tab", { name, exact: true }).click();
  const records = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem(
            Object.keys(localStorage).find((key) => key.endsWith(":records")),
          ) || '{"records":[]}',
        ).records,
    );
  const draft = () =>
    page.evaluate(() => {
      const key = Object.keys(localStorage).find((key) =>
        key.endsWith(":draft"),
      );
      return key ? JSON.parse(localStorage.getItem(key)) : null;
    });
  async function manual(question) {
    await page.goto(base + "/");
    await page.locator("#question").fill(question);
    await page.getByRole("radio", { name: "直接输入六爻" }).check();
    await page.getByRole("button", { name: "开始起卦" }).click();
    await page.getByText("快速输入六个数字", { exact: true }).click();
    await page.locator("#quick").fill("7 9 7 7 6 7");
    await page.getByRole("button", { name: "保存并查看", exact: true }).click();
    await primary.waitFor();
  }
  // Create a real online record and obtain one validated local AI result through an intercepted fake API.
  await manual("在线创建，离线读取的卦例");
  const onlineRecord = (await records())[0],
    onlineUrl = page.url();
  await select("AI 解读");
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "设置", exact: true })
    .click();
  await page
    .getByLabel("API Endpoint / Base URL", { exact: true })
    .fill("https://yi-pwa-mock.invalid/v1");
  await page.getByLabel("Model", { exact: true }).fill("pwa-mock-model");
  await page.getByLabel("API Key", { exact: true }).fill(fakeKey);
  await page.getByRole("button", { name: "关闭设置", exact: true }).click();
  await page.getByRole("button", { name: "生成解读", exact: true }).click();
  await expect(page.locator(".ai-result")).toContainText("离线保存的导读");
  assert.equal(apiCalls, 1);
  const savedAi = await page.evaluate(() =>
    localStorage.getItem("yi-ai-interpretations-v1"),
  );
  // Same-origin authenticated POST, authenticated GET and unknown GET bypass static caching.
  await page.evaluate(async () => {
    await fetch("./same-origin-ai-probe", {
      method: "POST",
      headers: { Authorization: "Bearer pwa-probe-fake" },
      body: "test-only",
      cache: "no-store",
    });
    await fetch("./unknown-get-probe");
    await fetch("../icons/yi-192.png", {
      headers: { Authorization: "Bearer pwa-probe-fake" },
      cache: "no-store",
    });
  });
  const cacheSnapshot = async () =>
    page.evaluate(
      async (names) => {
        const result = [];
        for (const name of names) {
          const cache = await caches.open(name);
          for (const request of await cache.keys())
            result.push({
              url: request.url,
              method: request.method,
              headers: [...request.headers],
              body: await (await cache.match(request)).text(),
            });
        }
        return result;
      },
      [config.cacheName],
    );
  const snapshot = await cacheSnapshot();
  assert(
    snapshot.every(
      (entry) =>
        entry.method === "GET" &&
        entry.headers.every(
          ([name]) => name.toLowerCase() !== "authorization",
        ) &&
        !entry.url.includes("probe") &&
        !entry.url.includes("chat/completions") &&
        new URL(entry.url).origin === origin,
    ),
  );
  assert(
    !JSON.stringify(snapshot).includes(fakeKey) &&
      !JSON.stringify(snapshot).includes("pwa-probe-fake"),
  );
  assert.deepEqual(snapshot.map((entry) => entry.url).sort(), cacheKeys.sort());
  checks.push(
    "Intercepted cross-origin AI POST, same-origin POST/auth GET/unknown GET never enter static cache; no credentials in Cache Storage",
  );

  await context.setOffline(true);
  await page.reload();
  assert.equal(
    await page.evaluate(() => navigator.onLine),
    false,
    "Browser must report offline after reload",
  );
  await expect(page.locator(".result-summary")).toContainText("火天大有");
  assert.deepEqual(
    (await records()).find((record) => record.id === onlineRecord.id),
    onlineRecord,
  );
  await select("AI 解读");
  await expect(page.locator(".ai-result")).toContainText("离线保存的导读");
  await page.getByRole("button", { name: "重新生成", exact: true }).click();
  await expect(page.locator(".ai-interpretation [role=alert]")).toContainText(
    "当前处于离线状态",
  );
  await expect(page.locator(".ai-result")).toContainText("离线保存的导读");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("yi-ai-interpretations-v1")),
    savedAi,
  );
  assert.equal(apiCalls, 1);
  await page.screenshot({
    path: "artifacts/v4-2-ai-offline.png",
    animations: "disabled",
  });
  // A mode with no cache must also explain offline without making a request.
  await page
    .getByRole("tablist", { name: "AI 解读模式" })
    .getByRole("tab", { name: "原典细读", exact: true })
    .click();
  await page.getByRole("button", { name: "生成解读", exact: true }).click();
  await expect(page.locator(".ai-interpretation [role=alert]")).toContainText(
    "离线",
  );
  await expect(page.locator(".ai-interpretation")).not.toContainText(
    /CORS|网络连接失败|pwa-browser-fake/,
  );
  assert.equal(apiCalls, 1);
  checks.push(
    "Online record survives offline reload; validated local AI cache readable; offline generate/regenerate sends zero requests and preserves cached result",
  );

  await manual("离线固定回归");
  const manualUrl = page.url();
  await expect(page.locator(".result-summary")).toContainText("火天大有");
  await expect(page.locator(".result-summary")).toContainText("九二、六五动");
  await expect(page.locator(".result-summary")).toContainText("天火同人");
  await expect(page.locator(".result-summary")).toContainText("14");
  await expect(page.locator(".result-summary")).toContainText("13");
  for (const name of ["总览", "动爻", "本卦", "之卦", "结构", "原典关联"]) {
    await select(name);
    if (name === "动爻")
      await expect(page.locator(".moving-comparison")).toHaveCount(2);
    if (name === "本卦" || name === "之卦") {
      const secondary = page.getByRole("tablist", { name: name + "阅读维度" });
      for (const sub of ["经", "传", "六爻"]) {
        await secondary.getByRole("tab", { name: sub, exact: true }).click();
        assert((await page.locator(".hex-reading-v3").innerText()).length > 30);
      }
    }
    if (name === "结构") {
      await page.getByText("查看完整六爻结构表", { exact: true }).click();
      await expect(page.locator(".structure")).toHaveCount(2);
    }
    if (name === "原典关联") {
      await page.getByText("序卦传", { exact: true }).first().click();
      await expect(page.locator(".related").first()).toContainText("序卦");
    }
  }
  await select("本卦");
  await page
    .getByRole("tablist", { name: "本卦阅读维度" })
    .getByRole("tab", { name: "六爻", exact: true })
    .click();
  await page.locator(".line-disclosure > summary").nth(1).click();
  await expect(page.locator(".line-text").nth(1)).toContainText("大车以载");
  await page.getByRole("button", { name: "切換為繁體中文" }).click();
  await expect(page.locator(".line-text").nth(1)).toContainText("大車以載");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await page.getByRole("button", { name: "切换为简体中文" }).click();
  for (const width of [390, 375, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await select("AI 解读");
    await expect(page.locator(".ai-interpretation")).toContainText(
      "当前处于离线状态",
    );
    assert(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <= innerWidth &&
          document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    );
    await page.screenshot({
      path: `artifacts/v4-2-offline-${width}.png`,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  checks.push(
    "Offline fixed 7 9 7 7 6 7: 大有14/九二六五/同人13, all six local tabs and classical text, language reload; offline UX fits 390/375/320",
  );

  await page.goto(base + "/");
  await page.getByRole("button", { name: "开始起卦" }).click();
  for (const name of ["一", "二", "三"])
    await page
      .getByRole("button", { name: `掷第${name}爻`, exact: true })
      .click();
  const third = await draft();
  assert.equal(third.currentStep, 3);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "发现一个未完成的起卦记录。" }),
  ).toBeVisible();
  assert.deepEqual(await draft(), third);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  for (const name of ["四", "五", "六"])
    await page
      .getByRole("button", { name: `掷第${name}爻`, exact: true })
      .click();
  await primary.waitFor();
  const cast = (await records())[0];
  assert.equal(cast.method, "three-coins");
  assert.equal(cast.throws.length, 6);
  for (const [index, thrown] of cast.throws.entries()) {
    assert.equal(thrown.lineIndex, index);
    assert.equal(
      thrown.coins.reduce((sum, side) => sum + (side === "heads" ? 3 : 2), 0),
      cast.lines[index],
    );
  }
  assert.deepEqual(cast.throws.slice(0, 3), third.throws);
  assert.equal(await draft(), null);
  checks.push(
    "Offline six real crypto throws, third-step reload/resume, exact coins/values/order, saved record and cleared draft",
  );
  await page.goto(base + "/records/");
  await page.reload();
  await expect(page.locator(".record-card")).toHaveCount(3);
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const download = await downloadEvent;
  const exported = readFileSync(await download.path(), "utf8");
  assert.equal(JSON.parse(exported).records.length, 3);
  assert(!exported.includes(fakeKey));
  await page.getByRole("button", { name: "删除此卦例" }).first().click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator(".record-card")).toHaveCount(2);
  await page.locator("input[type=file]").setInputFiles({
    name: "offline-records.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.locator(".record-card")).toHaveCount(3);
  for (const url of [
    base + "/",
    base + "/cast/",
    base + "/records/",
    onlineUrl,
    manualUrl,
  ]) {
    await page.goto(url);
    await page.reload();
    assert((await page.locator("main").innerText()).trim().length > 0);
  }
  assert.deepEqual(
    (await records()).find((record) => record.id === onlineRecord.id),
    onlineRecord,
  );
  const offlineCache = await cacheSnapshot();
  assert.deepEqual(
    offlineCache.map((entry) => entry.url).sort(),
    cacheKeys.sort(),
  );
  assert(!offlineCache.some((entry) => entry.url.includes("?")));
  assert.equal(
    await page.evaluate(async () => {
      try {
        await fetch("./icons/yi-192.png?not-a-precache-key");
        return true;
      } catch {
        return false;
      }
    }),
    false,
  );
  checks.push(
    "Offline records list/reload/direct record?id reload, blob JSON download, delete/import restore; no query/record/export content in static cache keys",
  );
  await context.setOffline(false);
  await page.goto(onlineUrl);
  await select("AI 解读");
  await expect(page.locator(".ai-result")).toContainText("离线保存的导读");
  await page.getByRole("button", { name: "重新生成", exact: true }).click();
  await expect.poll(() => apiCalls).toBe(2);
  await expect(page.locator(".ai-result")).toContainText("离线保存的导读");
  checks.push(
    "Back online: local UI and intercepted AI generation recover without reload loop",
  );
  const update = await checkPwaUpdate(browser, config, onlineRecord);
  checks.push(
    "Two SW revisions: new worker waits with live tab/no forced reload; close/reopen activates new cache, removes old/stale only, preserves records and supports offline reload",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  const report = {
    base,
    registration,
    cache: config.cacheName,
    artifactCount: config.entries.length,
    installability: installability.installabilityErrors,
    update,
    checks,
    errors,
    unexpectedExternalRequests: unexpected,
    mockAiRequests: apiCalls,
    realApiCalls: 0,
  };
  writeFileSync(
    "artifacts/v4-2-pwa-browser-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  server?.kill();
}
