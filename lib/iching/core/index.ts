import { kingWenTable, names, trigrams } from "../data/trigrams";
export type LineValue = 6 | 7 | 8 | 9;
export type Bit = 0 | 1;
/** Every array is bottom to top, index 0 = 初, index 5 = 上. */
export type Six<T> = readonly [T, T, T, T, T, T];
export const positions = ["初", "二", "三", "四", "五", "上"] as const;
export function parseLineValue(value: unknown): LineValue {
  if (value !== 6 && value !== 7 && value !== 8 && value !== 9)
    throw new Error("每爻只能是 6、7、8 或 9。");
  return value;
}
export function parseInput(input: string): Six<LineValue> {
  const parts = input.trim().split(/[\s,，]+/);
  if (parts.length !== 6)
    throw new Error("请从初爻到上爻输入 6 个数字，以空格分隔。");
  if (parts.some((p) => !/^[6789]$/.test(p)))
    throw new Error("每爻只能是 6、7、8 或 9。");
  return parts.map((p) =>
    parseLineValue(Number(p)),
  ) as unknown as Six<LineValue>;
}
export const getYinYang = (value: LineValue): Bit =>
  value === 7 || value === 9 ? 1 : 0;
export const isMoving = (value: LineValue) => value === 6 || value === 9;
export const changeLine = (value: LineValue): Bit =>
  isMoving(value) ? ((1 - getYinYang(value)) as Bit) : getYinYang(value);
export function getTrigram(bits: readonly Bit[]) {
  const trigram = trigrams.find((t) => t.binary === bits.join(""));
  if (!trigram) throw new Error("三爻结构无效");
  return trigram;
}
export function getHexagram(bits: readonly Bit[]) {
  if (bits.length !== 6 || bits.some((b) => b !== 0 && b !== 1))
    throw new Error("六爻结构无效");
  const lower = getTrigram(bits.slice(0, 3)),
    upper = getTrigram(bits.slice(3));
  const number = kingWenTable[trigrams.indexOf(lower)][trigrams.indexOf(upper)];
  const name = names[number - 1];
  return {
    number,
    name,
    unicode: String.fromCodePoint(0x4dc0 + number - 1),
    lower,
    upper,
    fullName:
      lower.key === upper.key
        ? `${name}为${upper.nature}`
        : `${upper.nature}${lower.nature}${name}`,
  };
}
export const getChangedHexagram = (values: Six<LineValue>) =>
  getHexagram(values.map(changeLine));
function validIndex(i: number) {
  if (!Number.isInteger(i) || i < 0 || i > 5)
    throw new Error("爻索引必须为 0–5");
}
export function getLineTitle(bit: Bit, i: number) {
  validIndex(i);
  const word = bit ? "九" : "六";
  return i === 0
    ? `初${word}`
    : i === 5
      ? `上${word}`
      : `${word}${positions[i]}`;
}
export function isCentral(i: number) {
  validIndex(i);
  return i === 1 || i === 4;
}
export function isCorrect(bit: Bit, i: number) {
  validIndex(i);
  return bit === (i % 2 === 0 ? 1 : 0);
}
export function getRespondingLine(i: number) {
  validIndex(i);
  return (i + 3) % 6;
}
export function isResponsive(bits: readonly Bit[], i: number) {
  return bits[i] !== bits[getRespondingLine(i)];
}
export function getStructuralRelations(bits: readonly Bit[]) {
  getHexagram(bits);
  return bits.map((bit, i) => ({
    index: i,
    bit,
    title: getLineTitle(bit, i),
    central: isCentral(i),
    correct: isCorrect(bit, i),
    centralCorrect: isCentral(i) && isCorrect(bit, i),
    respondingIndex: getRespondingLine(i),
    responsive: isResponsive(bits, i),
    neighbors: [i - 1, i + 1].filter((n) => n >= 0 && n < 6),
    supports: i < 5 ? i + 1 : null,
    rides: i > 0 ? i - 1 : null,
  }));
}
