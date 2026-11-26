import { WebsiteMediaUploader } from "./logo-uploader";
import { FIELD_CLASS, TEXTAREA_CLASS, type StepFields } from "./setup-data";

export function StepHomepage({ data, onChange }: StepFields) {
  return (
    <div className="space-y-5">
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Headline <span className="text-burnt">*</span></span>
        <input className={FIELD_CLASS} value={data.headline} maxLength={200} placeholder="A little time for yourself." onChange={(event) => onChange({ headline: event.target.value })} />
      </label>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>Supporting message</span>
        <textarea className={TEXTAREA_CLASS} rows={3} value={data.supportingMessage} maxLength={500} placeholder="Tell customers what makes a visit special." onChange={(event) => onChange({ supportingMessage: event.target.value })} />
      </label>
      <WebsiteMediaUploader label="Cover photo" asset="cover" url={data.coverPhotoUrl} filename={data.coverPhotoName} onUpload={({ url, filename }) => onChange({ coverPhotoUrl: url, coverPhotoName: filename })} onRemove={() => onChange({ coverPhotoUrl: "", coverPhotoName: "" })} />
      <div className="space-y-3 border-t border-hairline pt-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" className="size-4 accent-burnt" checked={data.showFeaturedServices} onChange={(event) => onChange({ showFeaturedServices: event.target.checked })} /> Show featured services</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" role="switch" className="size-4 accent-burnt" checked={data.showContactDetails} onChange={(event) => onChange({ showContactDetails: event.target.checked })} /> Show contact details</label>
      </div>
    </div>
  );
}
