import { useId, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@/components/admin/icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/select-field";
import { fieldLabel } from "./report-ui";

export type ExportFormat = "csv" | "pdf";
export type ExportSection = "summary" | "all";

const formats = [{ value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }] as const;
const sections = [{ value: "summary", label: "Summary only" }, { value: "all", label: "All sections" }] as const;

export function ReportExportDialog({ mode, scope, onClose, onExport }: {
  mode: "Operational" | "Business";
  scope: string;
  onClose: () => void;
  onExport: (format: ExportFormat, section: ExportSection) => void;
}): ReactElement {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [section, setSection] = useState<ExportSection>("summary");
  const titleId = useId();
  const formatId = useId();
  const sectionId = useId();

  return (
    <Modal open onClose={onClose} labelledBy={titleId} className="print:hidden">
      <h2 id={titleId} className="font-display text-2xl text-ink">Export {mode} Report</h2>
      <p className="mt-1 text-sm text-muted">Choose the file format and sections to include.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={formatId} className={fieldLabel}>File format</label>
          <SelectField id={formatId} value={format} options={formats} onChange={setFormat} compact />
        </div>
        <div className="min-w-0">
          <label htmlFor={sectionId} className={fieldLabel}>Sections to include</label>
          <SelectField id={sectionId} value={section} options={sections} onChange={setSection} compact />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">Applied filters · {scope}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="brand" onClick={() => onExport(format, section)}>Export report</Button>
      </div>
    </Modal>
  );
}

export function ExportConfirmation({ title, onClose }: { title: string; onClose: () => void }): ReactElement {
  const titleId = useId();
  return (
    <Modal open onClose={onClose} labelledBy={titleId} className="max-w-sm text-center print:hidden">
      <Icon name="check-circle" className="mx-auto mb-3 size-11 text-success" />
      <h2 id={titleId} className="text-lg font-semibold text-ink">{title}</h2>
      <Button variant="brand" className="mt-5" onClick={onClose}>Done</Button>
    </Modal>
  );
}
