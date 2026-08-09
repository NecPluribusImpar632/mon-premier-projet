"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { AllocationAmountForm } from "@/components/allocation/AllocationAmountForm";
import { AllocationDonutChart } from "@/components/allocation/AllocationDonutChart";
import {
  updateClientAllocation,
  updateActionsIndexBreakdown,
  updateProfessionalToolMainIncome,
  updateWrapperBreakdown,
  updateMatieresPremieresBreakdown,
} from "@/lib/actions/clients";
import {
  effectiveImmobilierAmount,
  financialTotalFromAmounts,
  overallEntriesFromAmounts,
} from "@/lib/allocation/mapping";
import {
  isActionsIndexBreakdownComplete,
  type ActionsIndexBreakdown,
} from "@/lib/allocation/actionsIndexBreakdown";
import { REFERENCE_INDICES, type ReferenceIndex } from "@/lib/allocation/referenceIndices";
import type { Wrapper, WrapperBreakdown } from "@/lib/allocation/wrappers";
import type { PreciousMetal, PreciousMetalsBreakdown } from "@/lib/allocation/preciousMetals";

interface ClientAllocationEditorProps {
  clientId: string;
  initialAmounts: Record<string, number>;
  initialActionsIndexBreakdown: ActionsIndexBreakdown;
  initialProfessionalToolMainIncome: boolean;
  initialWrapperBreakdowns: Record<string, WrapperBreakdown>;
  initialPreciousMetalsBreakdown: PreciousMetalsBreakdown;
  properties: PropertyWithLoans[];
}

type WrapperSaveStatus = "saved" | "saving" | "error";

const WRAPPER_STATUS_MESSAGE: Record<WrapperSaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  error: "Erreur lors de l'enregistrement",
};

const WRAPPER_STATUS_COLOR: Record<WrapperSaveStatus, string> = {
  saved: "text-slate",
  saving: "text-slate",
  error: "text-bronze",
};

type SaveStatus = "saved" | "saving" | "incomplete" | "error";

const STATUS_MESSAGE: Record<SaveStatus, string> = {
  saved: "Enregistré",
  saving: "Enregistrement...",
  incomplete: "Enregistré — total incomplet",
  error: "Erreur lors de l'enregistrement",
};

const STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "text-slate",
  saving: "text-slate",
  incomplete: "text-bronze",
  error: "text-bronze",
};

