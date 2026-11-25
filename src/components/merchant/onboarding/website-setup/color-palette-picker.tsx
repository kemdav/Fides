"use client";

import * as React from "react";
import { ColorPickerModal } from "@/components/merchant/website-settings/color-picker-modal";
import type { ColorType } from "@/components/merchant/website-settings/types";
import { HEX_COLOR_REGEX } from "@/lib/validations/website-settings";
import type { StepFields } from "./setup-data";

const channels = [
  { id: "main", key: "mainColor", label: "Main · 60%" },
  { id: "secondary", key: "secondaryColor", label: "Secondary · 30%" },
  { id: "accent", key: "accentColor", label: "Accent · 10%" },
] as const;

type Palette = { name: string; colors: [string, string, string] };
type Rgb = [number, number, number];
const presets: Palette[] = [
  { name: "Warm studio", colors: ["#FFFFEB", "#ADD8E6", "#C35000"] },
  { name: "Quiet garden", colors: ["#F5F4EA", "#CDDDBB", "#315D47"] },
  { name: "Soft clay", colors: ["#FFF5EF", "#EBD0C9", "#843F52"] },
];

function logoPalettes(image: HTMLImageElement): Palette[] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 24;
  const context = canvas.getContext("2d");
  if (!context) return [];
  context.drawImage(image, 0, 0, 24, 24);
  const pixels = context.getImageData(0, 0, 24, 24).data;
  const counts = new Map<string, { rgb: Rgb; count: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const rgb: Rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    if (pixels[i + 3] < 180 || Math.min(...rgb) > 240) continue;
    const key = rgb.map((value) => Math.floor(value / 32)).join(",");
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { rgb, count: 1 });
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  const base = sorted[0]?.rgb;
  if (!base) return [];
  const companion = sorted[1]?.rgb ?? base;
  const mix = (source: Rgb, toward: number, amount: number) => "#" + source.map((value) => Math.round(value + (toward - value) * amount).toString(16).padStart(2, "0")).join("").toUpperCase();
  return [
    { name: "Logo · Light", colors: [mix(base, 255, .94), mix(companion, 255, .78), mix(base, 0, .3)] },
    { name: "Logo · Balanced", colors: [mix(companion, 255, .92), mix(base, 255, .64), mix(companion, 0, .42)] },
    { name: "Logo · Contrast", colors: [mix(base, 255, .98), mix(companion, 255, .52), mix(base, 0, .58)] },
  ];
}

export function ColorPalettePicker({ data, onChange }: StepFields) {
  const [picker, setPicker] = React.useState<ColorType | null>(null);
  const [suggestions, setSuggestions] = React.useState<{ url: string; palettes: Palette[] }>();
  const logo = data.logoUrl;

  React.useEffect(() => {
    if (!logo?.startsWith("data:image/")) return;
    const image = new window.Image();
    image.onload = () => {
      try { setSuggestions({ url: logo, palettes: logoPalettes(image) }); }
      catch { /* Presets remain available if the image cannot be sampled. */ }
    };
    image.src = logo;
    return () => { image.onload = null; };
  }, [logo]);

  const palettes = [...presets, ...(suggestions && suggestions.url === logo ? suggestions.palettes : [])];
  const selectedChannel = channels.find(({ id }) => id === picker);

  return (
    <fieldset className="space-y-3 border-t border-hairline pt-4">
      <legend className="pr-2 text-sm font-semibold">Brand colors</legend>
      <p className="text-xs text-muted">Use the main color for backgrounds, the secondary for sections, and the accent for actions.</p>
      <div className="grid grid-cols-3 gap-2">
        {channels.map(({ id, key, label }) => (
          <button key={id} type="button" className="min-w-0 rounded-lg border border-hairline p-2 text-left hover:border-burnt focus-visible:outline-2 focus-visible:outline-burnt" onClick={() => setPicker(id)}>
            <span className="block h-6 rounded border border-black/10" style={{ backgroundColor: data[key] }} />
            <span className="mt-1.5 block text-[11px] font-semibold">{label}</span>
            <span className="font-mono text-[10px] text-muted">{data[key]}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {palettes.map(({ name, colors: [mainColor, secondaryColor, accentColor] }) => {
          const isSelected = data.mainColor.toUpperCase() === mainColor && data.secondaryColor.toUpperCase() === secondaryColor && data.accentColor.toUpperCase() === accentColor;
          return (
            <button key={name} type="button" aria-pressed={isSelected} onClick={() => onChange({ mainColor, secondaryColor, accentColor })} className={`rounded-lg border px-2.5 py-2 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-burnt ${isSelected ? "border-burnt bg-powder text-burnt" : "border-hairline hover:border-outline"}`}>
              <span className="mb-1.5 flex h-2.5 overflow-hidden rounded border border-black/10" aria-hidden>
                <span className="w-3/5" style={{ backgroundColor: mainColor }} />
                <span className="w-[30%]" style={{ backgroundColor: secondaryColor }} />
                <span className="w-[10%]" style={{ backgroundColor: accentColor }} />
              </span>
              {name}
            </button>
          );
        })}
      </div>
      <ColorPickerModal type={picker} currentColor={selectedChannel ? data[selectedChannel.key] : "#FFFFFF"} isOpen={picker !== null} onClose={() => setPicker(null)} onApply={(_, hex) => {
        if (selectedChannel && HEX_COLOR_REGEX.test(hex)) onChange({ [selectedChannel.key]: hex });
      }} />
    </fieldset>
  );
}
