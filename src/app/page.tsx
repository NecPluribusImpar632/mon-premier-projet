import Link from "next/link";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/buttonStyles";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-7 bg-paper">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
          Gestion de Patrimoine
        </h1>
        <p className="mt-2 text-slate">Fondations du projet en place.</p>
      </div>
      <Link href="/clients" className={PRIMARY_BUTTON_CLASS}>
        Clients
      </Link>
    </div>
  );
}
