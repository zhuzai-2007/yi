import { Classic, Localize } from "../Language";
import type { InterpretationContext } from "../../lib/ai/types";
export function Evidence({
  ids,
  context,
}: {
  ids: string[];
  context: InterpretationContext;
}) {
  const used = new Set(ids);
  return (
    <Localize>
      <details className="ai-evidence">
        <summary>查看本次解读依据</summary>
        {context.sources
          .filter((s) => used.has(s.source_id))
          .map((source) => (
            <section className="ai-source" key={source.source_id}>
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
            </section>
          ))}
      </details>
    </Localize>
  );
}
