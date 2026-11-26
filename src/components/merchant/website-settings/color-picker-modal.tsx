"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { normalizeBrandColor } from "@/lib/brand-colors";
import { HEX_COLOR_REGEX } from "@/lib/validations/website-settings";
import type { ColorType, ColorOption } from "./types";

const COLOR_CONFIG: Record<
  ColorType,
  {
    title: string;
    description: string;
    presets: ColorOption[];
  }
> = {
  main: {
    title: "Change Main color",
    description:
      "Main makes up about 60% of your website. Backgrounds use this color.",
    presets: [
      { name: "Powder white", hex: "#FFFFEB" },
      { name: "Pure white", hex: "#FFFFFF" },
      { name: "Warm ivory", hex: "#FDFBF7" },
      { name: "Cool white", hex: "#F8FAFC" },
    ],
  },
  secondary: {
    title: "Change Secondary color",
    description:
      "Secondary makes up about 30% of your website. Sections & cards use this color.",
    presets: [
      { name: "Light blue", hex: "#ADD8E6" },
      { name: "Soft sage", hex: "#D1E2D3" },
      { name: "Warm sand", hex: "#F2E8DC" },
      { name: "Soft rose", hex: "#FADCD9" },
    ],
  },
  accent: {
    title: "Change Accent color",
    description:
      "Accent makes up about 10% of your website. Buttons & links use this color.",
    presets: [
      { name: "Burnt orange", hex: "#CC5000" },
      { name: "Royal blue", hex: "#2E5BFF" },
      { name: "Deep teal", hex: "#0D6E6E" },
      { name: "Berry", hex: "#8B1E3F" },
    ],
  },
};

interface ColorPickerModalProps {
  type: ColorType | null;
  currentColor: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (type: ColorType, hex: string) => void;
}

export function ColorPickerModal({
  type,
  currentColor,
  isOpen,
  onClose,
  onApply,
}: ColorPickerModalProps) {
  if (!isOpen || !type) return null;

  return (
    <ColorPickerContent
      key={`${type}-${currentColor}`}
      type={type}
      currentColor={currentColor}
      onClose={onClose}
      onApply={onApply}
    />
  );
}

function formatHex(value: string): string | null {
  const trimmed = value.trim().toUpperCase();
  const hex = trimmed.startsWith("#") ? trimmed : "#" + trimmed;
  return HEX_COLOR_REGEX.test(hex) ? hex : null;
}

function ColorPickerContent({
  type,
  currentColor,
  onClose,
  onApply,
}: Omit<ColorPickerModalProps, "isOpen"> & { type: ColorType }) {
  const [selectedHex, setSelectedHex] = React.useState(() =>
    normalizeBrandColor(currentColor, currentColor),
  );
  const [pickerHex, setPickerHex] = React.useState(() =>
    formatHex(selectedHex) ?? "#FFFFFF",
  );
  const titleId = React.useId();
  const hexId = React.useId();
  const hexHelpId = React.useId();
  const validHex = formatHex(selectedHex);
  const config = COLOR_CONFIG[type];

  const updateColor = (value: string) => {
    setSelectedHex(value);
    const formatted = formatHex(value);
    if (formatted) setPickerHex(formatted);
  };

  return (
    <Modal
      open
      unstyled
      onClose={onClose}
      labelledBy={titleId}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-white p-6 text-ink shadow-2xl backdrop:backdrop-blur-xs"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!validHex) return;
          onApply(type, validHex);
          onClose();
        }}
      >
        <div className="mb-4">
          <h3 id={titleId} className="text-lg font-semibold">
            {config.title}
          </h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {config.description}
          </p>
        </div>

        <label
          className="relative mb-4 flex h-10 w-full items-center justify-end rounded-lg border border-black/10 px-2 shadow-inner focus-within:ring-2 focus-within:ring-burnt/50"
          style={{ backgroundColor: pickerHex }}
        >
          <span className="rounded-md border border-black/10 bg-white px-2 py-1 text-xs font-medium text-ink">
            Choose color
          </span>
          <input
            type="color"
            value={pickerHex}
            onChange={(event) =>
              updateColor(event.currentTarget.value.toUpperCase())
            }
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>

        <div className="space-y-3.5">
          <div>
            <label
              htmlFor={hexId}
              className="mb-1 block text-xs font-medium text-body"
            >
              HEX color*
            </label>
            <input
              id={hexId}
              type="text"
              value={selectedHex}
              onChange={(event) => updateColor(event.currentTarget.value)}
              aria-invalid={!validHex}
              aria-describedby={hexHelpId}
              autoComplete="off"
              spellCheck={false}
              maxLength={7}
              placeholder="#000000"
              className="w-full rounded-lg border border-outline px-3 py-2.5 font-mono text-xs uppercase text-ink transition focus:border-burnt focus:outline-none focus:ring-2 focus:ring-burnt/25 aria-invalid:border-danger"
            />
            <p id={hexHelpId} className="mt-1 text-[11px] text-muted">
              Enter a 6-digit HEX value, such as #0D6E6E.
            </p>
          </div>

          {/* Curated Preset Swatches (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {config.presets.map((preset) => {
              const isSelected = validHex === preset.hex;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => updateColor(preset.hex)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-center px-3 py-2 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "border-ink bg-mist ring-1 ring-ink text-ink font-semibold"
                      : "border-line hover:border-outline bg-white text-body"
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-mist">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-ink bg-white border border-glyph/80 hover:bg-mist rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!validHex}
            className="inline-flex items-center justify-center h-10 px-5 text-sm font-semibold text-on-burnt bg-burnt hover:opacity-90 rounded-lg transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply color
          </button>
        </div>
      </form>
    </Modal>
  );
}
