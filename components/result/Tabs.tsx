"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Localize } from "../Language";
export function Tabs({
  items,
  active,
  onChange,
  label,
  className = "",
  children,
}: {
  items: readonly { id: string; label: string; disabled?: boolean }[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId(),
    buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = list.current!;
    const revealActive = () => {
      if (element.scrollWidth <= element.clientWidth) return;
      const button =
        buttons.current[items.findIndex((item) => item.id === active)];
      if (!button) return;
      const bounds = element.getBoundingClientRect(),
        target = button.getBoundingClientRect();
      if (target.left < bounds.left)
        element.scrollLeft += target.left - bounds.left;
      else if (target.right > bounds.right)
        element.scrollLeft += target.right - bounds.right;
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, items]);
  return (
    <Localize>
      <div className={`tabs ${className}`}>
        <div ref={list} role="tablist" aria-label={label} className="tab-list">
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => {
                buttons.current[index] = el;
              }}
              role="tab"
              disabled={item.disabled}
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
                const step = ["ArrowLeft", "ArrowUp", "End"].includes(event.key)
                  ? -1
                  : 1;
                for (
                  let count = 0;
                  items[target].disabled && count < items.length;
                  count++
                )
                  target = (target + step + items.length) % items.length;
                if (items[target].disabled) return;
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
