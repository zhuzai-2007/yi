import { z } from "zod";
const evidence = {
  text: z.string().trim().min(1).max(1600),
  evidence_source_ids: z.array(z.string().min(1).max(100)).min(1).max(12),
};
export const EvidenceBlockSchema = z.strictObject(evidence);
export const InterpretationSchema = z.strictObject({
  summary: EvidenceBlockSchema,
  original_hexagram: EvidenceBlockSchema,
  moving_lines: z
    .array(z.strictObject({ line: z.string().min(1).max(8), ...evidence }))
    .max(6),
  transition: EvidenceBlockSchema,
  changed_hexagram: EvidenceBlockSchema,
  application: EvidenceBlockSchema.nullable(),
  uncertainty: z.strictObject({ text: z.string().trim().min(1).max(1200) }),
});
export const interpretationJsonSchema = z.toJSONSchema(InterpretationSchema);
