"use client";

import { useEffect, useRef, useState } from "react";
import type { CoverLetterOptions } from "@/lib/types";

export default function ParagraphEditor({
  index,
  value,
  onChange,
  onRewrite,
  rewriting,
  busy,
  options,
}: {
  index: number;
  value: string;
  onChange: (value: string) => void;
  onRewrite: (mode: string, instruction: string) => void;
  /** This paragraph is being rewritten. */
  rewriting: boolean;
  /** Some paragraph is being rewritten; one at a time. */
  busy: boolean;
  options: CoverLetterOptions;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);

  const run = (mode: string, instruction = "") => {
    setMenuOpen(false);
    setCustom("");
    onRewrite(mode, instruction);
  };

  return (
    <div className="group relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(1, Math.ceil(value.length / 80))}
        aria-label={`Paragraph ${index + 1}`}
        aria-busy={rewriting}
        readOnly={rewriting}
        className={`sheet-field field-sizing-content ${rewriting ? "animate-pulse text-leather-500" : ""}`}
      />
      {/* Pointer devices: revealed on hover at the paragraph's corner. Touch has
          no hover, so it sits under the paragraph instead of covering text. */}
      <div
        ref={wrapRef}
        className={`absolute -right-2 top-1 z-10 font-sans transition-opacity [@media(hover:none)]:static [@media(hover:none)]:opacity-100 [@media(hover:none)]:mt-1 [@media(hover:none)]:mb-3 ${
          menuOpen || rewriting ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={busy}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="btn btn-secondary btn-sm"
        >
          {rewriting ? "Rewriting…" : "↻ Rewrite"}
        </button>
        {menuOpen && (
          <div
            role="menu"
            aria-label={`Rewrite paragraph ${index + 1}`}
            className="pop absolute right-0 top-full mt-1.5 w-64 card p-1.5 shadow-[0_8px_24px_rgba(61,40,24,0.14)] [@media(hover:none)]:right-auto [@media(hover:none)]:left-0 origin-top-right [@media(hover:none)]:origin-top-left"
          >
            {options.rewrite_modes.map((m) => (
              <button
                key={m.key}
                type="button"
                role="menuitem"
                onClick={() => run(m.key)}
                className="menu-item"
              >
                {m.name}
              </button>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) run("fresh", custom.trim());
              }}
              className="mt-1 border-t border-leather-100 pt-2 px-1 pb-1"
            >
              <label className="sr-only" htmlFor={`rewrite-${index}`}>
                Tell it what to change
              </label>
              <div className="flex gap-1.5">
                <input
                  id={`rewrite-${index}`}
                  className="input !py-1.5 !text-[13px]"
                  value={custom}
                  maxLength={options.limits.custom_rewrite}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Or say what to change…"
                />
                <button type="submit" disabled={!custom.trim()} className="btn btn-primary btn-sm shrink-0">
                  Go
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
