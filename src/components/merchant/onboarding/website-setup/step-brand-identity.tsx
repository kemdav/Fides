import { ColorPalettePicker } from "./color-palette-picker";
import { LogoUploader } from "./logo-uploader";
import { TypographySelect } from "./typography-select";
import { FIELD_CLASS, type StepFields } from "./setup-data";

export function StepBrandIdentity({ data, onChange }: StepFields) {
  return (
    <div className="space-y-5">
      <div className="@container grid gap-4">
        <div className="grid gap-4 @sm:grid-cols-2">
          <label className="block min-w-0 text-sm font-semibold text-ink">
            <span className="mb-2 block leading-5">Business display name</span>
            <input className={FIELD_CLASS} value={data.businessName} maxLength={100} onChange={(event) => onChange({ businessName: event.target.value })} placeholder="Bella Vita Studio" />
          </label>
          <TypographySelect value={data.typography} onChange={(typography) => onChange({ typography })} />
        </div>
        <LogoUploader data={data} onChange={onChange} />
      </div>
      <ColorPalettePicker data={data} onChange={onChange} />
    </div>
  );
}
