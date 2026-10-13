import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-paper px-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
          Gestion de Patrimoine
        </h1>
        <p className="mt-1 text-sm text-slate">Connectez-vous pour accéder à vos clients.</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6">
        <LoginForm />
      </div>

      <Link
        href="/methodologie"
        className="text-sm text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
      >
        Découvrir notre méthodologie
      </Link>
    </div>
  );
}
