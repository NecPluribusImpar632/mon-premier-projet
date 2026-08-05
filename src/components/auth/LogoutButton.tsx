import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-slate transition-colors hover:border-bronze hover:text-bronze"
      >
        <LogOut className="h-4 w-4" />
        Déconnexion
      </button>
    </form>
  );
}
