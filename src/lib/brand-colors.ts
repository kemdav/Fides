import type { CSSProperties } from "react";

export const merchantNameTypography =
  "break-words font-display text-[clamp(24px,3.2vh,32px)] leading-[clamp(29px,4vh,38px)] tracking-tight";

export function normalizeBrandColor(value: string | null, fallback: string): string {
  const color = value?.trim();
  if (!color || !/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)) return fallback;
  return color.length === 4 ? "#" + color.slice(1).split("").map((channel) => channel.repeat(2)).join("") : color;
}

export function colorLuminance(color: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function readableForeground(background: string, preferred: string): string {
  const bg = colorLuminance(background);
  const fg = colorLuminance(preferred);
  const ratio = (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
  return ratio >= 4.5 ? preferred : bg > 0.179 ? "#000000" : "#ffffff";
}

type TenantColorStyle = CSSProperties & Partial<Record<
  "--color-powder" | "--color-sky" | "--color-burnt" | "--color-burnt-dark" | "--color-on-burnt",
  string
>>;

export function tenantColorStyle(
  main: string | null,
  secondary: string | null,
  accent: string | null,
): TenantColorStyle {
  const mainColor = normalizeBrandColor(main, "");
  const secondaryColor = normalizeBrandColor(secondary, "");
  const accentColor = normalizeBrandColor(accent, "");

  return {
    ...(mainColor ? { "--color-powder": mainColor } : {}),
    ...(secondaryColor ? { "--color-sky": secondaryColor } : {}),
    ...(accentColor ? { "--color-burnt": accentColor, "--color-burnt-dark": accentColor } : {}),
    ...(mainColor || accentColor
      ? { "--color-on-burnt": mainColor || readableForeground(accentColor, "#ffffff") }
      : {}),
  };
}
