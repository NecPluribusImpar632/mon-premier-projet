"use client";

import { useLinkStatus } from "next/link";

export function LinkPendingSpinner() {
  const { pending } = useLinkStatus();

  if (!pending) return null;

  return (
    <span
      role="status"
      aria-label="Chargement"
      className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-2px]"
    />
  );
}
