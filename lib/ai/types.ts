import type { z } from "zod";
import type { InterpretationSchema } from "./schema";
import type { Bit, getStructuralRelations } from "../iching/core";
export type InterpretationMode = "plain" | "classical" | "question";
export type Source = {
  source_id: string;
  type: "jing" | "zhuan" | "structure";
  label: string;
  text: string;
};
export type InterpretationContext = {
  interpretation_mode: InterpretationMode;
  question: string;
  facts: {
    original_hexagram: {
      number: number;
      name: string;
      symbol: string;
      lines: readonly Bit[];
    };
    moving_lines: { position: number; name: string }[];
    changed_hexagram: {
      number: number;
      name: string;
      symbol: string;
      lines: readonly Bit[];
    };
    has_changes: boolean;
  };
  structure: {
    original: ReturnType<typeof getStructuralRelations>;
    changed: ReturnType<typeof getStructuralRelations>;
  };
  sources: Source[];
};
export type RawModelOutput = string;
export type ParsedInterpretation = z.infer<typeof InterpretationSchema>;
declare const validated: unique symbol;
export type ValidatedInterpretation = ParsedInterpretation & {
  readonly [validated]: true;
};
export type AiConfig = {
  endpoint: string;
  model: string;
  apiKey: string;
  remember: boolean;
  structured: boolean;
};
export type AiRequest = {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  signal: AbortSignal;
};
export interface AiTransport {
  generate(request: AiRequest): Promise<RawModelOutput>;
}
export type CachedInterpretation = {
  result: ValidatedInterpretation;
  metadata: {
    generatedAt: string;
    model: string;
    promptVersion: string;
    mode: InterpretationMode;
  };
};
