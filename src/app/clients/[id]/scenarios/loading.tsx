export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-14 sm:py-20">
      <div className="h-9 w-72 animate-pulse rounded bg-line" />
      <div className="mt-2 h-4 w-40 animate-pulse rounded bg-line" />
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-lg border border-line bg-line/40"
          />
        ))}
        <div className="h-40 animate-pulse rounded-lg border border-line bg-line/40 md:col-span-2" />
      </div>
    </div>
  );
}
