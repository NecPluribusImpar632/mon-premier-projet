"use client";

import { useState, useTransition } from "react";
import { updateFoyerFiscal } from "@/lib/actions/clients";
import {
  MARITAL_STATUSES,
  MARITAL_STATUS_LABELS,
  isMaritalStatus,
  impliesJointIfiHousehold,
} from "@/lib/client/maritalStatus";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface FoyerFiscalSectionProps {
  clientId: string;
  initialMaritalStatus: string | null;
  initialSpouseName: string | null;
  initialSpouseImmobilierAmount: number | null;
  initialSpouseScpiAmount: number | null;
  initialSpouseDebtAmount: number | null;
  initialMinorChildrenCount: number | null;
  initialAdultChildrenCount: number | null;
}

type SaveStatus = "saved" | "saving" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

interface FoyerFiscalValues {
  maritalStatus: string;
  spouseName: string;
  spouseImmobilierAmount: number;
  spouseScpiAmount: number;
  spouseDebtAmount: number;
  minorChildrenCount: number;
  adultChildrenCount: number;
}

export function FoyerFiscalSection({
  clientId,
  initialMaritalStatus,
  initialSpouseName,
  initialSpouseImmobilierAmount,
  initialSpouseScpiAmount,
  initialSpouseDebtAmount,
  initialMinorChildrenCount,
  initialAdultChildrenCount,
}: FoyerFiscalSectionProps) {
  const [maritalStatus, setMaritalStatus] = useState(initialMaritalStatus ?? "");
  const [spouseName, setSpouseName] = useState(initialSpouseName ?? "");
  const [spouseImmobilierAmount, setSpouseImmobilierAmount] = useState(
    initialSpouseImmobilierAmount ?? 0
  );
  const [spouseScpiAmount, setSpouseScpiAmount] = useState(initialSpouseScpiAmount ?? 0);
  const [spouseDebtAmount, setSpouseDebtAmount] = useState(initialSpouseDebtAmount ?? 0);
  const [minorChildrenCount, setMinorChildrenCount] = useState(
    initialMinorChildrenCount ?? 0
  );
  const [adultChildrenCount, setAdultChildrenCount] = useState(
    initialAdultChildrenCount ?? 0
  );
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [isPending, startTransition] = useTransition();

  const isJointHousehold =
    isMaritalStatus(maritalStatus) && impliesJointIfiHousehold(maritalStatus);

  // Accepts overrides so a change handler can pass the just-set value directly,
  // rather than reading it back from state before the re-render that would
  // actually reflect it — same technique as ClientProfile's save(nextValue, ...).
  function save(overrides: Partial<FoyerFiscalValues> = {}) {
    const next: FoyerFiscalValues = {
      maritalStatus,
      spouseName,
      spouseImmobilierAmount,
      spouseScpiAmount,
      spouseDebtAmount,
      minorChildrenCount,
      adultChildrenCount,
      ...overrides,
    };
    setStatus("saving");
    startTransition(async () => {
      try {
        await updateFoyerFiscal(clientId, {
          maritalStatus: next.maritalStatus === "" ? null : next.maritalStatus,
          spouseName: next.spouseName.trim() === "" ? null : next.spouseName,
          spouseImmobilierAmount: next.spouseImmobilierAmount,
          spouseScpiAmount: next.spouseScpiAmount,
          spouseDebtAmount: next.spouseDebtAmount,
          minorChildrenCount: next.minorChildrenCount,
          adultChildrenCount: next.adultChildrenCount,
        });
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function handleMaritalStatusChange(value: string) {
    setMaritalStatus(value);
    save({ maritalStatus: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-base text-ink">Situation familiale</h3>
        <span
          className={`shrink-0 text-xs ${status === "error" ? "text-bronze" : "text-slate"}`}
        >
          {isPending ? STATUS_MESSAGE.saving : STATUS_MESSAGE[status]}
        </span>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Situation matrimoniale
        <select
          value={maritalStatus}
          onChange={(e) => handleMaritalStatusChange(e.target.value)}
          className={FIELD_CLASS}
        >
          <option value="">Non renseignée</option>
          {MARITAL_STATUSES.map((maritalStatusOption) => (
            <option key={maritalStatusOption} value={maritalStatusOption}>
              {MARITAL_STATUS_LABELS[maritalStatusOption]}
            </option>
          ))}
        </select>
      </label>

      {isJointHousehold && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-paper p-3.5">
          <p className="text-xs text-slate">
            L&apos;IFI se déclare par foyer fiscal : le patrimoine immobilier du
            conjoint s&apos;ajoute à celui du client pour le calcul du seuil et du
            barème.
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-slate">
            Nom du conjoint (optionnel)
            <input
              type="text"
              value={spouseName}
              onChange={(e) => setSpouseName(e.target.value)}
              onBlur={() => save()}
              className={FIELD_CLASS}
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1.5 text-sm text-slate">
              Immobilier du conjoint (€)
              <input
                type="number"
                min={0}
                step={1000}
                value={spouseImmobilierAmount}
                onChange={(e) => setSpouseImmobilierAmount(Number(e.target.value))}
                onBlur={() => save()}
                className={`w-32 ${NUMERIC_FIELD_CLASS}`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate">
              SCPI du conjoint (€)
              <input
                type="number"
                min={0}
                step={1000}
                value={spouseScpiAmount}
                onChange={(e) => setSpouseScpiAmount(Number(e.target.value))}
                onBlur={() => save()}
                className={`w-32 ${NUMERIC_FIELD_CLASS}`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate">
              Dette déductible du conjoint (€)
              <input
                type="number"
                min={0}
                step={1000}
                value={spouseDebtAmount}
                onChange={(e) => setSpouseDebtAmount(Number(e.target.value))}
                onBlur={() => save()}
                className={`w-32 ${NUMERIC_FIELD_CLASS}`}
              />
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Enfants mineurs
          <input
            type="number"
            min={0}
            step={1}
            value={minorChildrenCount}
            onChange={(e) => setMinorChildrenCount(Number(e.target.value))}
            onBlur={() => save()}
            className={`w-20 ${NUMERIC_FIELD_CLASS}`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-slate">
          Enfants majeurs
          <input
            type="number"
            min={0}
            step={1}
            value={adultChildrenCount}
            onChange={(e) => setAdultChildrenCount(Number(e.target.value))}
            onBlur={() => save()}
            className={`w-20 ${NUMERIC_FIELD_CLASS}`}
          />
        </label>
      </div>
    </div>
  );
}
