import { Localize } from "./Language";
import { getLineTitle, type Bit } from "../lib/iching/core";
export function LineMark({ bit }: { bit: Bit }) {
  return (
    <Localize>
      <span className={`line-mark ${bit ? "yang" : "yin"}`} aria-hidden="true">
        <i />
        <i />
      </span>
    </Localize>
  );
}
export default function HexagramDiagram({
  bits,
  moving,
  changed = false,
}: {
  bits: readonly Bit[];
  moving: number[];
  changed?: boolean;
}) {
  return (
    <Localize>
      <div
        className="diagram"
        aria-label={`${changed ? "之卦" : "本卦"}六爻图，上爻在上，初爻在下`}
      >
        {[5, 4, 3, 2, 1, 0].map((i) => (
          <div
            key={i}
            className={`diagram-row ${moving.includes(i) ? "moving" : ""}`}
          >
            <span className="line-title">{getLineTitle(bits[i], i)}</span>
            <LineMark bit={bits[i]} />
            <span className="move-label">
              {moving.includes(i) ? (changed ? "变" : "动") : ""}
            </span>
          </div>
        ))}
      </div>
    </Localize>
  );
}
