"use client";

import { useState, useTransition } from "react";
import { updateClientProfile } from "@/lib/actions/clients";
import { RISK_PROFILES, RISK_PROFILE_LABELS } from "@/lib/client/riskProfile";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";

interface ClientProfileProps {
  clientId: string;
  initialRiskProfile: string | null;
  initialNotes: string | null;
}

type SaveStatus = "saved" | "saving" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

export function ClientProfile({
  clientId,
  initialRiskProfile,
  initialNotes,
}: ClientProfileProps) {
  const [riskProfile, setRiskProfile] = useState(initialRiskProfile ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  function save(nextRiskProfile: string, nextNotes: string) {
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateClientProfile(
          clientId,
          nextRiskProfile === "" ? null : nextRiskProfile,
          nextNotes.trim() === "" ? null : nextNotes
        );
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function handleRiskProfileChange(value: string) {
    setRiskProfile(value);
    save(value, notes);
  }

  function handleNotesBlur() {
    save(riskProfile, notes);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex flex-1 flex-col gap-1.5 text-sm text-slate">
          Profil de risque
          <select
            value={riskProfile}
            onChange={(e) => handleRiskProfileChange(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Non renseigné</option>
            {RISK_PROFILES.map((profile) => (
              <option key={profile} value={profile}>
                {RISK_PROFILE_LABELS[profile]}
              </option>
            ))}
          </select>
        </label>
        <span
          className={`shrink-0 pt-6 text-xs ${
            status === "error" ? "text-bronze" : "text-slate"
          }`}
        >
          {isPending ? STATUS_MESSAGE.saving : STATUS_MESSAGE[status]}
        </span>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Notes (objectifs, échéances...)
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          rows={3}
          placeholder="Ex. : projet de départ en retraite en 2032, souhaite préparer une donation..."
          className={`${FIELD_CLASS} resize-none`}
        />
      </label>
    </div>
  );
}
