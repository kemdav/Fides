"use server";

import { createClient } from "@/lib/supabase/server";

export type ContactFormState = {
  success: boolean;
  message?: string;
  error?: string;
};

type GenericSupabaseClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => Promise<{
      error: { message: string } | null;
    }>;
  };
};

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() || null;
  const topic = formData.get("topic")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";
  const tenantSlug = formData.get("tenantSlug")?.toString().trim();
  let tenantId = formData.get("tenantId")?.toString().trim() || null;

  if (!name || !email || !topic || !message) {
    return {
      success: false,
      error: "Please fill in all required fields.",
    };
  }

  const supabase = await createClient();

  if (!tenantId && tenantSlug) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (tenant) {
      tenantId = tenant.id;
    }
  }

  const genericClient = supabase as unknown as GenericSupabaseClient;
  const { error } = await genericClient.from("inquiries").insert({
    tenant_id: tenantId,
    name,
    email,
    phone,
    topic,
    message,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Failed to submit your message. Please try again.",
    };
  }

  return {
    success: true,
    message: "Thank you for reaching out! We have received your message and will get back to you shortly.",
  };
}
