"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProperty } from "@/lib/actions/properties";

interface DeletePropertyButtonProps {
  propertyId: string;
  clientId: string;
  propertyName: string;
}

export function DeletePropertyButton({
  propertyId,
  clientId,
  propertyName,
}: DeletePropertyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await deleteProperty(propertyId, clientId);
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate transition-colors hover:border-bronze hover:text-bronze"
      >
        Supprimer
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-line bg-paper p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-serif text-lg text-ink">Supprimer ce bien ?</h2>
            <p className="mt-2 text-sm text-slate">
              {propertyName} sera définitivement supprimé. Cette action est
              irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                Non
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-full bg-bronze px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bronze/90 disabled:opacity-60"
              >
                {isPending ? "Suppression..." : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
