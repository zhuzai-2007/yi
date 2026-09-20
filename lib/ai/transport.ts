import { AiError } from "./errors";
import { interpretationJsonSchema } from "./schema";
import type { AiConfig, AiRequest, AiTransport } from "./types";
export function validateEndpoint(
  input: string,
  development = process.env.NODE_ENV === "development",
): string {
  try {
    const url = new URL(input);
    if (url.username || url.password || url.search || url.hash)
      throw new Error();
    if (
      url.protocol !== "https:" &&
      !(
        development &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error();
    return url.href;
  } catch {
    throw new AiError("endpoint");
  }
}
/** Exactly one HTTP call per generate. Format fallback is explicit, never a hidden third request. */
export class OpenAICompatibleTransport implements AiTransport {
  constructor(
    private readonly config: AiConfig,
    private readonly fetcher: typeof fetch = (input, init) =>
      fetch(input, init),
  ) {}
  async generate({ messages, signal }: AiRequest): Promise<string> {
    const endpoint = validateEndpoint(this.config.endpoint);
    if (
      !this.config.model.trim() ||
      this.config.model.length > 200 ||
      !this.config.apiKey.trim() ||
      /[\r\n]/.test(this.config.apiKey)
    )
      throw new AiError("config");
    let response: Response;
    try {
      signal.throwIfAborted();
      response = await this.fetcher(endpoint, {
        method: "POST",
        signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model.trim(),
          messages,
          stream: false,
          ...(this.config.structured
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "yi_interpretation",
                    strict: true,
                    schema: interpretationJsonSchema,
                  },
                },
              }
            : {}),
        }),
      });
    } catch {
      if (signal.aborted) throw new AiError("abort");
      throw new AiError(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "network"
          : "cors",
      );
    }
    if (!response.ok)
      throw new AiError(
        response.status === 401 || response.status === 403
          ? "unauthorized"
          : response.status === 429
            ? "rate_limit"
            : response.status >= 500
              ? "server"
              : [400, 422].includes(response.status)
                ? "unsupported"
                : "http",
      );
    try {
      // Bound the body while reading, including chunked responses without Content-Length.
      const reader = response.body?.getReader();
      if (!reader) throw new AiError("invalid_body");
      const decoder = new TextDecoder();
      let body = "",
        bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.byteLength;
          if (bytes > 512000) {
            await reader.cancel();
            throw new AiError("invalid_body");
          }
          body += decoder.decode(part.value, { stream: true });
        }
      } finally {
        reader.releaseLock();
      }
      body += decoder.decode();
      signal.throwIfAborted();
      const data = JSON.parse(body);
      const content = data?.choices?.[0]?.message?.content;
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.length > 80000
      )
        throw new AiError("invalid_body");
      // Never expose a provider response echoing a credential to rendering or cache.
      if (content.includes(this.config.apiKey))
        throw new AiError("invalid_body");
      return content;
    } catch {
      throw new AiError(signal.aborted ? "abort" : "invalid_body");
    }
  }
}
