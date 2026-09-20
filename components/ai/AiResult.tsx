import type {
  InterpretationContext,
  ValidatedInterpretation,
} from "../../lib/ai/types";
import { interpretationEvidenceIds } from "../../lib/ai/validator";
import { getLineTitle } from "../../lib/iching/core";
import { Localize } from "../Language";
import TransitionArrow from "../result/TransitionArrow";
import { Evidence } from "./Evidence";
function Prose({ text }: { text: string }) {
  return (
    <Localize>
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((paragraph, i) => (
          <p className="ai-prose" key={i}>
            {paragraph}
          </p>
        ))}
    </Localize>
  );
}
export function AiResult({
  result,
  context,
}: {
  result: ValidatedInterpretation;
  context: InterpretationContext;
}) {
  return (
    <Localize>
      <article className="ai-result">
        <section className="ai-block">
          <h3>核心解读</h3>
          <Prose text={result.reading.text} />
        </section>
        {result.kind === "changing" && (
          <section className="ai-moving">
            <h3>变化重点</h3>
            {result.change_focus.map((block, i) => {
              const line = context.facts.moving_lines[i];
              return (
                <section className="ai-change-focus" key={line.position}>
                  <h4>
                    {line.name}
                    <TransitionArrow size="sm" />
                    {getLineTitle(
                      context.facts.changed_hexagram.lines[line.position - 1],
                      line.position - 1,
                    )}
                  </h4>
                  <Prose text={block.text} />
                </section>
              );
            })}
          </section>
        )}
        {result.application && (
          <section className="ai-block">
            <h3>结合所问</h3>
            <Prose text={result.application.text} />
          </section>
        )}
        <section className="ai-block ai-boundary">
          <h3>解释边界</h3>
          <Prose text={result.boundary.text} />
        </section>
        <Evidence ids={interpretationEvidenceIds(result)} context={context} />
      </article>
    </Localize>
  );
}
