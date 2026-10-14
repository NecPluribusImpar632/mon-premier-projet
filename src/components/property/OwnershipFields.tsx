"use client";

import { useState } from "react";
import {
  DISMEMBERMENT_NOTE,
  HOLDING_MODES,
  HOLDING_MODE_LABELS,
  MAX_OWNERSHIP_SHARE_PCT,
  MIN_OWNERSHIP_SHARE_PCT,
  isDismemberment,
  isHoldingMode,
} from "@/lib/property/ownership";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";

interface OwnershipFieldsProps {
  defaultSharePct: number;
  defaultHoldingMode: string;
  /** Marié ou pacsé : a partial share gets the spouse's IFI hint. */
  isCoupleHousehold: boolean;
}

/**
 * The quote-part and holding-mode fields of the property form. A client
 * component only for the two live hints under the fields; the values
 * themselves are plain form fields read by the server action.
 */
export function OwnershipFields({
  defaultSharePct,
  defaultHoldingMode,
  isCoupleHousehold,
}: OwnershipFieldsProps) {
  const [sharePct, setSharePct] = useState(String(defaultSharePct));
  const [holdingMode, setHoldingMode] = useState<string>(
    isHoldingMode(defaultHoldingMode) ? defaultHoldingMode : "direct"
  );
  const shareValue = Number(sharePct.replace(",", "."));
  const isPartial = Number.isFinite(shareValue) && shareValue > 0 && shareValue < 100;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Quote-part détenue par le client (%)
        <input
          name="ownershipSharePct"
          type="number"
          required
          min={MIN_OWNERSHIP_SHARE_PCT}
          max={MAX_OWNERSHIP_SHARE_PCT}
          step={0.01}
          value={sharePct}
          onChange={(e) => setSharePct(e.target.value)}
          className={NUMERIC_FIELD_CLASS}
        />
        <span className="text-xs text-slate/70">
          Valeur, loyers et dette sont comptés à cette quote-part dans tous les calculs.
        </span>
        {isPartial && isCoupleHousehold && (
          <span className="text-xs text-slate">
            La part du conjoint se saisit dans « Immobilier du conjoint » (situation
            familiale) pour que l&apos;IFI du foyer reste complet.
          </span>
        )}
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-slate">
        Mode de détention
        <select
          name="holdingMode"
          value={holdingMode}
          onChange={(e) => setHoldingMode(e.target.value)}
          className={FIELD_CLASS}
        >
          {HOLDING_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {HOLDING_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
        {isDismemberment(holdingMode) && (
          <span className="text-xs text-bronze">{DISMEMBERMENT_NOTE}.</span>
        )}
        {holdingMode === "sci_is" && (
          <span className="text-xs text-slate/70">
            Le comparateur fiscal mettra en évidence le régime SCI à l&apos;IS.
          </span>
        )}
      </label>
    </div>
  );
}
