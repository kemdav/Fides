import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { notFound, redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { PageContent, PageHeading, Surface } from "@/components/admin/primitives";
import { MerchantSidebar } from "@/components/merchant/merchant-sidebar";
import { staffRoleLabels } from "@/lib/merchant/staff-profile";
import { createClient } from "@/lib/supabase/server";
import { getInitials } from "@/lib/utils";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default async function MerchantAccountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?workspace=${encodeURIComponent(slug)}`);

  const { data: tenant } = await supabase.from("tenants").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();

  const { data: membership, error } = await supabase.from("tenant_memberships").select("role, profiles(full_name, email)")
    .eq("tenant_id", tenant.id).eq("profile_id", user.id).maybeSingle();
  if (error) throw error;
  if (!membership) notFound();

  const email = user.email || membership.profiles?.email || "";
  const name = membership.profiles?.full_name?.trim() || email || "My account";
  const role = membership.role === "owner" ? "Business owner" : staffRoleLabels[membership.role];

  return (
    <div className="flex min-h-dvh flex-col bg-powder text-ink lg:h-dvh lg:flex-row lg:overflow-hidden">
      <MerchantSidebar businessName={tenant.name} userName={name} userEmail={email} userRole={membership.role} basePath={`/${tenant.slug}`} />
      <div className="min-w-0 flex-1 lg:overflow-y-auto">
        <PageContent>
          <PageHeading title="My Account" description="View the account signed in to this workspace." />
          <Surface className="w-full max-w-2xl border border-hairline">
            <div className="flex items-center gap-4">
              <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-burnt/10 text-lg font-semibold text-burnt-dark">
                {getInitials(name)}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold">{name}</h2>
                <p className="mt-0.5 text-sm text-muted">{role}</p>
              </div>
            </div>
            <dl className="mt-5 grid gap-4 border-t border-hairline py-5 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-sm text-muted">Email address</dt>
                <dd className="mt-1 break-words text-sm font-medium">{email || "Not provided"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-sm text-muted">Workspace</dt>
                <dd className="mt-1 break-words text-sm font-medium">{tenant.name}</dd>
              </div>
            </dl>
            <form action={logout} className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
              <input type="hidden" name="workspace" value={tenant.slug} />
              <p className="text-sm text-muted">Log out to let someone else sign in on this device.</p>
              <Button variant="brand-outline" size="xs" type="submit">Log out</Button>
            </form>
          </Surface>
        </PageContent>
      </div>
    </div>
  );
}
