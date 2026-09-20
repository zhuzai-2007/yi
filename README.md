# 周易 · 经传与结构 V4

**《周易》经传阅读 + 卦象结构计算 + 三钱起卦记录工具。**

沿用 Next.js App Router、React、TypeScript strict 与 V1 的经典原件和确定性计算核心。所有交互均在浏览器完成，生产产物是 `out/` 静态文件，无 Route Handler、Server Action、数据库、登录或运行时后端。V4 增加用户主动触发、直连自选 API 的 AI 辅助解读。

## 页面与信息层级

- `/`：所问何事（可空）、本地时间（可改）、三钱法（默认）或直接输入。
- `/cast/`：六次独立投掷；每一投保存草稿；支持刷新后继续或重新开始。
- `/records/`：当前浏览器卦例，查看、删除、主动导出和导入 JSON。
- `/record/?id=…`：仅用随机 ID 定位本地原始记录，重新计算结果。

沿用 V3 sticky App Shell，一级标签为：总览、动爻、本卦、之卦、结构、原典关联、AI 解读。本卦与之卦内部再分「经 / 传 / 六爻」。桌面左侧导航、右侧独立阅读滚动；手机在 Header 下固定横向标签。首页是紧凑起卦工作台，三钱页采用本地 SVG 方孔铜钱，上方投掷、下方展示已成六爻。

## AI 辅助解读

V4 使用 BYOK：在「AI 解读 → AI 设置」填写完整 HTTPS chat completions Endpoint、Model 和自己的 API Key。站点不含内置 API key，继续支持 GitHub Pages `/yi/` 纯静态部署。接口必须支持浏览器直接访问（CORS）；生产构建只允许 HTTPS，开发构建另允许 `http://localhost` / `http://127.0.0.1`。地址不得包含账号密码、查询参数或片段。

提供「白话导读 / 原典细读 / 结合所问」三个模式；所问为空时不能生成结合所问解读。打开记录、切换页签或模式不会调用模型。只有点击「生成解读 / 重新生成」才会将本次相关卦象、经典材料、结构及所问发送到所配置的 API。生成期间可取消；切换模式、离开页签或记录变化会取消，120 秒后也会中止等待。

AI 不负责算卦。`lib/ai/context.ts` 使用现有确定性核心的结果与本地原典生成 canonical facts 和稳定 source IDs。模型只返回解释文字和引用 ID，经 JSON parse → Zod strict schema → domain validation（动爻数量、顺序、爻名及模式）→ source validation 后，才交给固定 UI。失败仅自动修复一次，连续失败不展示残缺内容。引用展开的原文来自本地数据；AI 内容不进入「经」「传」标签或经典数据库。

默认请求 JSON Schema structured output；接口不支持时可在设置中切换为 JSON-only，仍执行同样的本地严格校验。不会偷偷降级重发；每次生成最多初次请求加一次校验修复。`OpenAICompatibleTransport` 隔离 provider，方便以后增加 adapter。完整 system prompt 位于 `lib/ai/prompt.ts`，版本 `yi-ai-v1`。

默认 Key 只写 `sessionStorage` 的 `yi-ai-session-config`。仅明确勾选「在此设备记住 API Key」时才写 `localStorage` 的 `yi-ai-saved-config`；取消勾选会删除持久副本，清除设置会删除两处配置。Key 直接放在发往自选接口的 Authorization header 中，不进入 URL、卦例、缓存或导出。浏览器存储不是加密保险箱，公共设备请勿记住 Key。

通过校验的解读独立保存在 `yi-ai-interpretations-v1`，按部署路径、稳定记录 ID/内容指纹、模式、模型、prompt 版本匹配；读取时重新校验，可重新生成或删除。身份指纹是本地稳定序列化，不是加密。卦例 schema、JSON 导入导出范围保持不变，AI 结果和设置本轮不参与导出。

AI 解读仅作阅读辅助，不是确定性预测；这些机械校验不能证明解释文字正确、引用充分或学术解释唯一。没有真实 API 调用测试，接口兼容性与解读质量需用户在自己的 provider 上验收。验收记录见 [VERIFICATION.md](VERIFICATION.md)。

## 三钱约定与结构规则

