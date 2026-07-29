import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-black">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Gestion de Patrimoine
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Fondations du projet en place.
        </p>
      </div>
      <Link
        href="/clients"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Clients
      </Link>
    </div>
  );
}
