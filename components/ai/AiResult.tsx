import type {
  InterpretationContext,
  ParsedInterpretation,
  ValidatedInterpretation,
} from "../../lib/ai/types";
import { Localize } from "../Language";
import { Evidence } from "./Evidence";
function Block({
  title,
  block,
  context,
}: {
  title: string;
  block: ParsedInterpretation["summary"];
  context: InterpretationContext;
}) {
  return (
    <Localize>
      <section className="ai-block">
        <h3>{title}</h3>
        <p className="ai-prose">{block.text}</p>
        <Evidence ids={block.evidence_source_ids} context={context} />
      </section>
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
      <div className="ai-result">
        <Block title="解读摘要" block={result.summary} context={context} />
        <Block
          title={`本卦 · ${context.facts.original_hexagram.name}`}
          block={result.original_hexagram}
          context={context}
        />
        <section className="ai-moving">
          <h3>动爻</h3>
          {context.facts.has_changes ? (
            result.moving_lines.map((block, i) => (
              <Block
                key={i}
                title={context.facts.moving_lines[i].name}
                block={block}
                context={context}
              />
            ))
          ) : (
            <p>本次无动爻。</p>
          )}
        </section>
        <Block title="变化" block={result.transition} context={context} />
        <Block
          title={`之卦 · ${context.facts.changed_hexagram.name}`}
          block={result.changed_hexagram}
          context={context}
        />
        {result.application && (
          <Block
            title="结合所问 · 应用性解释"
            block={result.application}
            context={context}
          />
        )}
        <section className="ai-block">
          <h3>说明与不确定性</h3>
          <p className="ai-prose">{result.uncertainty.text}</p>
        </section>
      </div>
    </Localize>
  );
}
