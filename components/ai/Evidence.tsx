import { Classic, Localize } from "../Language";
import type { InterpretationContext } from "../../lib/ai/types";
export function Evidence({
  ids,
  context,
}: {
  ids: string[];
  context: InterpretationContext;
}) {
  return (
    <Localize>
      <div className="ai-evidence">
        <span className="muted small">依据：</span>
        {[...new Set(ids)].map((id) => {
          const source = context.sources.find((s) => s.source_id === id)!;
          return (
            <details key={id}>
              <summary>{source.label}</summary>
              <div className="ai-source">
                <strong>
                  {source.type === "jing"
                    ? "【经】"
                    : source.type === "zhuan"
                      ? "【传】"
                      : "【结构】"}{" "}
                  {source.label}
                </strong>
                <p>
                  {source.type === "structure" ? (
                    source.text
                  ) : (
                    <Classic text={source.text} />
                  )}
                </p>
              </div>
            </details>
          );
        })}
      </div>
    </Localize>
  );
}
