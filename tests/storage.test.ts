import test from "node:test";
import assert from "node:assert/strict";
import {
  appendThrow,
  COIN_VALUES,
  finishDraft,
  type CastRecord,
  type Draft,
} from "../lib/casting";
import {
  clearDraft,
  decodeRecords,
  deleteRecord,
  encodeRecords,
  importRecords,
  loadDraft,
  loadRecords,
  parseRecord,
  saveDraft,
  saveRecord,
  STORAGE_KEYS,
  type Store,
} from "../lib/storage";
const record: CastRecord = {
  schemaVersion: 1,
  id: "record-a",
  createdAt: "2026-09-20T09:50:00+08:00",
  question: "私人文字 <script>test</script>",
  method: "manual",
  convention: COIN_VALUES,
  throws: [],
  lines: [7, 9, 7, 7, 6, 7],
};
function memory(): Store {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}
const draft: Draft = {
  schemaVersion: 1,
  id: "draft-a",
  question: "私密",
  startTime: record.createdAt,
  method: "three-coins",
  convention: COIN_VALUES,
  throws: [],
  currentStep: 0,
};
test("local record save/load/export/import/dedup/delete roundtrip", () => {
  const store = memory();
  saveRecord(store, record);
  saveRecord(store, record);
  assert.deepEqual(loadRecords(store), [record]);
  const json = encodeRecords(loadRecords(store));
  const other = memory();
  assert.equal(importRecords(other, json), 1);
  assert.equal(importRecords(other, json), 0);
  assert.deepEqual(loadRecords(other), [record]);
  deleteRecord(other, record.id);
  assert.deepEqual(loadRecords(other), []);
});
test("draft resumes at the exact third line and preserves raw coin outcomes", () => {
  const store = memory();
  let d = draft;
  for (let i = 0; i < 3; i++) d = appendThrow(d, ["heads", "tails", "heads"]);
  saveDraft(store, d);
  const restored = loadDraft(store)!;
  assert.deepEqual(restored, d);
  d = appendThrow(restored, ["tails", "tails", "tails"]);
  assert.equal(d.throws[3].lineIndex, 3);
  saveDraft(store, d);
  assert.throws(() => saveDraft(store, restored), /草稿已/);
  clearDraft(store);
  assert.equal(loadDraft(store), null);
});
test("finished six-throw drafts survive recovery and record saving is idempotent", () => {
  const store = memory();
  let d = draft;
  for (let i = 0; i < 6; i++) d = appendThrow(d, ["heads", "heads", "heads"]);
  saveDraft(store, d);
  const r = finishDraft(loadDraft(store)!);
  saveRecord(store, r);
  saveRecord(store, r);
  clearDraft(store);
  assert.deepEqual(loadRecords(store), [r]);
  assert.equal(loadDraft(store), null);
});
test("strict schema rejects invalid values, coin mismatches, schema, order and convention", () => {
  for (const change of [
    { schemaVersion: 2 },
    { lines: [7, 9, 7, 7, 6] },
    { lines: ["7", 9, 7, 7, 6, 7] },
    { method: "unknown" },
    { createdAt: "no date" },
    { id: "../bad" },
    { convention: { heads: 2, tails: 3 } },
    { question: 9 },
    {
      throws: [{ lineIndex: 0, coins: ["heads", "heads", "heads"], value: 9 }],
    },
  ])
    assert.throws(() => parseRecord({ ...record, ...change }));
  let d = draft;
  for (let i = 0; i < 6; i++) d = appendThrow(d, ["heads", "heads", "heads"]);
  const r = finishDraft(d);
  assert.throws(() => parseRecord({ ...r, lines: [6, 9, 9, 9, 9, 9] }));
  assert.throws(() =>
    parseRecord({
      ...r,
      throws: r.throws.map((t) => ({ ...t, lineIndex: 5 - t.lineIndex })),
    }),
  );
});
test("invalid imports and ID collisions leave storage byte-for-byte unchanged", () => {
  const store = memory();
  saveRecord(store, record);
  const before = store.getItem(STORAGE_KEYS.records);
  for (const json of [
    "{",
    "[]",
    JSON.stringify({ schemaVersion: 2, records: [] }),
    JSON.stringify({
      schemaVersion: 1,
      records: [record, { ...record, id: "new", lines: [0] }],
    }),
    encodeRecords([{ ...record, question: "collision" }]),
  ]) {
    assert.throws(() => importRecords(store, json));
    assert.equal(store.getItem(STORAGE_KEYS.records), before);
  }
  assert.throws(() =>
    decodeRecords(
      JSON.stringify({ schemaVersion: 1, records: [record, record] }),
    ),
  );
});
test("storage exceptions are surfaced; malformed stored data is never overwritten", () => {
  const denied: Store = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("denied");
    },
  };
  assert.throws(() => saveRecord(denied, record), /quota/);
  assert.throws(() => saveDraft(denied, draft), /quota/);
  const store = memory();
  store.setItem(STORAGE_KEYS.records, "corrupt");
  assert.throws(() => saveRecord(store, record));
  assert.equal(store.getItem(STORAGE_KEYS.records), "corrupt");
});
