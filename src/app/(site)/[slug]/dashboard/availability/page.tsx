import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AvailabilityView } from "@/components/merchant/availability/availability-view";
import { resolveTenantAccess } from "@/lib/merchant/access";
import { canManageBookings, workspaceRoleFromLabel } from "@/lib/merchant/workspace-roles";
import { getTenantBySlug } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Availability & resources" };

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const basePath = `/${encodeURIComponent(slug)}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?${new URLSearchParams({ redirect: `${basePath}/dashboard/availability` })}`);

  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();
  const access = await resolveTenantAccess(supabase, tenant.id);
  const role = workspaceRoleFromLabel(access?.role);
  if (!role || !canManageBookings(role)) notFound();

  const fullName: unknown = user.user_metadata.full_name;
  return (
    <AvailabilityView
      key={slug}
      basePath={basePath}
      businessName={tenant.display_name || tenant.name}
      userName={typeof fullName === "string" ? fullName : user.email?.split("@")[0]}
      userRole={role}
    />
  );
}
