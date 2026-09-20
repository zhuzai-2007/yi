"use client";
import { useId, useRef, type ReactNode } from "react";
import { Localize } from "../Language";
export function Tabs({
  items,
  active,
  onChange,
  label,
  className = "",
  children,
}: {
  items: readonly { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId(),
    buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <Localize>
      <div className={`tabs ${className}`}>
        <div role="tablist" aria-label={label} className="tab-list">
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              role="tab"
              id={`${id}-${item.id}`}
              aria-selected={active === item.id}
              aria-controls={`${id}-panel`}
              tabIndex={active === item.id ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => {
                let target = index;
                if (["ArrowRight", "ArrowDown"].includes(event.key))
                  target = (index + 1) % items.length;
                else if (["ArrowLeft", "ArrowUp"].includes(event.key))
                  target = (index + items.length - 1) % items.length;
                else if (event.key === "Home") target = 0;
                else if (event.key === "End") target = items.length - 1;
                else return;
                event.preventDefault();
                onChange(items[target].id);
                buttons.current[target]?.focus({ preventScroll: true });
                buttons.current[target]?.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          key={active}
          role="tabpanel"
          id={`${id}-panel`}
          aria-labelledby={`${id}-${active}`}
          tabIndex={0}
          className="tab-panel"
        >
          {children}
        </div>
      </div>
    </Localize>
  );
}
