import "server-only";
import type { AdminClient } from "@/lib/supabase/admin";

export async function readMissingApprovalDocuments(admin: AdminClient, applicationId: string): Promise<{ code: string; label: string }[] | null> {
  const { data, error } = await admin.rpc("missing_required_documents", { _application_id: applicationId });
  return error ? null : data;
}
