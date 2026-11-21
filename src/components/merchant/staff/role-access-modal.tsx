import { Icon } from "@/components/admin/icon";
import { AdminButton } from "@/components/admin/admin-button";
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

const cellClass = "border-b border-hairline px-3 py-3 text-left align-top sm:px-4";

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
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline bg-powder px-4 py-4 sm:px-6">
          <div>
            <h2 id="role-access-title" className="font-display text-[26px] leading-[34px]">
              Dashboard roles &amp; permissions
            </h2>
            <p className="mt-1 text-sm text-muted">Compare what each dashboard role can access. Role permissions are fixed.</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-burnt/10 focus-visible:outline-burnt"
          >
            <Icon name="close" className="size-5" />
          </button>
        </header>

        <div
          role="region"
          aria-label="Permissions by role"
          tabIndex={0}
          className="min-h-0 overflow-auto outline-offset-[-2px] focus-visible:outline-burnt"
        >
          <table className="w-full min-w-[38rem] table-fixed border-separate border-spacing-0 text-sm text-body">
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="sticky top-0 bg-mist text-ink">
              <tr>
                {["Capability", "Owner", "Receptionist", "Service Staff"].map((heading) => (
                  <th key={heading} scope="col" className={`${cellClass} font-semibold`}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capabilities.map(([capability, owner, receptionist, staff]) => (
                <tr key={capability} className="even:bg-mist/60">
                  <th scope="row" className={`${cellClass} font-medium text-ink`}>{capability}</th>
                  {[owner, receptionist, staff].map((permission, index) => (
                    <td key={index} className={`${cellClass} ${permission.startsWith("No ") ? "text-muted" : ""}`}>{permission}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-hairline bg-mist px-4 py-4 sm:px-6">
          <p className="text-xs text-muted">Role mapping for tenant roles — Owner → owner, Receptionist → receptionist, Service Staff → staff.</p>
          <AdminButton variant="primary" size="xs" className="ml-auto" onClick={onClose}>Done</AdminButton>
        </footer>
      </div>
    </Modal>
  );
}