export function ClientAllocationEditor({
  clientId,
  initialAmounts,
  initialActionsIndexBreakdown,
  initialProfessionalToolMainIncome,
  initialWrapperBreakdowns,
  initialPreciousMetalsBreakdown,
  properties,
}: ClientAllocationEditorProps) {
  const [amounts, setAmounts] = useState<Record<string, number>>(initialAmounts);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<SaveStatus>("saved");

  const [professionalToolMainIncome, setProfessionalToolMainIncome] = useState(
    initialProfessionalToolMainIncome
  );
  const [, startMainIncomeTransition] = useTransition();

  const [actionsIndexBreakdown, setActionsIndexBreakdown] = useState<ActionsIndexBreakdown>(
    initialActionsIndexBreakdown
  );
  const [isActionsPending, startActionsTransition] = useTransition();
  const [actionsStatus, setActionsStatus] = useState<SaveStatus>(
    isActionsIndexBreakdownComplete(initialActionsIndexBreakdown) ? "saved" : "incomplete"
  );

  const [wrapperBreakdowns, setWrapperBreakdowns] = useState<
    Record<string, WrapperBreakdown>
  >(initialWrapperBreakdowns);
  const [wrapperStatus, setWrapperStatus] = useState<Record<string, WrapperSaveStatus>>(
    {}
  );

  const [preciousMetalsBreakdown, setPreciousMetalsBreakdown] = useState<PreciousMetalsBreakdown>(
    initialPreciousMetalsBreakdown
  );
  const [preciousMetalsStatus, setPreciousMetalsStatus] = useState<WrapperSaveStatus>("saved");

  const formColumnRef = useRef<HTMLDivElement>(null);
  const [formHeight, setFormHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = formColumnRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setFormHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasDetailedProperties = properties.length > 0;
  const financialTotal = financialTotalFromAmounts(amounts);
  const immobilierValue = effectiveImmobilierAmount(
    amounts.immobilier ?? 0,
    properties
  );
  const overallEntries = overallEntriesFromAmounts(amounts, properties);
  const percentagesByCategory = Object.fromEntries(
    overallEntries.map((entry) => [entry.categoryId, entry.percentage])
  );
  const totalValue = financialTotal + immobilierValue;

  function handleAmountChange(categoryId: string, amount: number) {
    const nextAmounts = { ...amounts, [categoryId]: amount };
    setAmounts(nextAmounts);

    setStatus("saving");
    startTransition(async () => {
      try {
        await updateClientAllocation(clientId, nextAmounts);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  function handleProfessionalToolMainIncomeChange(value: boolean) {
    setProfessionalToolMainIncome(value);
    startMainIncomeTransition(async () => {
      try {
        await updateProfessionalToolMainIncome(clientId, value);
      } catch {
        setProfessionalToolMainIncome(!value);
      }
    });
  }

  function handleActionsIndexChange(index: ReferenceIndex, rawPercentage: number) {
    const othersTotal = REFERENCE_INDICES.filter((key) => key !== index).reduce(
      (sum, key) => sum + actionsIndexBreakdown[key],
      0
    );
    const maxAllowed = Math.max(0, 100 - othersTotal);
    const percentage = Math.min(rawPercentage, maxAllowed);

    const next: ActionsIndexBreakdown = { ...actionsIndexBreakdown, [index]: percentage };
    setActionsIndexBreakdown(next);

    const complete = isActionsIndexBreakdownComplete(next);
    setActionsStatus("saving");
    startActionsTransition(async () => {
      try {
        await updateActionsIndexBreakdown(clientId, next);
        setActionsStatus(complete ? "saved" : "incomplete");
      } catch {
        setActionsStatus("error");
      }
    });
  }

  function handleWrapperChange(categoryId: string, wrapper: Wrapper, amount: number) {
    const next = { ...wrapperBreakdowns[categoryId], [wrapper]: amount };
    setWrapperBreakdowns((prev) => ({ ...prev, [categoryId]: next }));
    setWrapperStatus((prev) => ({ ...prev, [categoryId]: "saving" }));

    updateWrapperBreakdown(clientId, categoryId, next)
      .then(() => setWrapperStatus((prev) => ({ ...prev, [categoryId]: "saved" })))
      .catch(() => setWrapperStatus((prev) => ({ ...prev, [categoryId]: "error" })));
  }

  function handlePreciousMetalsChange(metal: PreciousMetal, amount: number) {
    const next = { ...preciousMetalsBreakdown, [metal]: amount };
    setPreciousMetalsBreakdown(next);
    setPreciousMetalsStatus("saving");

    updateMatieresPremieresBreakdown(clientId, next)
      .then(() => setPreciousMetalsStatus("saved"))
      .catch(() => setPreciousMetalsStatus("error"));
  }

  const wrapperStatusMessages = Object.fromEntries(
    Object.keys(wrapperBreakdowns).map((categoryId) => [
      categoryId,
      WRAPPER_STATUS_MESSAGE[wrapperStatus[categoryId] ?? "saved"],
    ])
  );
  const wrapperStatusColorClasses = Object.fromEntries(
    Object.keys(wrapperBreakdowns).map((categoryId) => [
      categoryId,
      WRAPPER_STATUS_COLOR[wrapperStatus[categoryId] ?? "saved"],
    ])
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div
          ref={formColumnRef}
          className="mx-auto w-full max-w-3xl lg:mx-0 lg:w-[380px] lg:shrink-0"
        >
          <AllocationAmountForm
            amounts={amounts}
            percentages={percentagesByCategory}
            onChange={handleAmountChange}
            immobilierValue={immobilierValue}
            hasDetailedProperties={hasDetailedProperties}
            actionsIndexBreakdown={actionsIndexBreakdown}
            onActionsIndexChange={handleActionsIndexChange}
            actionsStatusMessage={
              STATUS_MESSAGE[isActionsPending ? "saving" : actionsStatus]
            }
            actionsStatusColorClass={
              STATUS_COLOR[isActionsPending ? "saving" : actionsStatus]
            }
            professionalToolMainIncome={professionalToolMainIncome}
            onProfessionalToolMainIncomeChange={handleProfessionalToolMainIncomeChange}
            wrapperBreakdowns={wrapperBreakdowns}
            onWrapperBreakdownChange={handleWrapperChange}
            wrapperStatusMessages={wrapperStatusMessages}
            wrapperStatusColorClasses={wrapperStatusColorClasses}
            preciousMetalsBreakdown={preciousMetalsBreakdown}
            onPreciousMetalsBreakdownChange={handlePreciousMetalsChange}
            preciousMetalsStatusMessage={WRAPPER_STATUS_MESSAGE[preciousMetalsStatus]}
            preciousMetalsStatusColorClass={WRAPPER_STATUS_COLOR[preciousMetalsStatus]}
          />

          <p
            className={`mt-4 border-t border-line pt-4 text-xs ${STATUS_COLOR[isPending ? "saving" : status]}`}
          >
            {STATUS_MESSAGE[isPending ? "saving" : status]}
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <AllocationDonutChart
            entries={overallEntries}
            totalValue={totalValue}
            targetHeight={formHeight}
          />
        </div>
      </div>
    </div>
  );
}
