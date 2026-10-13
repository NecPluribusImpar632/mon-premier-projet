import Link from "next/link";
import { MethodologyContent } from "@/components/methodology/MethodologyContent";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export const metadata = {
  title: "Méthodologie — Gestion de Patrimoine",
  description: "Sources, périodes et hypothèses retenues pour chaque poste du simulateur.",
};

// Public route (see src/proxy.ts), with its own minimal header rather than
// the logged-in client chrome this content is also embedded in.
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">
        <div className="mb-10 flex max-w-3xl flex-col gap-2">
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Méthodologie
          </h1>
          <p className="text-sm text-slate">
            Sources, périodes et hypothèses retenues pour chaque poste du simulateur.
          </p>
        </div>
        <MethodologyContent />
      </main>
    </div>
  );
}
