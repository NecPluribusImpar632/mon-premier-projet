"use client";

import { useActionState, useState, useTransition } from "react";
import { resetUserPassword, updateUserRole, type AccountSummary } from "@/lib/actions/users";
import { USER_ROLES, USER_ROLE_LABELS, MIN_PASSWORD_LENGTH } from "@/lib/auth/roles";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

interface AccountsTableProps {
  accounts: AccountSummary[];
  currentUserId: string;
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export function AccountsTable({ accounts, currentUserId }: AccountsTableProps) {
  return (
    <ul className="flex flex-col border-t border-line">
      {accounts.map((account) => (
        <AccountRow
          key={account.id}
          account={account}
          isSelf={account.id === currentUserId}
        />
      ))}
    </ul>
  );
}

function AccountRow({ account, isSelf }: { account: AccountSummary; isSelf: boolean }) {
  const [role, setRole] = useState(account.role);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showReset, setShowReset] = useState(false);

  function handleRoleChange(nextRole: string) {
    const previous = role;
    setRole(nextRole as typeof role);
    setRoleError(null);
    startTransition(async () => {
      try {
        await updateUserRole(account.id, nextRole);
      } catch (error) {
        setRole(previous);
        setRoleError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement");
      }
    });
  }

  return (
    <li className="flex flex-col gap-3 border-b border-line px-1 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-medium text-ink">
            {account.email}
            {isSelf && <span className="ml-2 text-xs text-slate">(vous)</span>}
          </span>
          <span className="text-xs text-slate">
            {account.clientCount} client{account.clientCount > 1 ? "s" : ""} · créé le{" "}
            {dateFormatter.format(account.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={isPending}
            className={`${FIELD_CLASS} disabled:opacity-60`}
            aria-label={`Rôle de ${account.email}`}
          >
            {USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {USER_ROLE_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowReset((v) => !v)}
            className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            {showReset ? "Annuler" : "Réinitialiser le mot de passe"}
          </button>
        </div>
      </div>
      {roleError && <p className="text-sm text-bronze">{roleError}</p>}
      {showReset && <ResetPasswordForm userId={account.id} onDone={() => setShowReset(false)} />}
    </li>
  );
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const boundAction = resetUserPassword.bind(null, userId);
  const [state, action, pending] = useActionState(boundAction, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-line bg-paper p-3">
      <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink">
        Nouveau mot de passe
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          className={FIELD_CLASS}
        />
      </label>
      <button type="submit" disabled={pending} className={PRIMARY_BUTTON_CLASS}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
      {state?.error && <p className="w-full text-sm text-bronze">{state.error}</p>}
      {state?.success && (
        <p className="w-full text-sm text-emerald">
          {state.success}{" "}
          <button type="button" onClick={onDone} className="underline decoration-dotted">
            Fermer
          </button>
        </p>
      )}
    </form>
  );
}
