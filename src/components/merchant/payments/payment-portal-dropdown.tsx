"use client";

import {
  RowActionMenu,
  type RowActionMenuProps,
} from "@/components/admin/row-action-menu";

export type { RowActionMenuItem as DropdownMenuItem } from "@/components/admin/row-action-menu";

export function PaymentPortalDropdown(
  props: Omit<RowActionMenuProps, "label">,
) {
  return <RowActionMenu {...props} label="Payment actions" />;
}
