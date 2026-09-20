export type AiErrorCode =
  | "endpoint"
  | "config"
  | "network"
  | "cors"
  | "unauthorized"
  | "rate_limit"
  | "server"
  | "http"
  | "invalid_body"
  | "abort"
  | "unsupported";
const messages: Record<AiErrorCode, string> = {
  endpoint:
    "请输入不含账号、密码、查询参数或片段的 HTTPS API Endpoint。开发环境可使用本机 HTTP。",
  config: "请填写有效的 Model 和 API Key。",
  network: "网络连接失败，请检查网络后重试。",
  cors: "该 API Endpoint 不允许当前网页直接访问（可能是 CORS 限制）。请更换支持浏览器访问的接口，或后续配置服务端代理。也请检查网络连接。",
  unauthorized: "API 鉴权失败，请检查 API Key。",
  rate_limit: "API 请求过于频繁或额度不足。",
  server: "AI API 暂时不可用，请稍后重试。",
  http: "API 拒绝了请求，请检查接口地址、模型和输出格式设置。",
  invalid_body: "API 返回内容无法读取，请检查接口是否兼容 chat completions。",
  abort: "已取消生成。",
  unsupported:
    "接口不支持当前请求格式。可在 AI 设置中切换为 JSON-only 后重试。",
};
export class AiError extends Error {
  constructor(public readonly code: AiErrorCode) {
    super(messages[code]);
  }
}
