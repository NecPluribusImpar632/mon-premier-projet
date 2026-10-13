import Link from "next/link";
import { MethodologyContent } from "@/components/methodology/MethodologyContent";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export const metadata = {
  title: "Méthodologie — Gestion de Patrimoine",
  description:
    "Comment chaque poste de l'outil de simulation est calibré, et où sont ses limites.",
};

// Public route (see src/proxy.ts) — readable by a prospect with no account,
// so it gets its own minimal header rather than the logged-in ClientSidebar
// chrome this content is also embedded in (see the "methodology" client tab).
export default function MethodologyPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-line px-8 py-5">
        <span className="font-serif text-xl font-medium tracking-tight text-ink">
          Gestion de Patrimoine
        </span>
        <Link href="/login" className={PRIMARY_BUTTON_CLASS}>
          Se connecter
        </Link>
      </header>
      <main className="flex-1 px-8 py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 pb-8">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Méthodologie
          </h1>
          <p className="text-sm text-slate">
            Comment chaque poste de l&apos;outil est calibré, et où sont ses limites —
            avant même d&apos;y saisir un client.
          </p>
        </div>
        <div className="mx-auto">
          <MethodologyContent />
        </div>
      </main>
    </div>
  );
}
