import { Listbox } from "@/components/admin/listbox";

const PAIRINGS = {
  "Ovo + Mulish": { heading: "var(--font-display)", body: "var(--font-sans)" },
  "Playfair + Inter": { heading: '"Playfair Display", Georgia, serif', body: 'Inter, Arial, sans-serif' },
  "Cormorant + Plus Jakarta Sans": { heading: '"Cormorant Garamond", "Times New Roman", serif', body: '"Plus Jakarta Sans", "Trebuchet MS", sans-serif' },
  "DM Serif + Montserrat": { heading: '"DM Serif Display", Cambria, serif', body: 'Montserrat, Verdana, sans-serif' },
  "Lora + Source Sans 3": { heading: 'Lora, Georgia, serif', body: '"Source Sans 3", system-ui, sans-serif' },
};

export function previewFonts(pairing: string) {
  return PAIRINGS[pairing as keyof typeof PAIRINGS] ?? PAIRINGS["Ovo + Mulish"];
}

export function TypographySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = Object.keys(PAIRINGS).map((pairing) => ({ value: pairing, label: pairing }));
  if (value && !Object.hasOwn(PAIRINGS, value)) options.unshift({ value, label: value });

  return <Listbox id="website-setup-typography" label="Typography" value={value} options={options} onChange={onChange} placeholder="Choose a pairing" />;
}
