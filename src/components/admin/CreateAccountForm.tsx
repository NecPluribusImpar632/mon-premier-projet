"use client";

import { useActionState } from "react";
import { createUser } from "@/lib/actions/users";
import { USER_ROLES, USER_ROLE_LABELS, MIN_PASSWORD_LENGTH } from "@/lib/auth/roles";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export function CreateAccountForm() {
  const [state, action, pending] = useActionState(createUser, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink">
          Email
          <input type="email" name="email" autoComplete="off" required className={FIELD_CLASS} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink">
          Mot de passe
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Rôle
          <select name="role" defaultValue="advisor" className={FIELD_CLASS}>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state?.error && <p className="text-sm text-bronze">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald">{state.success}</p>}

      <div>
        <button type="submit" disabled={pending} className={PRIMARY_BUTTON_CLASS}>
          {pending ? "Création…" : "Créer le compte"}
        </button>
      </div>
    </form>
  );
}
