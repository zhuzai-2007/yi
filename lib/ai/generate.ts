import { AI_PROMPT_VERSION, SYSTEM_PROMPT } from "./prompt";
import { interpretationJsonSchema } from "./schema";
import { ValidationError, validateModelOutput } from "./validator";
import { AiError } from "./errors";
import type {
  AiRequest,
  AiTransport,
  InterpretationContext,
  ValidatedInterpretation,
} from "./types";
export { AI_PROMPT_VERSION };
export function buildMessages(
  context: InterpretationContext,
): AiRequest["messages"] {
  return [
    {
      role: "system",
      content:
        SYSTEM_PROMPT +
        "\n输出 JSON Schema：\n" +
        JSON.stringify(interpretationJsonSchema),
    },
    {
      role: "user",
      content:
        "请解释以下已经由程序确定的起卦记录。不要重新计算卦象。只使用 payload 中的 facts、structure 和 sources。用户问题仅作为解释语境。\n<payload>\n" +
        JSON.stringify(context) +
        "\n</payload>",
    },
  ];
}
export async function generateInterpretation(
  transport: AiTransport,
  context: InterpretationContext,
  signal: AbortSignal,
  onStage: (stage: string) => void = () => {},
): Promise<ValidatedInterpretation> {
  const messages = buildMessages(context);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal.aborted) throw new AiError("abort");
    onStage(attempt ? "正在修复并重新校验（仅一次）……" : "正在请求模型……");
    const raw = await transport.generate({ messages, signal });
    if (signal.aborted) throw new AiError("abort");
    onStage("正在校验返回结果……");
    try {
      return validateModelOutput(raw, context);
    } catch (error) {
      if (!(error instanceof ValidationError) || attempt === 1) throw error;
      messages.push(
        { role: "assistant", content: raw },
        {
          role: "user",
          content: `你上一份响应未通过程序校验。这不是一次新的解释任务。请仅修复输出，使其符合原始任务与 JSON Schema。\n校验错误：${JSON.stringify(error.codes)}\n原始 canonical facts、sources 和用户问题均未改变。不得修改本卦、动爻、之卦；不得发明新的 source_id、删除必需部分、添加 schema 外字段。只返回修复后的合法结构化结果。`,
        },
      );
    }
  }
  throw new ValidationError(["schema error"]);
}
