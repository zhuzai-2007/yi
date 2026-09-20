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
  | "invalid source id"
  | "kind mismatch"
  | "meta-language detected";
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
  if (value.kind !== (context.facts.has_changes ? "changing" : "static"))
    errors.push("kind mismatch");
  if (
    value.kind === "changing" &&
    (value.change_focus.length !== lines.length ||
      value.change_focus.some((line, i) => line.line !== lines[i]?.name))
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
    value.reading,
    ...(value.kind === "changing" ? value.change_focus : []),
    ...(value.application ? [value.application] : []),
  ];
  return blocks.some((block) =>
    block.evidence_source_ids.some((id) => !allowed.has(id)),
  )
    ? ["invalid source id"]
    : [];
}
/** Visible prose only; source identifiers are intentionally technical. */
export function validateNoMetaLanguage(
  value: ParsedInterpretation,
): ValidationCode[] {
  const texts = [
    value.reading.text,
    value.boundary.text,
    ...(value.application ? [value.application.text] : []),
    ...(value.kind === "changing"
      ? value.change_focus.flatMap((b) => [b.line, b.text])
      : []),
  ];
  const patterns = [
    /payload/i,
    /has_changes/i,
    /moving_lines/i,
    /source_id/i,
    /canonical\s+facts/i,
    /schema/i,
    /system\s+prompt/i,
    /\bJSON\b/i,
    /程序(?:提供|显示)/,
    /按照(?:系统|要求|指令)/,
    /不应虚构/,
    /不得虚构/,
    /为了?避免幻觉/,
    /模型/,
    /校验/,
    /validation/i,
    /repair/i,
    /\bsources\b/i,
    /生成过程/,
  ];
  return texts.some((text) => patterns.some((pattern) => pattern.test(text)))
    ? ["meta-language detected"]
    : [];
}
export function interpretationEvidenceIds(
  value: ParsedInterpretation,
): string[] {
  return [
    ...new Set(
      [
        value.reading,
        ...(value.kind === "changing" ? value.change_focus : []),
        ...(value.application ? [value.application] : []),
      ].flatMap((b) => b.evidence_source_ids),
    ),
  ];
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
    ...validateNoMetaLanguage(parsed.data),
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
