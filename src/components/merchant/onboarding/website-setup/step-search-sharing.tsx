import Image from "next/image";
import { FIELD_CLASS, TEXTAREA_CLASS, websiteAddress, type StepFields } from "./setup-data";

export function StepSearchSharing({ data, onChange }: StepFields) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold leading-6 text-ink">Search listing</h2>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Page title</span>
        <input value={data.pageTitle} maxLength={100} placeholder={data.businessName || "Your business name"} className={FIELD_CLASS} onChange={(event) => onChange({ pageTitle: event.target.value })} />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Meta description</span>
        <textarea value={data.metaDescription} maxLength={300} rows={3} placeholder="Describe your business and what customers can book." className={TEXTAREA_CLASS} onChange={(event) => onChange({ metaDescription: event.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" className="size-4 accent-burnt" checked={data.allowIndexing} onChange={(event) => onChange({ allowIndexing: event.target.checked })} /> Allow search engines to index your website</label>
      <div className="space-y-3 border-t border-hairline pt-4">
        <h2 className="text-base font-semibold leading-6 text-ink">Social sharing</h2>
        <label className="block space-y-1.5 text-sm font-semibold">
          <span>Social title</span>
          <input value={data.socialTitle} maxLength={100} placeholder={data.pageTitle || data.businessName || "Your website title"} className={FIELD_CLASS} onChange={(event) => onChange({ socialTitle: event.target.value })} />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold">
          <span>Social description</span>
          <textarea value={data.socialDescription} maxLength={300} rows={2} placeholder={data.metaDescription || "A short summary for shared links."} className={TEXTAREA_CLASS} onChange={(event) => onChange({ socialDescription: event.target.value })} />
        </label>
        <div className="overflow-hidden rounded-lg border border-hairline bg-mist">
          <div className="relative h-32"><Image src={data.coverPhotoUrl || "/images/storefront/hero Image.png"} alt="" fill unoptimized className="object-cover" /></div>
          <div className="space-y-1 break-words p-3">
            <p className="text-xs text-muted">{websiteAddress(data.subdomain)}</p>
            <p className="font-semibold text-ink">{data.socialTitle || data.pageTitle || data.businessName || "Your website"}</p>
            <p className="text-sm text-muted">{data.socialDescription || data.metaDescription || data.supportingMessage || "Your website description appears here."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
