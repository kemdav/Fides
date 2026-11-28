import { SelectField } from "@/components/ui/select-field";
import { labelClass } from "./availability-ui";

function timeOption(value: string): { value: string; label: string } {
  const hour = Number(value.slice(0, 2));
  const minute = value.slice(3);
  return { value, label: `${String(hour % 12 || 12).padStart(2, "0")}:${minute} ${hour < 12 ? "AM" : "PM"}` };
}

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, "0");
  const minute = String((index % 4) * 15).padStart(2, "0");
  return timeOption(`${hour}:${minute}`);
});

export function TimeField({ id, label, value, onChange, optional = false }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}): React.JSX.Element {
  const options = value && !timeOptions.some((option) => option.value === value)
    ? [...timeOptions, timeOption(value)].toSorted((a, b) => a.value.localeCompare(b.value))
    : timeOptions;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <SelectField id={id} ariaLabel={label} value={value} onChange={onChange} placeholder="Select a time" placement="above" floating
        options={optional ? [{ value: "", label: "No break" }, ...options] : options} />
    </div>
  );
}
