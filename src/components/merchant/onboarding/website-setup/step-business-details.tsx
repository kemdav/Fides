import { Listbox } from "@/components/admin/listbox";
import { FIELD_CLASS, TEXTAREA_CLASS, type StepFields } from "./setup-data";

const fields = [
  { key: "businessEmail", label: "Business email *", placeholder: "hello@yourbusiness.com", max: 254, type: "email" },
  { key: "phoneNumber", label: "Phone number *", placeholder: "+63 917 000 0000", max: 30, type: "tel" },
  { key: "instagram", label: "Instagram handle", placeholder: "@yourbusiness", max: 100 },
  { key: "streetAddress", label: "Street address", placeholder: "Building, street, barangay", max: 200 },
  { key: "cityProvince", label: "City or province", placeholder: "Cebu City, Cebu", max: 100 },
  { key: "postalCode", label: "Postal code", placeholder: "6000", max: 20 },
  { key: "hoursMonFri", label: "Monday–Friday", placeholder: "9:00 AM – 6:00 PM", max: 50 },
  { key: "hoursSat", label: "Saturday", placeholder: "10:00 AM – 5:00 PM", max: 50 },
  { key: "hoursSun", label: "Sunday", placeholder: "Closed", max: 50 },
  { key: "timeZone", label: "Time zone", placeholder: "Asia/Manila (UTC+08:00)", max: 50 },
] as const;

const categories = ["Beauty & wellness", "Healthcare", "Fitness", "Professional services", "Other"];

export function StepBusinessDetails({ data, onChange }: StepFields) {
  const options = categories.map((category) => ({ value: category, label: category }));
  if (data.businessCategory && !categories.includes(data.businessCategory)) {
    options.unshift({ value: data.businessCategory, label: data.businessCategory });
  }

  function renderField(field: typeof fields[number]) {
    return (
      <label key={field.key} className="block min-w-0 space-y-1.5 text-sm font-semibold">
        <span>{field.label}</span>
        <input type={"type" in field ? field.type : "text"} className={FIELD_CLASS} value={data[field.key]} maxLength={field.max} placeholder={field.placeholder} onChange={(event) => onChange({ [field.key]: event.target.value })} />
      </label>
    );
  }

  return (
    <div className="@container space-y-5">
      <h2 className="text-base font-semibold leading-6 text-ink">Public profile</h2>
      <Listbox
        id="website-setup-category"
        label="Business category"
        value={data.businessCategory}
        options={options}
        onChange={(businessCategory) => onChange({ businessCategory })}
        placeholder="Choose a category"
      />
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>About your business</span>
        <textarea className={TEXTAREA_CLASS} rows={3} maxLength={1000} value={data.about} placeholder="Tell customers a little about you and your team." onChange={(event) => onChange({ about: event.target.value })} />
      </label>
      <section className="@container space-y-3 border-t border-hairline pt-4">
        <h2 className="text-base font-semibold leading-6 text-ink">Customer contact</h2>
        <div className="grid gap-4 @sm:grid-cols-2">{fields.slice(0, 3).map(renderField)}</div>
      </section>
      <section className="@container space-y-3 border-t border-hairline pt-4">
        <h2 className="text-base font-semibold leading-6 text-ink">Location</h2>
        <div className="grid gap-4 @sm:grid-cols-2">{fields.slice(3, 6).map(renderField)}</div>
      </section>
      <fieldset className="space-y-4 border-t border-hairline pt-4">
        <legend className="pr-2 text-sm font-semibold">Opening hours <span className="font-normal text-muted">(optional)</span></legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" className="size-4 accent-burnt" checked={data.showOpeningHours} onChange={(event) => onChange({ showOpeningHours: event.target.checked })} /> Show opening hours</label>
        <div className="grid gap-4 @sm:grid-cols-2">{fields.slice(6).map(renderField)}</div>
      </fieldset>
    </div>
  );
}
