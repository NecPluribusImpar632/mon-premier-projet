export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <div className="h-9 w-56 animate-pulse rounded bg-line" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-line" />
        ))}
      </div>
    </div>
  );
}
