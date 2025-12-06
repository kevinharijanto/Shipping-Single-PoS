// src/components/Combobox.tsx
import { useEffect, useMemo, useRef, useState } from "react";

type KeyGetter<T> = (item: T) => string;
type LabelGetter<T> = (item: T) => string;

export type ComboboxProps<T> = {
  items: T[];
  value: string;                      // emits/controls the KEY (e.g., "NL")
  onChange: (key: string) => void;
  getKey: KeyGetter<T>;
  getLabel: LabelGetter<T>;
  placeholder?: string;
  className?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  emptyText?: string;
  ariaLabel?: string;

  // NEW: how the selected value is displayed in the input.
  // default: show label only (e.g., "Netherlands")
  formatSelected?: (label: string, key: string) => string;
};

export default function Combobox<T>({
  items,
  value,
  onChange,
  getKey,
  getLabel,
  placeholder = "Type to search…",
  className = "input w-full",
  allowCustom = false,
  disabled = false,
  emptyText = "No matches",
  ariaLabel,
  formatSelected, // <- NEW
}: ComboboxProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverIdx, setHoverIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedItem = useMemo(() => items.find((x) => getKey(x) === value), [items, value, getKey]);

  // Default to label-only display; caller can override with formatSelected
  const selectedLabel = useMemo(() => {
    if (!selectedItem) return value || "";
    const lbl = getLabel(selectedItem);
    const key = getKey(selectedItem);
    return formatSelected ? formatSelected(lbl, key) : lbl;
  }, [selectedItem, getKey, getLabel, value, formatSelected]);

  // Helper: when users click in and immediately type while the input still contains
  // the selected label, treat that as an empty query to show full list.
  const filtered = useMemo(() => {
    const raw = query.trim();
    if (raw.toLowerCase() === selectedLabel.trim().toLowerCase()) return items;
    if (!raw) return items;

    const q = raw.toLowerCase();
    return items.filter((it) => {
      const label = getLabel(it).toLowerCase();
      const key = getKey(it).toLowerCase();
      return label.includes(q) || key.includes(q);
    });
  }, [items, query, getKey, getLabel, selectedLabel]);

  function selectKey(k: string) {
    onChange(k);
    setOpen(false);
    setQuery(""); // value drives visible text
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!open) setQuery(selectedLabel);
  }, [selectedLabel, open]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        disabled={disabled}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHoverIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHoverIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHoverIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length > 0) {
              const it = filtered[hoverIdx] ?? filtered[0];
              selectKey(getKey(it));
            } else if (allowCustom && query.trim()) {
              selectKey(query.trim());
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={className}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="cb-popover"
        aria-label={ariaLabel}
      />

      {open && (
        <div
          id="cb-popover"
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--text-muted)]">
              {allowCustom && query.trim()
                ? `Press Enter to use “${query.trim()}”`
                : emptyText}
            </div>
          ) : (
            filtered.map((it, i) => {
              const k = getKey(it);
              const label = getLabel(it);
              const active = i === hoverIdx;
              return (
                <div
                  key={k}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectKey(k);
                  }}
                  className={`px-3 py-2 cursor-pointer text-sm ${active ? "bg-gray-100 dark:bg-gray-800" : "bg-white dark:bg-gray-900"
                    }`}
                >
                  {label} <span className="text-gray-500">({k})</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
