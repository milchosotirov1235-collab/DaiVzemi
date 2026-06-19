"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// SearchableSelect
//
// Self-managed searchable dropdown — no external open/close state needed.
// size="sm"  → compact (listings filter bar)
// size="md"  → larger (publish form fields)
// ---------------------------------------------------------------------------

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Избери...",
  disabled = false,
  disabledPlaceholder,
  size = "sm",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 40);
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (opt: string) => {
    onChange(opt);
    setOpen(false);
    setQuery("");
  };

  // ── Disabled state ──────────────────────────────────────────────────────
  if (disabled) {
    return (
      <div
        className={`flex w-full cursor-not-allowed items-center justify-between rounded-2xl border border-slate-200 bg-slate-100 text-slate-400 shadow-sm ${
          size === "md" ? "px-5 py-4 font-bold" : "px-4 py-3 text-sm font-bold"
        }`}
      >
        <span>{disabledPlaceholder ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-40" />
      </div>
    );
  }

  // ── Trigger styles ───────────────────────────────────────────────────────
  const triggerCls =
    size === "md"
      ? "flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-left font-bold shadow-sm transition hover:bg-white focus:border-blue-950 focus:outline-none focus:ring-4 focus:ring-blue-100"
      : "flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold shadow-sm outline-none transition focus:border-blue-950 focus:ring-2 focus:ring-blue-950/10";

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={triggerCls}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            // Use onMouseDown + preventDefault so the outer button's onClick
            // never fires when clearing, and focus stays predictable.
            <span
              role="button"
              aria-label="Изчисти"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();  // don't blur / don't trigger outer button
                e.stopPropagation();
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-blue-950 transition ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        // onMouseDown preventDefault keeps the search <input> focused while the
        // user scrolls or clicks options — without this, every click blurs the
        // input and the cursor visually disappears mid-interaction.
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 min-w-[200px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Search input */}
          <div className="p-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 cursor-default text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Търси..."
                className="min-w-0 flex-1 cursor-text bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:font-semibold placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                  className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="mx-2 border-t border-slate-100" />

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-2">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full cursor-pointer rounded-xl px-4 py-2 text-left text-sm font-bold text-slate-400 transition hover:bg-slate-100"
            >
              {placeholder}
            </button>

            {filtered.length > 0 ? (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full cursor-pointer rounded-xl px-4 py-2 text-left text-sm font-bold transition hover:bg-slate-100 ${
                    opt === value ? "bg-blue-50 text-blue-950" : "text-slate-900"
                  }`}
                >
                  {opt}
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-sm font-semibold text-slate-400">
                Няма резултати
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
