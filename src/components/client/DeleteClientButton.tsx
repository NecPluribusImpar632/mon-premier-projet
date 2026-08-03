"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { deleteClient } from "@/lib/actions/clients";

interface DeleteClientButtonProps {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleConfirm() {
    startTransition(async () => {
      await deleteClient(clientId);
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={`Supprimer ${clientName}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:bg-bronze-tint hover:text-bronze"
      >
        <X className="h-4 w-4" />
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
            <h2 className="font-serif text-lg text-ink">Supprimer ce client ?</h2>
            <p className="mt-2 text-sm text-slate">
              {clientName}
              {" "}et l&apos;ensemble de ses données (allocation, biens
              immobiliers) seront définitivement supprimés. Cette action est
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
