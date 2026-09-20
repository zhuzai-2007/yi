import { InterpretationSchema } from "./schema";
import type {
  InterpretationContext,
  ParsedInterpretation,
  RawModelOutput,
  ValidatedInterpretation,
} from "./types";
export type ValidationCode =
  | "invalid JSON"
  | "missing field"
  | "schema error"
  | "moving line mismatch"
  | "application mismatch"
  | "invalid source id";
export class ValidationError extends Error {
  constructor(public readonly codes: ValidationCode[]) {
    super(
      "AI 解读生成失败，返回内容未通过格式或事实校验。你可以稍后重试，或更换模型。",
    );
  }
}
export function validateInterpretationDomain(
  value: ParsedInterpretation,
  context: InterpretationContext,
): ValidationCode[] {
  const lines = context.facts.moving_lines;
  const errors: ValidationCode[] = [];
  if (
    value.moving_lines.length !== lines.length ||
    value.moving_lines.some((line, i) => line.line !== lines[i]?.name)
  )
    errors.push("moving line mismatch");
  if (
    context.interpretation_mode === "question"
      ? !context.question.trim() || value.application === null
      : value.application !== null
  )
    errors.push("application mismatch");
  return errors;
}
export function validateEvidenceIds(
  value: ParsedInterpretation,
  context: InterpretationContext,
): ValidationCode[] {
  const allowed = new Set(context.sources.map((s) => s.source_id));
  const blocks = [
    value.summary,
    value.original_hexagram,
    ...value.moving_lines,
    value.transition,
    value.changed_hexagram,
    ...(value.application ? [value.application] : []),
  ];
  return blocks.some((block) =>
    block.evidence_source_ids.some((id) => !allowed.has(id)),
  )
    ? ["invalid source id"]
    : [];
}
export function validateParsedInterpretation(
  raw: unknown,
  context: InterpretationContext,
): ValidatedInterpretation {
  const parsed = InterpretationSchema.safeParse(raw);
  if (!parsed.success)
    throw new ValidationError([
      parsed.error.issues.some(
        (issue) =>
          issue.code === "invalid_type" && issue.message.includes("undefined"),
      )
        ? "missing field"
        : "schema error",
    ]);
  const errors = [
    ...validateInterpretationDomain(parsed.data, context),
    ...validateEvidenceIds(parsed.data, context),
  ];
  if (errors.length) throw new ValidationError(errors);
  return parsed.data as ValidatedInterpretation;
}
export function validateModelOutput(
  raw: RawModelOutput,
  context: InterpretationContext,
): ValidatedInterpretation {
  if (raw.length > 80000) throw new ValidationError(["schema error"]);
  const text = raw.trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(fence ? fence[1] : text);
  } catch {
    throw new ValidationError(["invalid JSON"]);
  }
  return validateParsedInterpretation(parsed, context);
}
