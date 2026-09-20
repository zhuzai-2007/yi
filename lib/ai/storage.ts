import { z } from "zod";
import type { Store } from "../storage";
import type { CastRecord } from "../casting";
import { AI_PROMPT_VERSION } from "./prompt";
import { validateParsedInterpretation } from "./validator";
import type {
  AiConfig,
  CachedInterpretation,
  InterpretationContext,
  InterpretationMode,
  ValidatedInterpretation,
} from "./types";
export const AI_KEYS = {
  session: "yi-ai-session-config",
  saved: "yi-ai-saved-config",
  cache: "yi-ai-interpretations-v1",
};
export const DEFAULT_CONFIG: AiConfig = {
  endpoint: "",
  model: "",
  apiKey: "",
  remember: false,
  structured: true,
};
const ConfigSchema = z.strictObject({
  endpoint: z.string().max(2000),
  model: z.string().max(200),
  apiKey: z.string().max(4000),
  remember: z.boolean(),
  structured: z.boolean(),
});
export function readConfig(session: Store, local: Store): AiConfig {
  try {
    const parsed = ConfigSchema.safeParse(
      JSON.parse(
        session.getItem(AI_KEYS.session) ||
          local.getItem(AI_KEYS.saved) ||
          "null",
      ),
    );
    return parsed.success ? parsed.data : { ...DEFAULT_CONFIG };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}
export function saveConfig(session: Store, local: Store, config: AiConfig) {
  // Remove persistent credentials first when consent is withdrawn.
  if (!config.remember) local.removeItem(AI_KEYS.saved);
  session.setItem(AI_KEYS.session, JSON.stringify(ConfigSchema.parse(config)));
  if (config.remember) local.setItem(AI_KEYS.saved, JSON.stringify(config));
}
export function clearConfig(session: Store, local: Store) {
  // Attempt both even if one storage area is unavailable.
  let failed = false;
  for (const [store, key] of [
    [session, AI_KEYS.session],
    [local, AI_KEYS.saved],
  ] as const) {
    try {
      store.removeItem(key);
    } catch {
      failed = true;
    }
  }
  if (failed) throw new Error("无法清除浏览器中的 AI 设置，请检查存储权限。");
}
export function cacheKey(
  record: CastRecord,
  mode: InterpretationMode,
  model: string,
): string {
  return JSON.stringify([
    process.env.NEXT_PUBLIC_BASE_PATH || "/",
    record.id,
    // Stable serialized fingerprint also protects same-ID edits/restores.
    [record.createdAt, record.question, record.method, record.lines, record.throws],
    mode,
    model.trim(),
    AI_PROMPT_VERSION,
  ]);
}
function entries(store: Store): Record<string, unknown> {
  const raw = JSON.parse(store.getItem(AI_KEYS.cache) || "{}");
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}
const EntrySchema = z.strictObject({
  result: z.unknown(),
  metadata: z.strictObject({
    generatedAt: z.iso.datetime(),
    model: z.string(),
    promptVersion: z.literal(AI_PROMPT_VERSION),
    mode: z.enum(["plain", "classical", "question"]),
  }),
});
export function loadInterpretation(
  store: Store,
  key: string,
  context: InterpretationContext,
  model: string,
): CachedInterpretation | null {
  try {
    const entry = EntrySchema.parse(entries(store)[key]);
    if (
      entry.metadata.mode !== context.interpretation_mode ||
      entry.metadata.model !== model.trim()
    )
      return null;
    return {
      metadata: entry.metadata,
      result: validateParsedInterpretation(entry.result, context),
    };
  } catch {
    return null;
  }
}
export function saveInterpretation(
  store: Store,
  key: string,
  result: ValidatedInterpretation,
  mode: InterpretationMode,
  model: string,
): CachedInterpretation {
  const entry = {
    result,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: model.trim(),
      promptVersion: AI_PROMPT_VERSION,
      mode,
    },
  };
  const all = entries(store);
  all[key] = entry;
  store.setItem(AI_KEYS.cache, JSON.stringify(all));
  return entry;
}
export function deleteInterpretation(store: Store, key: string) {
  const all = entries(store);
  delete all[key];
  store.setItem(AI_KEYS.cache, JSON.stringify(all));
}
