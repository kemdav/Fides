import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ServicesView } from "@/components/merchant/services/services-view";
import { createClient } from "@/lib/supabase/server";
import type {
  AddonDTO,
  PackageBundledServiceDTO,
  PackageDTO,
  ServiceCategoryDTO,
  ServiceDTO,
  StaffOptionDTO,
} from "@/types/services";

interface MerchantServicesPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantServicesPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} Services`
      : "Merchant Service Management",
    description: "Manage service catalog, packages, add-ons, and staff eligibility.",
  };
}

export default async function MerchantServicesPage({
  params,
}: MerchantServicesPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/services`);
  }

  // 1. Resolve tenant by slug
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (!tenant) {
    notFound();
  }

  // 2. Multi-tenant Authorization Check
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("tenant_id", tenant.id)
    .eq("profile_id", user.id)
    .maybeSingle();

  const isTenantMember =
    Boolean(membership) ||
    (profile?.tenant_id === tenant.id &&
      ["owner", "admin", "receptionist", "staff"].includes(profile?.role || ""));

  if (!isTenantMember) {
    notFound();
  }

  const userRole = membership?.role || profile?.role || "staff";
  const formattedRole =
    userRole === "owner"
      ? "Business owner"
      : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  // 3. Parallel Database Queries for Tenant Catalog & Staff
  const [
    servicesResult,
    packagesResult,
    addonsResult,
    staffResult,
    categoriesResult,
  ] = await Promise.all([
    supabase
      .from("services")
      .select(`
        id,
        tenant_id,
        name,
        slug,
        description,
        duration_minutes,
        buffer_minutes,
        price_cents,
        active,
        is_archived,
        category_id,
        created_at,
        updated_at,
        service_categories (id, name, slug),
        staff_service_skills (
          staff_id,
          staff_members (id, full_name, title, image_url)
        )
      `)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("packages")
      .select(`
        id,
        tenant_id,
        name,
        slug,
        description,
        price_cents,
        duration_minutes,
        active,
        is_archived,
        created_at,
        updated_at,
        package_items (
          quantity,
          services (id, name, price_cents, duration_minutes)
        )
      `)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("service_addons")
      .select(`
        id,
        tenant_id,
        name,
        description,
        duration_minutes,
        price_cents,
        active,
        is_archived,
        created_at,
        updated_at,
        service_addon_links (service_id)
      `)
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("staff_members")
      .select("id, full_name, title, image_url")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),

    supabase
      .from("service_categories")
      .select("id, name, slug")
      .eq("tenant_id", tenant.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);

  // 4. Map raw Supabase rows to typed DTOs
  const initialServices: ServiceDTO[] = (servicesResult.data || []).map((s) => {
    const cat = Array.isArray(s.service_categories)
      ? s.service_categories[0]
      : s.service_categories;

    const assignedStaff: StaffOptionDTO[] = (s.staff_service_skills || [])
      .map((skill) => {
        const sm = Array.isArray(skill.staff_members)
          ? skill.staff_members[0]
          : skill.staff_members;
        if (!sm) return null;
        return {
          id: sm.id,
          fullName: sm.full_name,
          title: sm.title,
          imageUrl: sm.image_url,
        };
      })
      .filter((sm): sm is StaffOptionDTO => sm !== null);

    return {
      id: s.id,
      tenantId: s.tenant_id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      durationMinutes: s.duration_minutes,
      bufferMinutes: s.buffer_minutes,
      priceCents: s.price_cents,
      priceFormatted: `₱${(s.price_cents / 100).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      active: s.active,
      isArchived: s.is_archived ?? false,
      categoryId: s.category_id,
      categoryName: cat?.name || null,
      assignedStaff,
      assignedStaffIds: assignedStaff.map((st) => st.id),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  });

  const initialPackages: PackageDTO[] = (packagesResult.data || []).map((p) => {
    const bundledServices: PackageBundledServiceDTO[] = (p.package_items || [])
      .map((pi) => {
        const srv = Array.isArray(pi.services) ? pi.services[0] : pi.services;
        if (!srv) return null;
        return {
          id: srv.id,
          name: srv.name,
          priceCents: srv.price_cents,
          durationMinutes: srv.duration_minutes,
          quantity: pi.quantity || 1,
        };
      })
      .filter((b): b is PackageBundledServiceDTO => b !== null);

    return {
      id: p.id,
      tenantId: p.tenant_id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceCents: p.price_cents,
      priceFormatted: `₱${(p.price_cents / 100).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      durationMinutes: p.duration_minutes || 0,
      active: p.active,
      isArchived: p.is_archived ?? false,
      bundledServices,
      bundledServiceIds: bundledServices.map((b) => b.id),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });

  const initialAddons: AddonDTO[] = (addonsResult.data || []).map((a) => {
    const linkedIds = (a.service_addon_links || []).map((link) => link.service_id);
    return {
      id: a.id,
      tenantId: a.tenant_id,
      name: a.name,
      description: a.description,
      priceCents: a.price_cents,
      priceFormatted: `₱${(a.price_cents / 100).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      durationMinutes: a.duration_minutes,
      active: a.active,
      isArchived: a.is_archived ?? false,
      linkedServiceIds: linkedIds,
      linkedServicesCount: linkedIds.length,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    };
  });

  const staffOptions: StaffOptionDTO[] = (staffResult.data || []).map((sm) => ({
    id: sm.id,
    fullName: sm.full_name,
    title: sm.title,
    imageUrl: sm.image_url,
  }));

  const categoryOptions: ServiceCategoryDTO[] = (categoriesResult.data || []).map(
    (c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })
  );

  return (
    <ServicesView
      businessName={tenant.name}
      userName={profile?.full_name?.trim() || user.email?.split("@")[0] || "Merchant"}
      userEmail={user.email ?? "merchant@fides.ph"}
      userRole={formattedRole}
      tenantId={tenant.id}
      basePath={`/${slug}`}
      initialServices={initialServices}
      initialPackages={initialPackages}
      initialAddons={initialAddons}
      staff={staffOptions}
      categories={categoryOptions}
    />
  );
}
