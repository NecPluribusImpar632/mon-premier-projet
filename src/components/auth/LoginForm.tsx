"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-ink">
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          className={FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm text-ink">
        Mot de passe
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={FIELD_CLASS}
        />
      </label>

      {state?.error && <p className="text-sm text-bronze">{state.error}</p>}

      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON_CLASS} justify-center`}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
