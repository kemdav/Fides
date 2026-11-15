"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { deleteAction, signOutAdminAction } from "@/app/(admin)/admin/actions";
import type { AccountDirectoryEntry } from "@/lib/applications/service";
import { AdminButton } from "./admin-button";
import { AdminModal } from "./admin-modal";
import { PageContent, PageHeading, Surface } from "./primitives";
import { ConfirmationCard, ResultDialog } from "./verification-dialogs";

type DialogState =
  | { type: "confirm"; account: AccountDirectoryEntry }
  | { type: "result"; title: string; message: string; failed: boolean };

const statusText: Record<AccountDirectoryEntry["status"], string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function SettingsScreen({
  adminName,
  adminUsername,
  accounts,
}: {
  adminName: string;
  adminUsername: string;
  accounts: AccountDirectoryEntry[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const searchId = useId();

  const counts = useMemo(() => {
    const total = { pending: 0, approved: 0, rejected: 0, suspended: 0 };
    for (const account of accounts) total[account.status] += 1;
    return total;
  }, [accounts]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return accounts
      .filter((a) => a.email.toLowerCase().includes(needle) || a.business.toLowerCase().includes(needle) || a.owner.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [accounts, query]);

  const close = () => setDialog(null);

  function remove(account: AccountDirectoryEntry) {
    startTransition(async () => {
      const result = await deleteAction(account.id);
      if (result.ok) {
        setQuery("");
        setDialog({ type: "result", title: "Account deleted", message: `${result.message} ${account.email} can be used to register again.`, failed: false });
        router.refresh();
      } else {
        setDialog({ type: "result", title: "Action failed", message: result.error, failed: true });
      }
    });
  }

  return (
    <PageContent>
      <PageHeading eyebrow="ADMINISTRATION" title="Settings" description="Your admin session, data information and maintenance tools." />

      <Surface className="flex flex-col gap-3">
        <h2 className="text-base font-semibold leading-6">Account</h2>
        <p className="text-sm leading-[21px] text-muted">
          Signed in as <span className="font-semibold text-ink">{adminName}</span> ({adminUsername}). Admin accounts are kept locally and are not stored in Supabase.
        </p>
        <form action={signOutAdminAction}>
          <AdminButton variant="outline" type="submit">
            Sign out
          </AdminButton>
        </form>
      </Surface>

      <Surface className="flex flex-col gap-3">
        <h2 className="text-base font-semibold leading-6">Data info</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(counts) as (keyof typeof counts)[]).map((key) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-xs leading-[18px] text-muted">{statusText[key]}</dt>
              <dd className="text-xl font-semibold leading-7">{counts[key]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-[18px] text-muted">
          Applications, business details and activity are stored in Supabase. Uploaded documents are kept in a private bucket and business logos in a public logo
          bucket. Deleting an account removes all of these.
        </p>
      </Surface>

      <Surface>
        <details className="group">
          <summary className="cursor-pointer list-none text-sm font-semibold leading-5 text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 [&::-webkit-details-marker]:hidden">
            Advanced
            <span aria-hidden className="ml-1 inline-block transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="mt-4 flex flex-col gap-3 border-t border-hairline pt-4">
            <h3 className="text-sm font-semibold leading-5">Delete account</h3>
            <p className="text-xs leading-[18px] text-muted">
              For clearing out test accounts so the same email can be registered again. This permanently removes the login, business details, documents and images.
            </p>
            <label htmlFor={searchId} className="sr-only">
              Search accounts by email, business or owner
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by email, business or owner"
              className="h-11 w-full rounded-lg border border-hairline bg-white px-4 text-sm text-body placeholder:text-subtle hover:border-outline focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 sm:max-w-[420px]"
            />
            {query.trim() && matches.length === 0 ? <p className="text-sm text-muted">No matching accounts.</p> : null}
            {matches.length > 0 ? (
              <ul className="flex flex-col sm:max-w-[560px]">
                {matches.map((account) => (
                  <li key={account.id} className="flex items-center justify-between gap-3 border-t border-hairline py-2.5 first:border-t-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-5">{account.email}</p>
                      <p className="truncate text-xs leading-[18px] text-muted">
                        {account.business} · {statusText[account.status]}
                      </p>
                    </div>
                    <AdminButton variant="danger" size="xs" onClick={() => setDialog({ type: "confirm", account })}>
                      Delete
                    </AdminButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      </Surface>

      <AdminModal open={dialog !== null} onClose={close}>
        {dialog?.type === "confirm" ? (
          <ConfirmationCard icon="status-danger" title="Delete this account?">
            <p className="text-center text-sm leading-[21px] text-muted">
              Permanently delete <span className="font-semibold text-ink">{dialog.account.email}</span> ({dialog.account.business}), including the login, all
              registration details, documents and images. This cannot be undone.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <AdminButton variant="outline" className="min-w-[100px]" onClick={close} disabled={busy}>
                Cancel
              </AdminButton>
              <AdminButton variant="danger" className="min-w-[147px]" onClick={() => remove(dialog.account)} disabled={busy} autoFocus>
                {busy ? "Deleting…" : "Delete permanently"}
              </AdminButton>
            </div>
          </ConfirmationCard>
        ) : null}
        {dialog?.type === "result" ? <ResultDialog title={dialog.title} message={dialog.message} failed={dialog.failed} onDone={close} /> : null}
      </AdminModal>
    </PageContent>
  );
}
