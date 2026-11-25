import { FIELD_CLASS } from "./setup-data";

const PAIRINGS = {
  "Ovo + Mulish": { heading: "var(--font-display)", body: "var(--font-sans)" },
  "Playfair + Inter": { heading: '"Playfair Display", Georgia, serif', body: 'Inter, Arial, sans-serif' },
  "Cormorant + Plus Jakarta Sans": { heading: '"Cormorant Garamond", "Times New Roman", serif', body: '"Plus Jakarta Sans", "Trebuchet MS", sans-serif' },
  "DM Serif + Montserrat": { heading: '"DM Serif Display", Cambria, serif', body: 'Montserrat, Verdana, sans-serif' },
};

export function previewFonts(pairing: string) {
  return PAIRINGS[pairing as keyof typeof PAIRINGS] ?? PAIRINGS["Ovo + Mulish"];
}

export function TypographySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold">
      <span>Typography pairing</span>
      <select className={FIELD_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        {!Object.hasOwn(PAIRINGS, value) && <option value={value}>{value || "Choose a pairing"}</option>}
        {Object.keys(PAIRINGS).map((pairing) => <option key={pairing}>{pairing}</option>)}
      </select>
    </label>
  );
}
