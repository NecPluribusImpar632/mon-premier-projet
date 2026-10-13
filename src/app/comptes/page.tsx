import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/currentUser";
import { getAccounts } from "@/lib/actions/users";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SECONDARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";
import { AccountsTable } from "@/components/admin/AccountsTable";
import { CreateAccountForm } from "@/components/admin/CreateAccountForm";

export const metadata = { title: "Comptes — Gestion de Patrimoine" };

// Admin-only: requireAdmin() 404s for a normal advisor, on top of the
// proxy's session check that already covers every non-public route.
export default async function AccountsPage() {
  const admin = await requireAdmin();
  const accounts = await getAccounts();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-10 px-6 py-14 sm:py-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">Comptes</h1>
          <p className="mt-1 text-sm text-slate">
            {accounts.length} compte{accounts.length > 1 ? "s" : ""}
            <span className="text-slate/60"> · connecté en tant que {admin.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/clients" className={SECONDARY_BUTTON_CLASS}>
            <ArrowLeft className="h-4 w-4" />
            Clients
          </Link>
          <LogoutButton />
        </div>
      </div>

      <AccountsTable accounts={accounts} currentUserId={admin.id} />

      <section className="flex flex-col gap-4 border-t border-line pt-8">
        <h2 className="font-serif text-xl text-ink">Nouveau compte</h2>
        <CreateAccountForm />
      </section>
    </div>
  );
}
