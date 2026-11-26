"use client";

import * as React from "react";
import { ColorPickerModal } from "@/components/merchant/website-settings/color-picker-modal";
import { suggestLogoPalettes, type LogoPaletteSuggestion } from "@/components/merchant/website-settings/logo-palette";
import type { ColorType } from "@/components/merchant/website-settings/types";
import { HEX_COLOR_REGEX } from "@/lib/validations/website-settings";
import type { StepFields } from "./setup-data";

const channels = [
  { id: "main", key: "mainColor", label: "Main", use: "Backgrounds", percent: "60%" },
  { id: "secondary", key: "secondaryColor", label: "Secondary", use: "Sections & cards", percent: "30%" },
  { id: "accent", key: "accentColor", label: "Accent", use: "Buttons & links", percent: "10%" },
] as const;

const presets: LogoPaletteSuggestion[] = [
  { name: "Warm studio", colors: { mainColor: "#FFFFEB", secondaryColor: "#ADD8E6", accentColor: "#C35000" } },
  { name: "Quiet garden", colors: { mainColor: "#F5F4EA", secondaryColor: "#CDDDBB", accentColor: "#315D47" } },
  { name: "Soft clay", colors: { mainColor: "#FFF5EF", secondaryColor: "#EBD0C9", accentColor: "#843F52" } },
];

export function ColorPalettePicker({ data, onChange }: StepFields) {
  const [picker, setPicker] = React.useState<ColorType | null>(null);
  const [suggestions, setSuggestions] = React.useState<{ url: string; palettes: LogoPaletteSuggestion[] | null }>();
  const logo = data.logoUrl;

  React.useEffect(() => {
    if (!logo?.startsWith("data:image/")) return;
    let cancelled = false;

    async function suggestPalettes(dataUrl: string) {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "logo", { type: blob.type });
      return suggestLogoPalettes(file);
    }

    const update = (palettes: LogoPaletteSuggestion[] | null) => {
      if (!cancelled) setSuggestions({ url: logo, palettes });
    };
    void suggestPalettes(logo).then(update, () => update(null));
    return () => { cancelled = true; };
  }, [logo]);

  const logoPalettes = suggestions?.url === logo ? suggestions?.palettes : undefined;
  const selectedChannel = channels.find(({ id }) => id === picker);

  function paletteCards(palettes: LogoPaletteSuggestion[]) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
        {palettes.map(({ name, colors }) => {
          const isSelected = channels.every(({ key }) => data[key].toUpperCase() === colors[key].toUpperCase());
          return (
            <button
              key={name}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(colors)}
              className="flex min-w-0 flex-col gap-2 rounded-[10px] border border-hairline bg-white p-2.5 text-left text-xs font-semibold transition-colors hover:border-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 aria-pressed:border-burnt aria-pressed:bg-wash"
            >
              {name}
              <span className="flex h-6 w-full overflow-hidden rounded-md border border-black/10" aria-hidden>
                {channels.map(({ key, percent }) => (
                  <span key={key} style={{ width: percent, backgroundColor: colors[key] }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section aria-label="Website color palette" className="space-y-4 border-t border-hairline pt-4">
      <h2 className="text-base font-semibold leading-6 text-ink">Website color palette</h2>
      <p role="status" className={logoPalettes === null ? "text-xs text-muted" : "sr-only"}>
        {logoPalettes === null ? "No palette could be generated from this logo." : logoPalettes ? "Three palettes are ready to preview." : null}
      </p>
      {logoPalettes && (
        <fieldset className="min-w-0">
          <legend className="mb-2 text-xs font-semibold text-ink">Suggested from your logo</legend>
          {paletteCards(logoPalettes)}
        </fieldset>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
        {channels.map(({ id, key, label, use, percent }) => (
          <button
            key={id}
            type="button"
            className="min-w-0 space-y-1.5 rounded-[10px] border border-hairline bg-white p-2.5 text-left hover:border-outline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
            onClick={() => setPicker(id)}
          >
            <span className="flex items-center justify-between gap-1 text-xs">
              <span className="font-semibold text-ink">{label}</span>
              <span className="text-[10px] text-muted">{percent}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5 rounded-lg border border-hairline bg-mist p-1">
              <span className="size-4 shrink-0 rounded border border-black/10" style={{ backgroundColor: data[key] }} />
              <span className="truncate font-mono text-[11px] uppercase text-body">{data[key]}</span>
            </span>
            <span className="block text-[11px] text-muted">{use}</span>
          </button>
        ))}
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full border border-black/5" aria-hidden>
        {channels.map(({ key, percent }) => (
          <span key={key} style={{ width: percent, backgroundColor: data[key] }} />
        ))}
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-xs font-semibold text-ink">Palette presets</legend>
        {paletteCards(presets)}
      </fieldset>
      <ColorPickerModal type={picker} currentColor={selectedChannel ? data[selectedChannel.key] : "#FFFFFF"} isOpen={picker !== null} onClose={() => setPicker(null)} onApply={(_, hex) => {
        if (selectedChannel && HEX_COLOR_REGEX.test(hex)) onChange({ [selectedChannel.key]: hex });
      }} />
    </section>
  );
}
