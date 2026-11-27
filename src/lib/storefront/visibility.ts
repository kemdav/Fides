/**
 * Whether visitors may see a business website. Approval leaves it unpublished; a business with no
 * settings row predates publishing and stays visible.
 */
export function isSitePublic(status: string, isPublished: boolean | null | undefined): boolean {
  return status === "active" && isPublished !== false;
}
