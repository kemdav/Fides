import { adminLogout } from "@/app/actions/admin-auth";
import { Button } from "@/components/ui/button";

export function AdminLogoutButton() {
  return (
    <form action={adminLogout}>
      <Button type="submit" variant="secondary" size="xs" className="w-full">
        Log out
      </Button>
    </form>
  );
}
