"use client";

const PRESETS = [
  { from: "#6c63ff", to: "#0c0c14" },
  { from: "#f97316", to: "#1a1a1a" },
  { from: "#ff3cac", to: "#2d2d6b" },
  { from: "#22d3ee", to: "#0f172a" },
  { from: "#4ade80", to: "#14532d" },
  { from: "#f59e0b", to: "#7c2d12" },
] as const;

export type Palette = { from: string; to: string };

export function PalettePicker({
  value,
  onChange,
}: {
  value: Palette;
  onChange: (v: Palette) => void;
}) {
  return (
    <div className="flex gap-2">
      {PRESETS.map((p) => {
        const selected = p.from === value.from && p.to === value.to;
        return (
          <button
            key={p.from}
            type="button"
            onClick={() => onChange(p)}
            className="h-8 w-8 flex-shrink-0 rounded-full transition-transform hover:scale-110 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
              outline: selected ? `2.5px solid ${p.from}` : "2.5px solid transparent",
              outlineOffset: "2px",
            }}
          />
        );
      })}
    </div>
  );
}
