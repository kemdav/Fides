export const staffRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  receptionist: "Receptionist",
  staff: "Service Staff",
};

export type WorkspaceRole = keyof typeof staffRoleLabels;

export function workspaceRoleFromLabel(label?: string | null): WorkspaceRole | undefined {
  switch (label?.trim().toLowerCase()) {
    case "owner":
    case "business owner": return "owner";
    case "admin": return "admin";
    case "receptionist": return "receptionist";
    case "staff":
    case "service staff": return "staff";
    default: return undefined;
  }
}

export function canManageBookings(role: WorkspaceRole | undefined) {
  return role === "owner" || role === "admin" || role === "receptionist";
}
