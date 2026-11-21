import { Icon } from "@/components/admin/icon";
import { Modal } from "@/components/ui/modal";

const capabilities = [
  ["Bookings & walk-ins", "Manage all", "Manage all", "Assigned appointments only"],
  ["QR check-in & payments", "Manage", "Manage", "No access"],
  ["Customers: search & view", "All customers", "All customers", "No registry access"],
  ["Customers: internal notes", "View & edit", "View & edit", "No access"],
  ["Customers: send account invite", "Allowed", "Allowed", "No access"],
  ["Customers: export", "Allowed", "No access", "No access"],
  ["Services catalog", "View & edit", "View only", "Eligible services only"],
  ["Availability & resources", "View & edit", "View availability", "Own shifts & resources"],
  ["Staff & commission rules", "Manage", "No access", "No access"],
  ["Reports & subscription", "Manage", "No access", "No access"],
  ["Website & booking settings", "Manage", "No access", "No access"],
] as const;

const cellClass = "border-b border-hairline py-3.5 pr-4 text-left";

export function RoleAccessModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      open
      unstyled
      onClose={onClose}
      labelledBy="role-access-title"
      className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-hidden rounded-[14px] border border-line bg-white p-0 text-ink shadow-2xl backdrop:backdrop-blur-xs"
    >
      <div className="flex max-h-[min(92dvh,calc(100dvh-2rem))] flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-5 sm:px-6 sm:pt-6">
          <div>
            <h2 id="role-access-title" className="font-display text-[26px] leading-[34px]">
              Dashboard roles &amp; permissions
            </h2>
            <p className="mt-1 text-xs text-muted">Roles are fixed. This matrix is read-only.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-glyph hover:bg-mist hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div
          role="region"
          aria-label="Permissions by role"
          tabIndex={0}
          className="min-h-0 overflow-auto px-4 outline-offset-[-2px] sm:px-6"
        >
          <table className="w-full min-w-[38rem] table-fixed border-separate border-spacing-0 text-xs text-body">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="sticky top-0 bg-white text-ink">
              <tr>
                {["Capability", "Owner", "Receptionist", "Service Staff"].map((heading) => (
                  <th key={heading} scope="col" className={`${cellClass} font-semibold`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capabilities.map(([capability, owner, receptionist, staff]) => (
                <tr key={capability}>
                  <th scope="row" className={`${cellClass} font-normal`}>{capability}</th>
                  <td className={cellClass}>{owner}</td>
                  <td className={cellClass}>{receptionist}</td>
                  <td className={cellClass}>{staff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="shrink-0 px-4 py-4 text-xs text-muted sm:px-6 sm:pb-6">
          Role mapping for tenant roles — Owner → owner, Receptionist → receptionist, Service Staff → staff.
        </footer>
      </div>
    </Modal>
  );
}
