# V2 验收记录

验收环境：Windows、Node.js 22.23.2、Next.js 16.3.5、系统 Chrome。日期：2026-09-20。

## 已实际执行

| 检查 | 结果 |
| --- | --- |
| 修改前 `npm test` | 原 8 项全部通过 |
| `npm run lint` | 通过，0 错误、0 警告 |
| `npm run typecheck` | TypeScript strict 通过 |
| `npm test` | 20 项通过，0 失败；原 8 项完整保留 |
| `npm run build` | 根路径和 `/yi` 子路径均完成静态导出 |
| `npm run check:static` | 四个页面的 HTML、脚本、样式与导航路径通过 |
| `npm run test:browser` | `/yi` 最终生产产物完整流程通过 |

`out/` 当前是 `/yi` 子路径产物，预览时需同样设置 `NEXT_PUBLIC_BASE_PATH=/yi`。根路径构建命令见 README。最后格式化后重新执行了 lint、typecheck、test、build、check:static，并复验浏览器流程。

## 测试范围

- 保留全部 4096 六爻组合检查：64 卦覆盖、动爻、变卦、上下方向、中、正、应以及翻转性质。
- 保留原 64 卦/384 爻辞与小象/彖象/乾坤专属文本/序卦杂卦关联及来源哈希检查。
- 穷举三钱 8 种正背组合，6/7/8/9 的组合数为 1/3/3/1。
- 穷举 256 字节值，奇偶分为 128/128；安全随机源异常不使用其他随机 fallback。
- 六次 append 顺序、不可变输入、初爻 index 0 与上爻 index 5、元数据不影响六爻。
- 本地时间带时区偏移，拒绝无效日期输入。
- 记录保存、重开、删除、导入、导出、去重、ID 冲突、未知 schema、非法币面和六爻不一致、格式损坏、配额错误。
- 第三投草稿精确恢复；第六投完成草稿可幂等保存，失败不覆盖旧数据。
- 简体生成结果可重复；原文不改；“乾”和“乾乾”保留。
- 根路径与子路径站内链接构造测试。

## A–E 浏览器验收

**A：直接输入。** 实际按初、二、三、四、五、上点击 `7 9 7 7 6 7`：火天大有 ䷍（14）、九二六五动、天火同人 ䷌（13）。两组六爻图共 12 行；本卦二五得中不正且有应，之卦二五得正且有应。动爻区显示原/变结构。

**B：三钱流程。** 使用真实 `crypto.getRandomValues` 完成六投；逐条核对索引、三枚正背、合计与 lines 一致；完成后自动保存、清草稿并进入结果页，可查看原始结果。

**C：刷新恢复。** 在第三投后读取草稿，刷新，看到继续/重新开始提示；继续后第四爻按钮正确，前三次币面和合计没有改变。

**D：简繁。** 经文“大车以载 / 大車以載”和主要 UI 切换；刷新保留偏好；问题文本不被转换；页面 title 和 URL 不含所问内容。全老阳/老阴、无动爻、用九/用六、乾坤文言也已验证。

**E：Pages 子路径。** 在 `http://127.0.0.1:3011/yi/` 真实静态服务上访问四页，逐页刷新；导航、脚本、样式、favicon 正常。零 HTTP 4xx/5xx、零浏览器或控制台错误、零第三方网络请求。没有 SPA fallback 或运行时 API。

其他：本地列表、确认删除、真实下载 JSON、重新导入恢复、重复合并、无效 JSON 拒绝；首页、结果、投掷页、列表在 1440/1024/768/390/320px 均无页面横向溢出。桌面与手机截图已实际查看，保留纸墨、双卦对照与文字正背标识。手机宽结构表在内部滚动，不撑开页面。

## 证据

- `artifacts/v2-browser-report.json`：最终 `/yi` 生产产物浏览器报告。
- `artifacts/v2-home.png`、`v2-first-screen.png`：首页。
- `artifacts/v2-result-desktop.png`、`v2-result-mobile.png`：回归案例与两卦结构。
- `artifacts/v2-casting-mobile.png`：第三投后的手机流程。

旧 `artifacts/desktop.png`、`mobile.png`、`structure.png`、`browser-report.json` 属于 V1 证据，不代表 V2 页面。

## 边界与待人工/外部检查

- GitHub Actions 仅配置完成并核对官方 Actions；本地没有 Git 仓库或远端，未运行远端 workflow、未部署。需要目标仓库开启 Pages 的 GitHub Actions 来源并首次运行，检查权限、environment 和发布 URL。
- 未进行 iOS Safari/Android 真机测试、辅助技术朗读验收；Chrome 的移动 viewport 检查不等同于这些检查。
- 存储配额/禁用异常做了单元模拟，未穷举所有浏览器模式。localStorage 不具加密或跨标签事务保证，清除或改变站点来源后需用导出文件恢复。
- 原典异文与句读人工复核项保持 V1 的 `DATA-AUDIT.md`；不把数据完整性或简繁转换测试当作学术定本认证。
- 第一次基线测试的 Windows `spawn EPERM`、npm 默认离线缓存限制均通过获准执行环境解决，未修改应用逻辑来掩盖环境问题。
