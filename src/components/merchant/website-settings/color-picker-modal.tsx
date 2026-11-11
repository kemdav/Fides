"use client";

import * as React from "react";
import { ColorType, ColorOption } from "./types";

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

function ColorPickerContent({
  type,
  currentColor,
  onClose,
  onApply,
}: Omit<ColorPickerModalProps, "isOpen"> & { type: ColorType }) {
  const [selectedHex, setSelectedHex] = React.useState(currentColor);
  const config = COLOR_CONFIG[type];

  const handleApply = () => {
    const formatted = selectedHex.startsWith("#")
      ? selectedHex.toUpperCase()
      : `#${selectedHex.toUpperCase()}`;
    onApply(type, formatted);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-modal-title"
      >
        <div className="mb-4">
          <h3
            id="color-modal-title"
            className="text-base font-semibold text-neutral-900"
          >
            {config.title}
          </h3>
          <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
            {config.description}
          </p>
        </div>

        {/* Large Horizontal Color Preview Rectangle */}
        <div
          className="w-full h-10 rounded-xl border border-black/10 shadow-inner mb-4 transition-colors"
          style={{ backgroundColor: selectedHex }}
        />

        <div className="space-y-3.5">
          {/* HEX Input */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              HEX color*
            </label>
            <input
              type="text"
              value={selectedHex}
              onChange={(e) => setSelectedHex(e.target.value)}
              maxLength={7}
              placeholder="#000000"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono text-xs uppercase text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#C35000] focus:border-[#C35000] transition"
            />
            <p className="mt-1 text-[11px] text-neutral-400">
              Choose a color or enter a 6-digit HEX value.
            </p>
          </div>

          {/* Curated Preset Swatches (2x2 Grid) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {config.presets.map((preset) => {
              const isSelected =
                selectedHex.toUpperCase() === preset.hex.toUpperCase();
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setSelectedHex(preset.hex)}
                  className={`flex items-center justify-center px-3 py-2 rounded-xl border text-xs font-medium transition ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900 text-neutral-900 font-semibold"
                      : "border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700"
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl shadow-2xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#C35000] hover:bg-[#A94400] rounded-xl shadow-xs transition"
          >
            Apply color
          </button>
        </div>
      </div>
    </div>
  );
}
