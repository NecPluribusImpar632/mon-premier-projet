export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-14 sm:py-20">
      <div className="flex items-center gap-5 pb-10">
        <div className="h-16 w-16 animate-pulse rounded-full bg-line" />
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-line" />
          <div className="mt-2 h-4 w-16 animate-pulse rounded bg-line" />
        </div>
      </div>
      <div className="flex flex-col gap-14 border-t border-line pt-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-col gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-line" />
            ))}
          </div>
          <div className="h-[200px] w-[200px] animate-pulse rounded-full bg-line" />
        </div>
      </div>
    </div>
  );
}
