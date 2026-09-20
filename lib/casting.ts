import {
  parseInput,
  parseLineValue,
  type LineValue,
  type Six,
} from "./iching/core";

export const COIN_VALUES = Object.freeze({ heads: 3, tails: 2 } as const);
export const LINE_NAMES: Record<LineValue, string> = {
  6: "老阴",
  7: "少阳",
  8: "少阴",
  9: "老阳",
};
export type CoinSide = keyof typeof COIN_VALUES;
export type Coins = [CoinSide, CoinSide, CoinSide];
export type ThrowResult = { lineIndex: number; coins: Coins; value: LineValue };
export type Method = "three-coins" | "manual";
export type CastRecord = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  question: string;
  method: Method;
  convention: typeof COIN_VALUES;
  throws: ThrowResult[];
  lines: Six<LineValue>;
};
export type Draft = {
  schemaVersion: 1;
  id: string;
  question: string;
  startTime: string;
  method: "three-coins";
  convention: typeof COIN_VALUES;
  throws: ThrowResult[];
  currentStep: number;
};
export function coinValue(coins: Coins): LineValue {
  if (coins.length !== 3 || coins.some((c) => c !== "heads" && c !== "tails"))
    throw new Error("每次必须记录三枚钱的正背。");
  return parseLineValue(coins.reduce((sum, c) => sum + COIN_VALUES[c], 0));
}
/** One uniform byte per coin; parity partitions 256 values into two equal sets. */
export function tossCoins(
  random: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes),
): Coins {
  return Array.from(random(new Uint8Array(3)), (b) =>
    b % 2 === 0 ? "heads" : "tails",
  ) as Coins;
}
export function appendThrow(draft: Draft, coins: Coins): Draft {
  if (draft.currentStep !== draft.throws.length || draft.currentStep >= 6)
    throw new Error("投掷顺序无效或六爻已经完成。");
  return {
    ...draft,
    currentStep: draft.currentStep + 1,
    throws: [
      ...draft.throws,
      {
        lineIndex: draft.currentStep,
        coins: [...coins],
        value: coinValue(coins),
      },
    ],
  };
}
export function finishDraft(draft: Draft): CastRecord {
  if (draft.currentStep !== 6) throw new Error("请先完成六次投掷。");
  return {
    schemaVersion: 1,
    id: draft.id,
    createdAt: draft.startTime,
    question: draft.question,
    method: draft.method,
    convention: COIN_VALUES,
    throws: draft.throws,
    lines: parseInput(draft.throws.map((t) => t.value).join(" ")),
  };
}
export function localDateTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function dateWithOffset(input: string): string {
  const date = new Date(input);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input) ||
    !Number.isFinite(date.getTime()) ||
    localDateTime(date) !== input
  )
    throw new Error("请输入有效的本地起卦时间。");
  const offset = -date.getTimezoneOffset();
  return `${input}:00${offset >= 0 ? "+" : "-"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}
