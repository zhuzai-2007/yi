import { z } from "zod";
const evidenceBlock = (length: number, sources: number) =>
  z.strictObject({
    text: z.string().trim().min(1).max(length),
    evidence_source_ids: z
      .array(z.string().min(1).max(100))
      .min(1)
      .max(sources),
  });
export const EvidenceBlockSchema = evidenceBlock(4200, 16);
const common = {
  reading: EvidenceBlockSchema,
  application: evidenceBlock(2400, 12).nullable(),
  boundary: z.strictObject({ text: z.string().trim().min(1).max(600) }),
};
export const StaticInterpretationSchema = z.strictObject({
  kind: z.literal("static"),
  ...common,
});
export const ChangingInterpretationSchema = z.strictObject({
  kind: z.literal("changing"),
  ...common,
  change_focus: z
    .array(evidenceBlock(1200, 10).extend({ line: z.string().min(1).max(8) }))
    .max(6),
});
export const InterpretationSchema = z.discriminatedUnion("kind", [
  StaticInterpretationSchema,
  ChangingInterpretationSchema,
]);
export function interpretationJsonSchema(hasChanges: boolean) {
  return z.toJSONSchema(
    hasChanges ? ChangingInterpretationSchema : StaticInterpretationSchema,
  );
}
