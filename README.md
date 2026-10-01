# 周易 · 经传与结构 V4.2 / PWA

**《周易》经传阅读 + 卦象结构计算 + 三钱起卦记录工具。**

沿用 Next.js App Router、React、TypeScript strict 与 V1 的经典原件和确定性计算核心。所有交互均在浏览器完成，生产产物是 `out/` 静态文件，无 Route Handler、Server Action、数据库、登录或运行时后端。V4 增加用户主动触发、直连自选 API 的 AI 辅助解读。

## 页面与信息层级

- `/`：所问何事（可空）、本地时间（可改）、三钱法（默认）或直接输入。
- `/cast/`：六次独立投掷；每一投保存草稿；支持刷新后继续或重新开始。
- `/records/`：当前浏览器卦例，查看、删除、主动导出和导入 JSON。
- `/record/?id=…`：仅用随机 ID 定位本地原始记录，重新计算结果。

沿用 V3 sticky App Shell，一级标签为：总览、动爻、本卦、之卦、结构、原典关联、AI 解读。本卦与之卦内部再分「经 / 传 / 六爻」。桌面左侧导航、右侧独立阅读滚动；手机也使用独立内容滚动，Header、摘要与紧凑横向一级标签保留在阅读区外。本卦、之卦和 AI 的二级标签在阅读区顶部 sticky。无动爻只显示一份摘要；变化箭头统一采用 SVG。首页是紧凑起卦工作台，三钱页采用本地 SVG 方孔铜钱，上方投掷、下方展示已成六爻。

## AI 辅助解读

V4.1 使用 BYOK：在全局 Header「设置」或 AI 服务状态行打开设置面板，填写 HTTPS 地址、Model 和自己的 API Key。桌面为右侧 drawer，移动端为全屏 dialog，支持 Escape、焦点返回与键盘操作。默认 Base URL 会在路径末尾拼接 `/chat/completions`（清理末尾斜杠；如需 `/v1`，应包含在 Base URL 中）；高级模式「完整接口地址」原样使用 URL。旧 V4 配置按完整地址迁移，并保留原输出格式，不增加持久保存 Key 的授权。站点不含内置 API key，继续支持 GitHub Pages `/yi/` 纯静态部署。接口必须支持浏览器直接访问（CORS）；生产构建只允许 HTTPS，开发构建另允许 `http://localhost` / `http://127.0.0.1`。地址不得包含账号密码、查询参数或片段。

提供「白话导读 / 原典细读 / 结合所问」三个模式；所问为空时禁用结合所问模式。打开记录、切换页签或模式不会调用模型。只有点击「生成解读 / 重新生成」才会将本次相关卦象、经典材料、结构及所问发送到所配置的 API。生成期间可取消；切换模式、离开页签或记录变化会取消，120 秒后也会中止等待。

AI 不负责算卦。`lib/ai/context.ts` 使用现有确定性核心的结果与本地原典生成 canonical facts 和稳定 source IDs。模型只返回解释文字和引用 ID，经 JSON parse → Zod strict schema → domain validation（静卦/变卦类型、动爻数量、顺序、爻名及模式）→ source validation → meta-language validation 后，才交给固定 UI。失败仅自动修复一次，连续失败不展示残缺内容。引用展开的原文来自本地数据；AI 内容不进入「经」「传」标签或经典数据库。

输出格式为 `auto / json_object / json_schema`。自动与 JSON only 均通过提示要求纯 JSON，不强制发送 `response_format`，以兼容更多接口；只有明确选择 JSON Schema 时发送对应静卦或变卦的固定 schema。三者均执行同样的本地严格校验。不会偷偷降级重发；每次生成最多初次请求加一次校验修复。`OpenAICompatibleTransport` 隔离 provider，方便以后增加 adapter。完整 system prompt 位于 `lib/ai/prompt.ts`，版本 `yi-ai-v4.1`。静卦结构为 `kind / reading / application / boundary`；变卦另有与确定动爻一致的 `change_focus`。旧版本 AI 缓存不会作为新结果显示，原卦例不受影响。正文优先连续短文，依据集中折叠、去重并按本地 sources 顺序展示。所有可见 AI 文字检查内部术语；命中时修复而非删词，第二次失败不展示结果。

默认 Key 只写 `sessionStorage` 的 `yi-ai-session-config`。仅明确勾选「在此设备记住 API Key」时才写 `localStorage` 的 `yi-ai-saved-config`；取消勾选会删除持久副本，清除设置会删除两处配置。Key 直接放在发往自选接口的 Authorization header 中，不进入 URL、卦例、缓存或导出。浏览器存储不是加密保险箱，公共设备请勿记住 Key。

通过校验的解读独立保存在 `yi-ai-interpretations-v1`，按部署路径、稳定记录 ID/内容指纹、模式、模型、prompt 版本匹配；读取时重新校验，可重新生成或删除，也可在全局设置中清除全部 AI 缓存。身份指纹是本地稳定序列化，不是加密。卦例 schema、JSON 导入导出范围保持不变，AI 结果和设置本轮不参与导出。

AI 解读仅作阅读辅助，不是确定性预测；这些机械校验不能证明解释文字正确、引用充分或学术解释唯一。没有真实 API 调用测试，接口兼容性与解读质量需用户在自己的 provider 上验收。验收记录见 [VERIFICATION.md](VERIFICATION.md)。

### PWA / 离线使用

首次需要联网打开站点并等待 Service Worker 完成整个静态产物的预缓存。安装成功后，首页、直接输入、三钱起卦、草稿恢复、本地卦例、总览／动爻／本卦／之卦／结构／原典关联、经传全文、简繁切换以及 JSON 导入导出都可离线使用；无需先逐页访问。离线打开 `/record/?id=…` 时，只有导航请求忽略查询参数，返回缓存的记录页 HTML，再读取当前浏览器的记录。

