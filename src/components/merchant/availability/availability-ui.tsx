import { useId, useRef } from "react";
import type { ReactNode, SubmitEventHandler } from "react";
import { Icon } from "@/components/admin/icon";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export const surfaceClass = "min-w-0 rounded-xl! border border-hairline p-0!";
export const tableHeaderClass = "border-b border-hairline bg-mist text-xs font-semibold uppercase tracking-wide text-muted";
export const tableRowClass = "transition-colors hover:bg-mist";
export const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

type RowAction = { label: string; onSelect: () => void };

export function RowActions({ label, actions }: { label: string; actions: RowAction[] }): React.JSX.Element {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);

  return (
    <>
      <Button ref={trigger} popoverTarget={id} variant="ghost" size="md" className="size-10 rounded-lg p-0! text-muted @min-[58rem]:h-9" aria-label={label}>
        <Icon name="more" weight="fill" className="size-5" />
      </Button>
      <div ref={popover} id={id} popover="auto" aria-label={label}
        className="fixed inset-auto m-0 mt-1 w-48 max-w-[calc(100vw-1rem)] rounded-xl border border-hairline bg-white py-1 text-left shadow-popover [position-area:bottom_span-left] [position-try-fallbacks:flip-block,flip-inline]">
        {actions.map(({ label: actionLabel, onSelect }) => (
          <button key={actionLabel} type="button" onClick={() => {
            popover.current?.hidePopover();
            trigger.current?.focus();
            onSelect();
          }} className="block min-h-10 w-full px-3.5 py-2 text-left text-sm font-medium text-body hover:bg-mist focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burnt">
            {actionLabel}
          </button>
        ))}
      </div>
    </>
  );
}

export function AvailabilityDialog({ title, description, onClose, onSubmit, footer, children, wide }: {
  title: string;
  description: string;
  onClose: () => void;
  onSubmit?: SubmitEventHandler<HTMLFormElement>;
  footer: ReactNode;
  children: ReactNode;
  wide?: boolean;
}): React.JSX.Element {
  const titleId = useId();
  const body = (
    <>
      <div className="space-y-4 px-4 py-5 sm:px-6">{children}</div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline px-4 py-4 sm:px-6">{footer}</footer>
    </>
  );
  return (
    <Modal open onClose={onClose} unstyled labelledBy={titleId}
      className={cn("max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-hairline bg-white text-ink shadow-sheet", wide ? "max-w-3xl" : "max-w-2xl")}>
      <header className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-[26px] leading-[34px] text-ink">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Button variant="ghost" size="md" onClick={onClose} aria-label="Close dialog" className="size-10 shrink-0 p-0! text-muted">
          <Icon name="close" className="size-5" />
        </Button>
      </header>
      {onSubmit ? <form onSubmit={onSubmit}>{body}</form> : body}
    </Modal>
  );
}

export function DialogButtons({ onCancel, submit, destructive }: {
  onCancel: () => void;
  submit: string;
  destructive?: RowAction;
}): React.JSX.Element {
  return (
    <>
      {destructive && <Button variant="danger" className="mr-auto" onClick={destructive.onSelect}>{destructive.label}</Button>}
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant="brand" type="submit">{submit}</Button>
    </>
  );
}

export function FormError({ message }: { message: string }): React.JSX.Element | null {
  return message ? <p role="alert" className="rounded-lg bg-danger-bg p-3 text-sm text-danger-dark">{message}</p> : null;
}

export function AvailabilityConfirmation({ title, description, action, warning, onClose }: {
  title: string;
  description: string;
  action: RowAction;
  warning?: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const titleId = useId();
  return (
    <Modal open onClose={onClose} unstyled labelledBy={titleId}
      className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[400px] overflow-y-auto rounded-2xl border border-hairline bg-white px-7 py-8 text-center text-ink shadow-sheet">
      <Icon name="alert" className={cn("mx-auto mb-4 size-12", warning ? "text-warn-fg" : "text-danger")} />
      <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
      <p className="mt-2.5 text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={action.onSelect}>{action.label}</Button>
      </div>
    </Modal>
  );
}
