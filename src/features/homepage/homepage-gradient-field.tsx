/* eslint-disable react-refresh/only-export-components -- Puck custom fields own their renderers. */
import type { Field } from "@puckeditor/core";

import { DEFAULT_HERO_GRADIENT } from "./brand";
import type { HeroGradient } from "./types";

function validColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? String(value).toUpperCase() : fallback;
}

function GradientInput({
  value,
  onChange,
  readOnly,
}: {
  value: HeroGradient | undefined;
  onChange: (value: HeroGradient) => void;
  readOnly?: boolean;
}) {
  const gradient = { ...DEFAULT_HERO_GRADIENT, ...(value ?? {}) };
  const startColor = validColor(gradient.startColor, DEFAULT_HERO_GRADIENT.startColor);
  const endColor = validColor(gradient.endColor, DEFAULT_HERO_GRADIENT.endColor);
  const update = (patch: Partial<HeroGradient>) => onChange({ ...gradient, ...patch });

  return (
    <div className="space-y-3 rounded-md border border-black/10 bg-black/[0.025] p-3">
      <div
        className="h-12 rounded border border-black/10"
        style={{
          backgroundColor: startColor,
          backgroundImage: `linear-gradient(${gradient.angle}deg, ${startColor}, ${endColor})`,
          opacity: gradient.enabled === "on" ? Math.max(0.15, gradient.opacity / 100) : 0.25,
        }}
      />
      <label className="flex items-center justify-between gap-3 text-xs font-semibold">
        Gradient
        <button
          type="button"
          role="switch"
          aria-checked={gradient.enabled === "on"}
          disabled={readOnly}
          onClick={() => update({ enabled: gradient.enabled === "on" ? "off" : "on" })}
          className={`relative h-6 w-11 rounded-full transition-colors ${gradient.enabled === "on" ? "bg-black" : "bg-black/15"}`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${gradient.enabled === "on" ? "translate-x-6" : "translate-x-1"}`}
          />
        </button>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Start", key: "startColor" as const, value: startColor },
          { label: "End", key: "endColor" as const, value: endColor },
        ].map((colour) => (
          <label
            key={colour.key}
            className="min-w-0 text-[10px] font-semibold uppercase text-black/55"
          >
            {colour.label}
            <span className="mt-1.5 grid grid-cols-[34px_1fr] gap-1.5">
              <input
                type="color"
                value={colour.value}
                disabled={readOnly}
                onChange={(event) => update({ [colour.key]: event.target.value.toUpperCase() })}
                className="h-9 w-[34px] cursor-pointer rounded border border-black/15 bg-white p-1"
              />
              <input
                value={colour.value}
                readOnly={readOnly}
                maxLength={7}
                onChange={(event) => update({ [colour.key]: event.target.value.toUpperCase() })}
                className="h-9 min-w-0 rounded border border-black/15 bg-white px-2 font-mono text-[10px] uppercase outline-none focus:border-black"
              />
            </span>
          </label>
        ))}
      </div>
      <label className="block text-[11px] font-semibold">
        Angle <span className="font-normal text-black/45">{gradient.angle} degrees</span>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={gradient.angle}
          disabled={readOnly}
          onChange={(event) => update({ angle: Number(event.target.value) })}
          className="mt-1.5 block w-full accent-black"
        />
      </label>
      <label className="block text-[11px] font-semibold">
        Strength <span className="font-normal text-black/45">{gradient.opacity}%</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={gradient.opacity}
          disabled={readOnly}
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          className="mt-1.5 block w-full accent-black"
        />
      </label>
      <button
        type="button"
        disabled={readOnly}
        onClick={() => onChange({ ...DEFAULT_HERO_GRADIENT })}
        className="h-9 w-full rounded border border-black/15 bg-white text-[11px] font-semibold transition-colors hover:bg-black hover:text-white disabled:opacity-50"
      >
        Reset to Fawzaan mango
      </button>
    </div>
  );
}

export function homepageGradientField(label: string): Field<HeroGradient> {
  return {
    type: "custom",
    label,
    render: ({ value, onChange, readOnly }) => (
      <GradientInput value={value} onChange={onChange} readOnly={readOnly} />
    ),
  };
}
