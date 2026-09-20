import {
  COIN_VALUES,
  coinValue,
  type CastRecord,
  type Draft,
  type ThrowResult,
  type Coins,
} from "./casting";
import { parseInput } from "./iching/core";

// Namespace by deployment path: sibling GitHub Pages sites share an origin.
const namespace = `zhouyi-v2:${process.env.NEXT_PUBLIC_BASE_PATH || "/"}`;
export const STORAGE_KEYS = {
  records: `${namespace}:records`,
  draft: `${namespace}:draft`,
  language: `${namespace}:language`,
};
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const fail = (): never => {
  throw new Error("记录格式无效，原有数据未被覆盖。");
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : fail();
function header(v: Record<string, unknown>, time: unknown) {
  if (
    v.schemaVersion !== 1 ||
    typeof v.id !== "string" ||
    !/^[\w-]{1,100}$/.test(v.id) ||
    typeof v.question !== "string" ||
    v.question.length > 10000 ||
    typeof time !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      time,
    ) ||
    !Number.isFinite(Date.parse(time))
  )
    fail();
  const c = object(v.convention);
  if (c.heads !== 3 || c.tails !== 2) fail();
}
function parseThrows(value: unknown): ThrowResult[] {
  if (!Array.isArray(value) || value.length > 6) return fail();
  return value.map((raw, i) => {
    const t = object(raw);
    if (
      t.lineIndex !== i ||
      !Array.isArray(t.coins) ||
      t.coins.length !== 3 ||
      t.coins.some((c) => c !== "heads" && c !== "tails")
    )
      return fail();
    const coins = [...t.coins] as Coins;
    if (coinValue(coins) !== t.value) return fail();
    return { lineIndex: i, coins, value: coinValue(coins) };
  });
}
export function parseRecord(raw: unknown): CastRecord {
  const v = object(raw);
  header(v, v.createdAt);
  if (v.method !== "manual" && v.method !== "three-coins") return fail();
  if (
    !Array.isArray(v.lines) ||
    v.lines.length !== 6 ||
    v.lines.some((n) => ![6, 7, 8, 9].includes(n))
  )
    return fail();
  const lines = parseInput(v.lines.join(" "));
  const throws = parseThrows(v.throws);
  if (
    v.method === "manual"
      ? throws.length !== 0
      : throws.length !== 6 || throws.some((t, i) => t.value !== lines[i])
  )
    return fail();
  return {
    schemaVersion: 1,
    id: v.id as string,
    question: v.question as string,
    createdAt: v.createdAt as string,
    method: v.method,
    convention: COIN_VALUES,
    throws,
    lines,
  };
}
export function parseDraft(raw: unknown): Draft {
  const v = object(raw);
  header(v, v.startTime);
  const throws = parseThrows(v.throws);
  if (v.method !== "three-coins" || v.currentStep !== throws.length)
    return fail();
  return {
    schemaVersion: 1,
    id: v.id as string,
    question: v.question as string,
    startTime: v.startTime as string,
    method: "three-coins",
    convention: COIN_VALUES,
    throws,
    currentStep: throws.length,
  };
}
export function decodeRecords(json: string): CastRecord[] {
  if (json.length > 10_000_000) throw new Error("导入文件不能超过 10 MB。");
  const v = object(JSON.parse(json));
  if (
    v.schemaVersion !== 1 ||
    !Array.isArray(v.records) ||
    v.records.length > 5000
  )
    return fail();
  const records = v.records.map(parseRecord);
  if (new Set(records.map((r) => r.id)).size !== records.length) return fail();
  return records;
}
export function encodeRecords(records: CastRecord[]) {
  if (records.length > 5000) throw new Error("最多支持 5000 条本地卦例。");
  const json = JSON.stringify(
    { schemaVersion: 1, records: records.map(parseRecord) },
    null,
    2,
  );
  if (json.length > 10_000_000)
    throw new Error("记录总量超过 10 MB，请先导出并整理卦例。");
  return json;
}
export const loadRecords = (s: Store): CastRecord[] => {
  const raw = s.getItem(STORAGE_KEYS.records);
  return raw === null ? [] : decodeRecords(raw);
};
export function saveRecord(s: Store, record: CastRecord) {
  const valid = parseRecord(record),
    records = loadRecords(s);
  const existing = records.find((r) => r.id === valid.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(valid))
    throw new Error("同名记录内容不同，未覆盖已有记录。");
  if (!existing)
    s.setItem(STORAGE_KEYS.records, encodeRecords([valid, ...records]));
}
export function deleteRecord(s: Store, id: string) {
  s.setItem(
    STORAGE_KEYS.records,
    encodeRecords(loadRecords(s).filter((r) => r.id !== id)),
  );
}
export function importRecords(s: Store, json: string) {
  const incoming = decodeRecords(json),
    current = loadRecords(s),
    byId = new Map(current.map((r) => [r.id, r]));
  let added = 0;
  for (const r of incoming) {
    const old = byId.get(r.id);
    if (old && JSON.stringify(old) !== JSON.stringify(r))
      throw new Error("导入记录 ID 与本地记录冲突，未导入或覆盖任何记录。");
    if (!old) {
      byId.set(r.id, r);
      added++;
    }
  }
  if (byId.size > 5000) throw new Error("最多支持 5000 条本地卦例。");
  s.setItem(STORAGE_KEYS.records, encodeRecords([...byId.values()]));
  return added;
}
export const loadDraft = (s: Store) => {
  const raw = s.getItem(STORAGE_KEYS.draft);
  return raw === null ? null : parseDraft(JSON.parse(raw));
};
export function saveDraft(s: Store, draft: Draft) {
  const valid = parseDraft(draft),
    previous = loadDraft(s);
  if (
    previous &&
    (previous.id !== valid.id ||
      previous.currentStep > valid.currentStep ||
      previous.throws.some(
        (t, i) => JSON.stringify(t) !== JSON.stringify(valid.throws[i]),
      ))
  )
    throw new Error("草稿已在其他页面改变，请刷新后继续，避免覆盖。");
  s.setItem(STORAGE_KEYS.draft, JSON.stringify(valid));
}
export const clearDraft = (s: Store) => s.removeItem(STORAGE_KEYS.draft);