新的 AI 解读仍需联网。离线状态会明确提示并阻止发送；已有、能够按原模型／模式／记录内容匹配的本地 AI 解读仍按原校验规则读取，离线重新生成不会删除它。`navigator.onLine` 只是即时状态提示，在线也可能遇到连接或 CORS 问题。AI 缓存继续使用 localStorage 的 `yi-ai-interpretations-v1`；Service Worker 不缓存 BYOK 请求、响应、Key、Authorization、所问或记录导出文件。

Chrome / Edge 可使用地址栏或浏览器菜单的安装入口；Android 可选择安装／添加到主屏幕；iOS Safari 使用「分享 → 添加到主屏幕」，添加后先联网打开一次再尝试飞行模式。站点沿用纸墨界面，没有自制安装弹窗。必须通过 HTTPS 或 localhost 使用 Service Worker。

`npm run build` 自动生成 manifest、`sw.js` 和内容哈希预缓存清单。所有 URL、安装启动地址与 scope 都由 `NEXT_PUBLIC_BASE_PATH` 生成，支持根路径、`/yi` 和多段子路径；无需手工复制文件或修改仓库名。SW 部署在当前 basePath 内，不依赖特殊响应头。192／512 PNG、独立 maskable PNG 与 iOS 180 PNG 均随站点提供。

缓存名为 `yi-static-<部署路径指纹>-<构建内容指纹>`。安装阶段核对每个文件的 SHA-256，全部成功才安装；运行时仅对同源、scope 内、清单中的静态 GET 使用 cache-first，不添加任意 runtime cache。POST、跨域、`no-store` 与显式认证请求不走静态缓存。未知路由保留 404，资源查询参数不被一律忽略。

预缓存扫描全部导出应用文件，只排除 SW 本身、诊断清单 `precache.json` 与部署控制文件 `.nojekyll`；后者保留在部署产物中，但公开 Pages 不提供其下载 URL，不能作为安装必需资源。

页面打开时注册并检查更新，`updateViaCache: "none"`。新版本先完整预缓存，然后等待所有由旧 worker 控制的标签页／主屏幕窗口关闭，再在下次打开时接管；不会自动刷新正在填写的表单。单独刷新一个仍打开的旧标签页可能继续使用旧版本。激活只删除当前部署路径下的旧 Yi 静态缓存，不改 localStorage，也不删除其他站点或兄弟路径的 cache。开发模式不注册 SW，建议使用不同于生产预览的端口。

浏览器可能因存储压力或系统策略回收 Cache Storage，离线缓存不保证永久保留；回收后需要重新联网完整加载。**清除网站数据会同时删除本地卦例、设置和 PWA 缓存**，操作前请导出卦例。主屏幕应用与普通浏览器的存储共享行为取决于浏览器和系统，iOS 真机安装仍需人工验收。

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

`npm run build` 先校验经典数据、生成简体阅读层，再运行 `next build` 静态导出，最后扫描 `out/` 生成完整 PWA（无需 `next export` 或第二个手工步骤）。`npm start` 只是本地静态预览器，生产托管不需要 Node 服务。默认 3000 端口，可用 `$env:PORT='3010'` 更改。

浏览器验收：站点运行后执行 `npm run test:browser`（既有流程）和 `npm run test:browser:ai`（拦截模拟 API，不访问真实 provider）。自动探测已安装的 Windows Chrome／Edge、Linux Chrome／Chromium，也可用 `BROWSER_PATH` 覆盖。`BROWSER_BASE_URL` 可覆盖待测地址。既有流程报告在 `artifacts/v3-browser-report.json`，当前 AI 报告在 `artifacts/v4-1-ai-browser-report.json`。

`npm run test:browser:pwa` 针对 production `out/` 验证真实 offline、全部静态路由、起卦／草稿／本地数据、导入导出、AI 离线与缓存排除、双版本 worker 更新及 Chromium 原生安装资格。未设置 `BROWSER_BASE_URL` 时，脚本自动以同一 basePath 启动静态服务器（3030 端口），结束时停止；显式设置时使用已有服务器。构建与测试的 `NEXT_PUBLIC_BASE_PATH` 必须一致。自动发现本机 Chrome／Edge 与 Linux Chrome／Chromium，不下载浏览器。报告为 `artifacts/v4-2-pwa-browser-report.json`；AI 当前报告为 `artifacts/v4-1-ai-browser-report.json`。更新测试用内存中的两个 worker 版本，不修改待部署产物。

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
3. `npm ci → lint → typecheck → test → build/export/PWA → check:static → production PWA offline regression → upload → deploy`。
4. `configure-pages` 的 `base_path` 输出传给构建，自动适配仓库子路径、根站点或自定义域名配置。

使用 GitHub 官方 `configure-pages@v5`、`upload-pages-artifact@v4`、`deploy-pages@v4`；部署 job 仅申请 `pages:write`、`id-token:write`，并使用 `github-pages` environment。PWA 回归使用 runner 已有 Chrome（依据[官方 runner 软件清单](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md)），测试实际 Pages base_path 的导出产物，只有本地请求和拦截的假 AI，无新 secret 或外部服务。本轮未运行远端 Actions、未 push 或部署；首次发布后仍需检查实际 workflow、Pages 和真机安装行为。

## 验收与文件变更

固定回归：初至上 `7 9 7 7 6 7` → 火天大有 ䷍（14），九二、六五动 → 天火同人 ䷌（13）。原二、五得中不正且有应；变后二、五中正且有应。

实际检查、截图与边界见 [VERIFICATION.md](VERIFICATION.md)；V2 审计和修改清单见 [V2-DELIVERY.md](V2-DELIVERY.md)。
