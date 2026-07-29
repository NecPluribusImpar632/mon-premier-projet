export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-12">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        <div className="flex-1 flex flex-col gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
        <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
