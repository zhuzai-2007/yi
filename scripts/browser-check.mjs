import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
mkdirSync("artifacts", { recursive: true });
const base = (process.env.BROWSER_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  external = [],
  badHttp = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("request", (r) => {
  if (new URL(r.url()).origin !== new URL(base).origin) external.push(r.url());
});
page.on("response", (r) => {
  if (r.status() >= 400) {
    badHttp.push(`${r.status()} ${r.url()}`);
    console.error("HTTP", r.status(), r.url());
  }
});
const overview = page.getByRole("region", { name: "卦象总览", exact: true });
async function storedRecords() {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(":records"));
    return key ? JSON.parse(localStorage.getItem(key)).records : [];
  });
}
async function storedDraft() {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.endsWith(":draft"));
    return key ? JSON.parse(localStorage.getItem(key)) : null;
  });
}
async function overflow(label) {
  for (const width of [1440, 1024, 768, 390, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${label} overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  checks.push(`${label}: 1440/1024/768/390/375/320px no overflow`);
}
async function startManual(question = "浏览器验收 私密测试") {
  await page.goto(base + "/");
  await page.locator("#question").fill(question);
  await page.getByRole("radio", { name: "直接输入六爻" }).check();
  await page.getByRole("button", { name: "开始起卦" }).click();
}
async function quickEntry(values) {
  await page.getByText("快速输入六个数字", { exact: true }).click();
  await page.locator("#quick").fill(values);
  await page.getByRole("button", { name: "保存并查看", exact: true }).click();
  await overview.waitFor();
}
try {
  await page.goto(base + "/");
  await page.getByRole("heading", { name: "观其象，读其辞。" }).waitFor();
  await expect(page.locator("#start-time")).not.toHaveValue("");
  await expect(
    page.getByRole("radio", { name: "三钱法 · 推荐" }),
  ).toBeChecked();
  await page.setViewportSize({ width: 1280, height: 720 });
  const startBox = await page
    .getByRole("button", { name: "开始起卦" })
    .boundingBox();
  assert(startBox.y + startBox.height <= 720, "home start action above fold");
  await overflow("home");
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-home.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-home-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await startManual();
  await page.getByRole("button", { name: "保存并查看结果" }).click();
  await expect(page.locator("#input-error")).toContainText("请完整录入");
  const labels = ["初", "二", "三", "四", "五", "上"],
    values = [7, 9, 7, 7, 6, 7];
  for (let i = 0; i < 6; i++)
    await page
      .getByRole("button", {
        name: new RegExp(`^${labels[i]}爻 ${values[i]} `),
      })
      .click();
  await page.getByRole("button", { name: "保存并查看结果" }).click();
  await overview.waitFor();
  await expect(overview).toContainText("火天大有");
  await expect(overview).toContainText("天火同人");
  await expect(overview).toContainText("九二、六五动");
  await expect(overview).toContainText("14");
  await expect(overview).toContainText("13");
  assert.deepEqual((await storedRecords())[0].lines, values);
  assert(!page.url().includes("私密"));
  assert(!(await page.title()).includes("私密"));
  assert.equal(await overview.locator(".diagram-row").count(), 12);

  const primary = page.getByRole("tablist", { name: "结果阅读", exact: true });
  const selectTab = async (name) => {
    await primary.getByRole("tab", { name, exact: true }).click();
  };
  await expect(
    primary.getByRole("tab", { name: "总览", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  assert.equal(await primary.getByRole("tab").count(), 7);
  await selectTab("本卦");
  let secondary = page.getByRole("tablist", { name: "本卦阅读维度" });
  await secondary.getByRole("tab", { name: "六爻", exact: true }).click();
  await expect(page.locator(".line-disclosure")).toHaveCount(6);
  await expect(page.locator(".line-disclosure[open]")).toHaveCount(0);
  await page.locator(".line-disclosure>summary").nth(1).click();
  await expect(page.locator(".line-text").nth(1)).toContainText("大车以载");
  await page.getByRole("button", { name: "切換為繁體中文" }).click();
  await expect(page.locator(".line-text").nth(1)).toContainText("大車以載");
  await expect(page.locator(".record-heading h1")).toHaveText(
    "浏览器验收 私密测试",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant");
  await page.getByRole("button", { name: "切换为简体中文" }).click();
  for (const name of ["本卦", "之卦"]) {
    await selectTab(name);
    secondary = page.getByRole("tablist", { name: name + "阅读维度" });
    for (const sub of ["传", "六爻", "经"]) {
      await secondary.getByRole("tab", { name: sub, exact: true }).click();
      await expect(
        secondary.getByRole("tab", { name: sub, exact: true }),
      ).toHaveAttribute("aria-selected", "true");
    }
  }
  await selectTab("动爻");
  await expect(page.locator(".moving-comparison")).toHaveCount(2);
  await expect(page.locator(".moving-comparison").first()).toContainText(
    "六二",
  );
  await expect(page.locator(".moving-comparison").first()).toContainText(
    "不正",
  );
  await expect(page.locator(".moving-comparison").first()).toContainText(
    "得正",
  );
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-moving.png",
    fullPage: true,
  });
  await selectTab("结构");
  await expect(page.locator(".full-structure")).not.toHaveAttribute("open", "");
  await page.getByText("查看完整六爻结构表", { exact: true }).click();
  for (const i of [1, 4]) {
    await expect(
      page.locator(".structure").first().locator("tbody tr").nth(i),
    ).toContainText("不正");
    await expect(
      page.locator(".structure").last().locator("tbody tr").nth(i),
    ).toContainText("得正");
  }
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-structure.png",
    fullPage: true,
  });
  await selectTab("原典关联");
  await expect(page.locator(".other-classics")).toContainText("序卦传");
  await primary
    .getByRole("tab", { name: "原典关联", exact: true })
    .press("Home");
  await expect(
    primary.getByRole("tab", { name: "总览", exact: true }),
  ).toBeFocused();
  await primary
    .getByRole("tab", { name: "总览", exact: true })
    .press("ArrowRight");
  await expect(
    primary.getByRole("tab", { name: "动爻", exact: true }),
  ).toBeFocused();
  await primary.getByRole("tab", { name: "动爻", exact: true }).press("End");
  await expect(
    primary.getByRole("tab", { name: "AI 解读", exact: true }),
  ).toBeFocused();
  await selectTab("总览");
  checks.push(
    "V3: default overview, seven primary tabs, both secondary tab sets, collapsed lines/structure, keyboard arrows/Home/End, original-to-changed structure, simplified/traditional persistence",
  );
  await overflow("result");
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-result-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-result-mobile.png",
    fullPage: true,
  });
  for (const width of [390, 375, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of [
      "总览",
      "动爻",
      "本卦",
      "之卦",
      "结构",
      "原典关联",
      "AI 解读",
    ]) {
      await selectTab(name);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        name + " mobile overflow " + width,
      );
    }
    await selectTab("总览");
    await page.locator(".raw-input>summary").click();
    const listY = (await primary.boundingBox()).y;
    await page
      .locator(".result-tabs > .tab-panel")
      .evaluate((el) => (el.scrollTop = 300));
    assert.equal((await primary.boundingBox()).y, listY);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
    );
    await page.locator(".raw-input>summary").click();
    await page
      .locator(".result-tabs > .tab-panel")
      .evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({
      animations: "disabled",
      path: "artifacts/v3-result-" + width + ".png",
      fullPage: true,
    });
  }
  await page.goto(base + "/");
  await page.locator("#question").fill("三钱验收");
  await page.getByRole("button", { name: "开始起卦" }).click();
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", {
        name: `掷第${["一", "二", "三"][i]}爻`,
        exact: true,
      })
      .click();
    const thrown = (await storedDraft()).throws.at(-1);
    for (let c = 0; c < 3; c++) {
      const coin = page.locator(".coin-object svg").nth(c);
      await expect(coin).toHaveAttribute("data-side", thrown.coins[c]);
      await expect(coin).toHaveAttribute(
        "aria-label",
        thrown.coins[c] === "heads" ? "正面，计 3" : "背面，计 2",
      );
    }
    if (i === 0) {
      assert.equal(
        await page
          .locator(".coin-object")
          .first()
          .evaluate((el) => getComputedStyle(el).animationName),
        "toss-bronze",
      );
    }
  }
  const draft = await storedDraft();
  assert.equal(draft.currentStep, 3);
  assert.deepEqual(
    draft.throws.map((t) => t.lineIndex),
    [0, 1, 2],
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "发现一个未完成的起卦记录。" }),
  ).toBeVisible();
  assert.deepEqual(await storedDraft(), draft);
  await page.getByRole("button", { name: "继续", exact: true }).click();
  await expect(page.getByRole("button", { name: "掷第四爻" })).toBeVisible();
  await overflow("casting");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-casting-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let i = 3; i < 6; i++) {
    await page
      .getByRole("button", {
        name: `掷第${["一", "二", "三", "四", "五", "六"][i]}爻`,
        exact: true,
      })
      .click();
    if (i === 3) {
      const motion = await page
        .locator(".coin-object")
        .first()
        .evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            name: s.animationName,
            duration: s.animationDuration,
            transform: s.transform,
          };
        });
      assert.notEqual(motion.name, "toss-bronze");
      assert.equal(motion.transform, "none");
      assert(parseFloat(motion.duration) <= 0.1);
    }
  }
  await overview.waitFor();
  checks.push(
    "V3: visible coin sides/aria match stored crypto results; normal toss animation and reduced-motion completion",
  );
  const cast = (await storedRecords())[0];
  assert.equal(cast.method, "three-coins");
  assert.equal(cast.throws.length, 6);
  assert.equal(await storedDraft(), null);
  for (let i = 0; i < 6; i++) {
    assert.equal(cast.throws[i].lineIndex, i);
    assert.equal(
      cast.throws[i].coins.reduce((s, c) => s + (c === "heads" ? 3 : 2), 0),
      cast.lines[i],
    );
  }
  await page.getByText("查看原始记录与三钱结果", { exact: true }).click();
  assert.equal(await page.locator(".throw-history li").count(), 6);
  checks.push(
    "B: six secure random throws, raw coins and order verified, auto-save and navigation; C: exact third-throw refresh recovery",
  );
  await page.goto(base + "/records/");
  await expect(page.locator(".record-card")).toHaveCount(2);
  await overflow("records");
  await page.screenshot({
    animations: "disabled",
    path: "artifacts/v3-records.png",
    fullPage: true,
  });
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 JSON" }).click();
  const download = await downloadEvent;
  const exported = readFileSync(await download.path(), "utf8");
  assert.equal(JSON.parse(exported).records.length, 2);
  await page.getByRole("button", { name: "删除此卦例" }).first().click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.locator(".record-card")).toHaveCount(1);
  await page.locator("input[type=file]").setInputFiles({
    name: "records.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await page.getByRole("button", { name: "确认导入" }).click();
  await expect(page.locator(".record-card")).toHaveCount(2);
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":2,"records":[]}'),
  });
  await expect(page.locator("main [role=alert]")).toContainText("格式无效");
  await expect(page.locator(".record-card")).toHaveCount(2);
  checks.push(
    "local list view/delete/export/import/duplicate merge/invalid JSON rejection verified",
  );
  for (const [value, special] of [
    ["9", "用九"],
    ["6", "用六"],
    ["7", "无动爻"],
  ]) {
    await startManual("");
    await quickEntry(Array(6).fill(value).join(" "));
    await expect(page.locator("main")).toContainText(special);
    if (value !== "7") {
      await selectTab("本卦");
      await expect(page.locator(".hex-reading-v3")).toContainText(special);
      await selectTab("原典关联");
      await page
        .getByText(/文言传 ·/)
        .first()
        .click();
      await expect(
        page.getByText("《文言传》仅附于乾、坤，并非六十四卦皆有。").first(),
      ).toBeVisible();
    }
  }
  checks.push(
    "Qian/Kun special texts + Wenyan and static six-line case retained",
  );
  for (const route of ["", "cast/", "records/", "record/?id=missing"]) {
    await page.goto(`${base}/${route}`);
    await page.reload();
    assert((await page.locator("main").innerText()).length > 0);
  }
  checks.push(
    "E: all four routes support direct visit and refresh at configured base path",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  assert.deepEqual(badHttp, []);
  checks.push(
    "zero browser/console errors, zero HTTP errors, zero third-party requests",
  );
  const report = { base, checks, errors, external, badHttp };
  writeFileSync(
    "artifacts/v3-browser-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
