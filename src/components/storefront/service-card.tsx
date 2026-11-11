import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export interface ServiceCardData {
  /** Category label, e.g. "STYLE & CARE". */
  category: string;
  /** Category accent colour (Tailwind text-color class). */
  categoryColor?: string;
  /** Service display name. */
  name: string;
  /** Duration string, e.g. "45 min". */
  duration: string;
  /** Formatted price, e.g. "₱650". */
  price: string;
  /** Card image path (public folder). */
  imageSrc: string;
  /** Image alt text. */
  imageAlt: string;
  /** Booking href for the "Select service" button. */
  href: string;
}

export function ServiceCard({
  category,
  categoryColor = "text-burnt",
  name,
  duration,
  price,
  imageSrc,
  imageAlt,
  href,
}: ServiceCardData) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-sm transition-shadow duration-300 hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[2.4/1] w-full overflow-hidden">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p
          className={`text-[9px] font-bold uppercase tracking-wider ${categoryColor}`}
        >
          {category}
        </p>
        <h3 className="text-xs font-semibold text-ink">{name}</h3>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-[10px] text-muted">
            {duration} · {price}
          </p>
          <Link
            href={href}
            className={buttonClasses({
              variant: "brand",
              size: "sm",
              className: "h-7 rounded-md px-2 text-[10px]",
            })}
          >
            Select service
          </Link>
        </div>
      </div>
    </div>
  );
}