集中常量 `COIN_VALUES = { heads: 3, tails: 2 }`：正面 3，背面 2。每投三枚，合计 6 老阴、7 少阳、8 少阴、9 老阳。

随机来源是浏览器 `crypto.getRandomValues(new Uint8Array(3))`，每枚钱使用一个字节的奇偶位。256 个字节值中正背各占 128 个，无取模偏差，也没有 `Math.random()` fallback。随机 UUID 使用 `crypto.randomUUID()`。请通过 HTTPS 或 localhost 使用。

第一次 = 初爻 = `index 0`，第六次 = 上爻 = `index 5`。数组自下而上，卦图上爻在上。每条投掷保留 `lineIndex`、三枚 `coins` 与 `value`，可复现并核对合计。

- 6 阴动变阳，9 阳动变阴，7/8 不变；爻名按阴阳称六/九。
- 二、五得中；奇位阳、偶位阴，阴阳匹配为正；同时成立为中正。
- 初四、二五、三上配对：阴阳相异有应，相同不应。
- 比表示相邻；下承上、上乘下，只说明位置事实。
- 之卦不赋予第二轮动静。无动爻时本卦与之卦相同。
- 乾坤用九、用六单列；不加入后世取辞规则。

**时间与所问内容仅用于记录，不参与计算。** 不含纳甲、六亲、世应、六神、日辰、月建、旺衰、旬空、梅花易数、八字、神煞、风水或任何吉凶评分、概率预测、现代断语。

## 数据与简繁

`sources/` 是维基文库固定修订快照；`lib/iching/data/hexagrams.json` 与 `related.json` 保留来源原文、修订号和 SHA-256。涵盖 64 卦卦辞、384 爻辞与小象、64 彖与大象、乾坤用九/用六及其象辞和文言，以及序卦、杂卦的明确关联。来源和人工校勘项见 [SOURCES.md](SOURCES.md)、[DATA-AUDIT.md](DATA-AUDIT.md)。

默认简体。`npm run data:simplify` 用锁定依赖版本的 OpenCC 在构建前生成 `simplified.json`，不覆盖原始文本；繁体模式直接展示来源字形和标点。明确保护 qián 义的「乾」及「乾乾」，避免通用转换误写为「干」。简体是阅读转换层，不是另一个校勘底本。UI 文案由随站点打包的 OpenCC 在本地切换；用户问题永不转换，URL 和表单值也不参与转换。没有远程转换 API。

`npm run data:import` 可从原件离线重建原始数据，再运行 `npm run data:simplify`。原件下载脚本在 `scripts/download-sources.ps1`，不会自动覆盖既有快照。

## 本地存储与隐私

键名带版本及部署路径，避免同一 GitHub Pages 域下的不同项目误用记录：

```text
zhouyi-v2:<basePath 或 />:records
zhouyi-v2:<basePath 或 />:draft
zhouyi-v2:<basePath 或 />:language
```

记录容器和导出文件都为 `{ schemaVersion: 1, records: CastRecord[] }`。每条记录：

```ts
type CastRecord = {
  schemaVersion: 1;
  id: string;
  createdAt: string; // 用户选择的起卦时间，ISO 8601，带时区偏移
  question: string;
  method: "three-coins" | "manual";
  convention: { heads: 3; tails: 2 };
  throws: {
    lineIndex: number;
    coins: [CoinSide, CoinSide, CoinSide];
    value: 6 | 7 | 8 | 9;
  }[];
  lines: readonly [
    LineValue,
    LineValue,
    LineValue,
    LineValue,
    LineValue,
    LineValue,
  ];
};
type CoinSide = "heads" | "tails";
type LineValue = 6 | 7 | 8 | 9;
```

直接输入的 `throws` 为 `[]`。不存本卦、之卦、结构等派生结论；打开时用当前规则引擎重算。

草稿：`{ schemaVersion:1, id, question, startTime, method:'three-coins', convention, throws, currentStep }`。`currentStep` 等于已经保存的投掷数（0–6）。第六投先存草稿再存卦例，完成后清草稿；若过程中保存中断，恢复时可幂等完成，避免重复记录。保存失败会暂停投掷、保留本次结果并提供重试，不会偷偷重新随机。

