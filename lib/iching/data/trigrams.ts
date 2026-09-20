// Binary strings are always bottom to top. 1 = yang, 0 = yin.
export const trigrams = [
  { key: "qian", name: "乾", unicode: "☰", nature: "天", binary: "111" },
  { key: "dui", name: "兑", unicode: "☱", nature: "泽", binary: "110" },
  { key: "li", name: "离", unicode: "☲", nature: "火", binary: "101" },
  { key: "zhen", name: "震", unicode: "☳", nature: "雷", binary: "100" },
  { key: "xun", name: "巽", unicode: "☴", nature: "风", binary: "011" },
  { key: "kan", name: "坎", unicode: "☵", nature: "水", binary: "010" },
  { key: "gen", name: "艮", unicode: "☶", nature: "山", binary: "001" },
  { key: "kun", name: "坤", unicode: "☷", nature: "地", binary: "000" },
] as const;
export type TrigramKey = (typeof trigrams)[number]["key"];
// Rows = lower, columns = upper; order as above. Source: Wikisource 周易 六十四卦速查表.
export const kingWenTable = [
  [1, 43, 14, 34, 9, 5, 26, 11],
  [10, 58, 38, 54, 61, 60, 41, 19],
  [13, 49, 30, 55, 37, 63, 22, 36],
  [25, 17, 21, 51, 42, 3, 27, 24],
  [44, 28, 50, 32, 57, 48, 18, 46],
  [6, 47, 64, 40, 59, 29, 4, 7],
  [33, 31, 56, 62, 53, 39, 52, 15],
  [12, 45, 35, 16, 20, 8, 23, 2],
] as const;
export const names =
  "乾 坤 屯 蒙 需 讼 师 比 小畜 履 泰 否 同人 大有 谦 豫 随 蛊 临 观 噬嗑 贲 剥 复 无妄 大畜 颐 大过 坎 离 咸 恒 遁 大壮 晋 明夷 家人 睽 蹇 解 损 益 夬 姤 萃 升 困 井 革 鼎 震 艮 渐 归妹 丰 旅 巽 兑 涣 节 中孚 小过 既济 未济".split(
    " ",
  );
