export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-6 py-14 sm:py-20">
      <div className="h-9 w-40 animate-pulse rounded bg-line" />
      <div className="flex flex-col gap-5">
        <div className="h-16 animate-pulse rounded-md bg-line" />
        <div className="h-16 animate-pulse rounded-md bg-line" />
      </div>
    </div>
  );
}
