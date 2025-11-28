import { logout } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
        <LogOut className="h-5 w-5" />
      </Button>
    </form>
  );
}
