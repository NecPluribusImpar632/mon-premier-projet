export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-6 py-12">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-4">
        <div className="h-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-16 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
