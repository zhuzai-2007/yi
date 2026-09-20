"use client";
import { useRef, useState } from "react";
import { Localize } from "./Language";
export function formatChineseDateTime(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/.exec(value);
  return parts
    ? `${parts[1]}年${Number(parts[2])}月${Number(parts[3])}日 ${parts[4]}`
    : "请选择起卦时间";
}
export function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [editing, setEditing] = useState(false);
  return (
    <Localize>
      <div className="datetime-field">
        <button
          type="button"
          className="datetime-display"
          aria-label={`起卦时间：${formatChineseDateTime(value)}，点击编辑`}
          onClick={() => {
            try {
              if (input.current?.showPicker) {
                input.current.showPicker();
                return;
              }
            } catch {
              /* Unsupported picker falls back to the native input. */
            }
            setEditing(true);
            input.current?.focus();
          }}
        >
          {formatChineseDateTime(value)}
          <span aria-hidden="true">编辑</span>
        </button>
        <input
          ref={input}
          id="start-time"
          className={editing ? "datetime-native editing" : "datetime-native"}
          type="datetime-local"
          required
          value={value}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Localize>
  );
}
