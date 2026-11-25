import { Icon, type IconName } from "@/components/admin/icon";

const topics: { icon: IconName; title: string; description: string }[] = [
  { icon: "layers", title: "Brand and homepage", description: "Choose your logo, colors, and the first thing customers see." },
  { icon: "book-settings", title: "Business details and address", description: "Give customers the information and link they need to find you." },
  { icon: "check", title: "Preview and publish", description: "Review the site on desktop and mobile before you finish." },
];

export function StepWelcome() {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-burnt"><Icon name="clock" className="size-4" /> About 4 minutes</p>
      <ul className="divide-y divide-hairline border-y border-hairline">
        {topics.map(({ icon, title, description }) => (
          <li key={title} className="flex gap-3 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mist text-burnt"><Icon name={icon} className="size-5" /></span>
            <div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-0.5 text-sm text-muted">{description}</p></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
