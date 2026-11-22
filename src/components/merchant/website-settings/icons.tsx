import { Icon, type IconName } from "@/components/admin/icon";

type IconProps = { className?: string };

// Thin wrappers over the shared icon set (src/components/admin/icon.tsx) so call sites keep their names.
function make(name: IconName, weight: "regular" | "bold" = "regular") {
  return function SharedIcon({ className = "w-4 h-4" }: IconProps) {
    return <Icon name={name} weight={weight} className={className} />;
  };
}

export const CheckIcon = make("check", "bold");
export const CopyIcon = make("copy");
export const ExternalLinkIcon = make("external-link");
export const ArrowRightIcon = make("arrow-right");
export const ChevronDownIcon = make("chevron-down");
export const XIcon = make("close");
export const ShieldCheckIcon = make("shield-check");
export const AlertCircleIcon = make("alert");
export const GlobeIcon = make("globe");
export const ClockIcon = make("clock");
export const EyeIcon = make("eye");
export const SparklesIcon = make("sparkles");