导入先整体校验再确认合并：校验版本、时间、方法、约定、数量、索引、币面、币面合计与六爻一致性。重复记录去重；相同 ID 内容不同则整批拒绝，原记录不变。不支持不明历史 schema 自动迁移。文件最大 10 MB、最多 5000 条、每条问题最多 10000 字符；浏览器实际存储配额可能更小。

卦例本身只写 localStorage，不自动上传、不进 URL、不进 title、不被分析脚本记录。仅用户主动生成 AI 解读时发送相关材料与所问到自选 API；当前无 analytics。导出由用户点击触发，文件含问题内容，请自行保管。localStorage **不是加密保险箱**：同设备同浏览器可查看；清理数据、更换浏览器、域名、端口或部署路径会使旧记录不可见，迁移前请导出。不同标签页不建议同时编辑同一草稿，检测到已有变化时会拒绝覆盖。

## 本地开发与检查

建议 Node.js 22，安装依赖使用锁文件：

```powershell
npm ci
npm run dev
```

访问 [本地开发站点](http://127.0.0.1:3000)。若本机 npm 全局设为离线，首次安装可用 `npm ci --offline=false --registry=https://registry.npmjs.org`。

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run check:static
npm start
```

`npm run build` 先校验经典数据、生成简体阅读层，再运行 `next build`，直接输出 `out/`（无需 `next export`）。`npm start` 只是本地静态预览器，生产托管不需要 Node 服务。默认 3000 端口，可用 `$env:PORT='3010'` 更改。

浏览器验收：站点运行后执行 `npm run test:browser`（既有流程）和 `npm run test:browser:ai`（拦截模拟 API，不访问真实 provider）。默认用 Windows 已安装 Chrome；其他平台用 `BROWSER_PATH` 指向 Chrome/Chromium。`BROWSER_BASE_URL` 可覆盖待测地址。既有流程报告在 `artifacts/v3-browser-report.json`，V4 AI 报告在 `artifacts/v4-ai-browser-report.json`。

## GitHub Pages

使用 `output:'export'`、`trailingSlash:true` 和构建期 `NEXT_PUBLIC_BASE_PATH`。四个固定页面各自生成 `index.html`；记录 ID 通过查询字符串在客户端读取，不使用动态路径、重写或 404 SPA fallback。站内采用普通 HTML 导航，避免当前 Next.js 导出版本的 RSC 预取路径问题。

此处 `basePath` 已处理脚本、样式与链接，不需额外 `assetPrefix`（该选项主要用于独立 CDN）。没有 `next/image` 远程优化依赖；包含 `.nojekyll`。

模拟 `https://USERNAME.github.io/yi/`：

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/yi'
npm run build
npm run check:static
$env:PORT='3011'
npm start
# 另一个终端
$env:BROWSER_BASE_URL='http://127.0.0.1:3011/yi'
npm run test:browser
```

根站点构建：先 `Remove-Item Env:NEXT_PUBLIC_BASE_PATH -ErrorAction SilentlyContinue` 再构建。构建与静态预览的路径配置须一致；修改路径后必须重新构建。

自动部署配置在 [.github/workflows/pages.yml](.github/workflows/pages.yml)：

1. 将项目放入 GitHub 仓库，在 **Settings → Pages → Source** 选择 **GitHub Actions**。
2. push 到 `main` 或手动触发 `workflow_dispatch`。
3. `npm ci → lint → typecheck → test → build/export → check:static → upload → deploy`。
4. `configure-pages` 的 `base_path` 输出传给构建，自动适配仓库子路径、根站点或自定义域名配置。

使用 GitHub 官方 `configure-pages@v5`、`upload-pages-artifact@v4`、`deploy-pages@v4`；部署 job 仅申请 `pages:write`、`id-token:write`，并使用 `github-pages` environment。参考 [GitHub 官方 Pages workflow 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。本轮未关联远端仓库、未 push、未真实部署；需在目标仓库首次运行后确认 Pages 设置、Actions 权限和发布 URL。

## 验收与文件变更

固定回归：初至上 `7 9 7 7 6 7` → 火天大有 ䷍（14），九二、六五动 → 天火同人 ䷌（13）。原二、五得中不正且有应；变后二、五中正且有应。

实际检查、截图与边界见 [VERIFICATION.md](VERIFICATION.md)；V2 审计和修改清单见 [V2-DELIVERY.md](V2-DELIVERY.md)。
