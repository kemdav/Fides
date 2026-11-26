/** A signed-in platform administrator. */
export type AdminIdentity = {
  id: string;
  email: string;
  displayName: string;
};

/** Who gets recorded on an admin decision. */
export type AdminActor = Pick<AdminIdentity, "id" | "displayName">;
