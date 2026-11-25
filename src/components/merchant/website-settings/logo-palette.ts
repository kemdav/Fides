import { colorLuminance } from "@/lib/brand-colors";
import type { WebsiteSettingsData } from "./types";

type LogoPalette = Pick<
  WebsiteSettingsData,
  "mainColor" | "secondaryColor" | "accentColor"
>;

export interface LogoPaletteSuggestion {
  name: string;
  colors: LogoPalette;
}

type Rgb = [number, number, number];

function toHex(color: Rgb): string {
  const channels = color.map((channel) =>
    Math.round(channel).toString(16).padStart(2, "0"),
  );
  return "#" + channels.join("").toUpperCase();
}

function blendWith(color: Rgb, target: number, ratio: number): Rgb {
  const mix = (channel: number) => channel * (1 - ratio) + target * ratio;
  return [mix(color[0]), mix(color[1]), mix(color[2])];
}

function rankedLogoColors(pixels: Uint8ClampedArray) {
  const buckets = new Map<number, { weight: number; channels: Rgb }>();
  let totalWeight = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha === 0) continue;

    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const weight = (alpha / 255) ** 2;
    const key = (red >> 4) * 256 + (green >> 4) * 16 + (blue >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { weight: 0, channels: [0, 0, 0] };
      buckets.set(key, bucket);
    }
    bucket.weight += weight;
    bucket.channels[0] += red * weight;
    bucket.channels[1] += green * weight;
    bucket.channels[2] += blue * weight;
    totalWeight += weight;
  }

  const colors: { color: Rgb; score: number }[] = [];
  for (const { weight, channels } of buckets.values()) {
    if (weight < totalWeight * 0.002) continue;
    const color: Rgb = [
      channels[0] / weight,
      channels[1] / weight,
      channels[2] / weight,
    ];
    const min = Math.min(...color);
    const chroma = (Math.max(...color) - min) / 255;
    // Favor visible brand colors over white backgrounds and compression noise.
    const distanceFromWhite = Math.min((255 - min) / 80, 1);
    const score = weight * (0.001 + distanceFromWhite ** 2 * (0.36 + chroma * 2.6));
    colors.push({ color, score });
  }
  return colors.sort((a, b) => b.score - a.score);
}

function createPalette(
  accent: Rgb,
  mainTint: number,
  secondaryTint: number,
  supportingColor?: Rgb,
): LogoPalette {
  let accentColor = toHex(accent);
  const getSecondaryColor = () =>
    toHex(blendWith(supportingColor ?? accent, 255, secondaryTint));
  let secondaryColor = getSecondaryColor();
  // The accent is used for links on both backgrounds and buttons with white text.
  while (
    (colorLuminance(secondaryColor) + 0.05) /
      (colorLuminance(accentColor) + 0.05) < 4.5
  ) {
    accent = blendWith(accent, 0, 0.1);
    accentColor = toHex(accent);
    secondaryColor = getSecondaryColor();
  }

  return {
    mainColor: toHex(blendWith(supportingColor ?? accent, 255, mainTint)),
    secondaryColor,
    accentColor,
  };
}

export async function suggestLogoPalettes(
  file: File,
): Promise<LogoPaletteSuggestion[] | null> {
  let url: string | undefined;
  try {
    url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) return null;

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, 128 / longestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const [primary, ...otherColors] = rankedLogoColors(pixels);
    if (!primary) return null;

    const base = primary.color;
    const alternate = otherColors.find(
      ({ color, score }) =>
        score >= primary.score * 0.15 &&
        Math.hypot(color[0] - base[0], color[1] - base[1], color[2] - base[2]) >= 80,
    )?.color;

    return [
      { name: "Signature", colors: createPalette(base, 0.94, 0.8) },
      {
        name: "Soft",
        colors: createPalette(blendWith(base, 125, 0.45), 0.98, 0.89),
      },
      {
        name: "Bold",
        colors: alternate
          ? createPalette(alternate, 0.88, 0.71, base)
          : createPalette(blendWith(base, 0, 0.25), 0.88, 0.71),
      },
    ];
  } catch {
    return null;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
