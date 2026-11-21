import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBookingSettingsAction } from "@/app/actions/booking-settings";
import { BookingSettingsView } from "@/components/merchant/booking-settings/booking-settings-view";

interface MerchantBookingSettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MerchantBookingSettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: tenant?.name?.trim()
      ? `${tenant.name.trim()} · Booking Settings`
      : "Booking Settings · Merchant Workspace",
    description:
      "Configure booking approval mode, buffer times, booking windows, staff assignment, and cancellation policies.",
  };
}

export default async function MerchantBookingSettingsPage({
  params,
}: MerchantBookingSettingsPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/${slug}/dashboard/settings/booking`);
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!tenant) {
    notFound();
  }

  const result = await getBookingSettingsAction(tenant.id);
  if (!result.success || !result.data) {
    redirect(`/${slug}/dashboard`);
  }

  return (
    <BookingSettingsView initialData={result.data} basePath={`/${slug}`} />
  );
}
