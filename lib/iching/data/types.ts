import type { TrigramKey } from "./trigrams";
export interface HexagramText {
  number: number;
  name: string;
  unicode: string;
  upperTrigram: TrigramKey;
  lowerTrigram: TrigramKey;
  judgment: string;
  tuan: string;
  greatImage: string;
  /** Exactly six entries: index 0 = 初爻, index 5 = 上爻. */
  lines: { text: string; littleImage: string }[];
  special?: {
    yongJiu?: string;
    yongLiu?: string;
    specialImage: string;
    wenyan: string;
  };
  source: { url: string; revision: string; sha256: string };
}
