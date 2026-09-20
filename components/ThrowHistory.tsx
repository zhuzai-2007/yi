import { COIN_VALUES, LINE_NAMES, type ThrowResult } from "../lib/casting";
import { positions } from "../lib/iching/core";
import { Localize } from "./Language";
export function ThrowHistory({ throws }: { throws: ThrowResult[] }) {
  return (
    <Localize>
      <ol className="throw-history">
        {throws.map((t) => (
          <li key={t.lineIndex}>
            <strong>{positions[t.lineIndex]}爻</strong>
            <span>
              {t.coins.map((c) => (c === "heads" ? "正" : "背")).join(" / ")}
            </span>
            <span>
              {t.coins.map((c) => COIN_VALUES[c]).join(" + ")} = {t.value}
            </span>
            <span>{LINE_NAMES[t.value]}</span>
          </li>
        ))}
      </ol>
    </Localize>
  );
}
