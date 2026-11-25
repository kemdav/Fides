import { ColorPalettePicker } from "./color-palette-picker";
import { LogoUploader } from "./logo-uploader";
import { TypographySelect } from "./typography-select";
import { FIELD_CLASS, type StepFields } from "./setup-data";

export function StepBrandIdentity({ data, onChange }: StepFields) {
  return (
    <div className="space-y-5">
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Business display name</span>
        <input className={FIELD_CLASS} value={data.businessName} maxLength={100} onChange={(event) => onChange({ businessName: event.target.value })} placeholder="Bella Vita Studio" />
      </label>
      <LogoUploader data={data} onChange={onChange} />
      <TypographySelect value={data.typography} onChange={(typography) => onChange({ typography })} />
      <ColorPalettePicker data={data} onChange={onChange} />
    </div>
  );
}
