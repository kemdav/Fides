export const staffRoleLabels = {
  owner: "Owner",
  admin: "Admin",
  receptionist: "Receptionist",
  staff: "Service Staff",
};

export type WorkspaceRole = keyof typeof staffRoleLabels;

export function canManageBookings(role: WorkspaceRole | undefined) {
  return role === "owner" || role === "admin" || role === "receptionist";
}
