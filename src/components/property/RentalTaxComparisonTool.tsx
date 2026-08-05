"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  compareRentalTaxRegimes,
  type RegimeResult,
  type RentalTaxScenarioInputs,
} from "@/lib/fiscal/rentalTaxComparison";
import type { AmortizationInputs as AmortizationInputsValue } from "@/lib/fiscal/amortization";
import { TMI_BRACKETS, TMI_BRACKET_LABELS, type TmiBracket } from "@/lib/fiscal/tmi";
import { AmortizationInputs } from "@/components/property/AmortizationInputs";
import { FormattedNumberInput } from "@/components/ui/FormattedNumberInput";
import { FIELD_CLASS, NUMERIC_FIELD_CLASS } from "@/components/ui/fieldStyles";
import { formatCurrency } from "@/lib/format/currency";

interface RentalTaxComparisonToolProps {
  annualRent: number;
  annualInterestPaid: number;
  acquisitionPrice: number;
  acquisitionDate: Date;
  currentValue: number;
}

type NumericField = Exclude<keyof RegimeResult, "regimeId" | "label">;

export function RentalTaxComparisonTool({
  annualRent,
  annualInterestPaid,
  acquisitionPrice,
  acquisitionDate,
  currentValue,
}: RentalTaxComparisonToolProps) {
  const [annualDeductibleCharges, setAnnualDeductibleCharges] = useState(0);
  const [tmiPct, setTmiPct] = useState<TmiBracket>(30);
  const [estimatedSalePrice, setEstimatedSalePrice] = useState(currentValue);
  const [amortization, setAmortization] = useState<AmortizationInputsValue>({
    mode: "global",
    global: { value: Math.round(acquisitionPrice * 0.85), durationYears: 25 },
    detailed: {
      bati: { value: Math.round(acquisitionPrice * 0.75), durationYears: 25 },
      agencements: { value: Math.round(acquisitionPrice * 0.05), durationYears: 10 },
      mobilier: { value: Math.round(acquisitionPrice * 0.05), durationYears: 7 },
    },
  });

  const inputs: RentalTaxScenarioInputs = {
    annualRent,
    annualDeductibleCharges,
    annualInterestPaid,
    acquisitionPrice,
    acquisitionDate,
    estimatedSalePrice,
    tmiPct,
    amortization,
  };

  const results = compareRentalTaxRegimes(inputs);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 font-serif text-lg text-ink">Hypothèses</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Charges déductibles annuelles (€)
            <span className="text-xs font-normal text-slate">
              Hors intérêts d&apos;emprunt et amortissement — taxe foncière, assurance,
              gestion, copropriété, entretien...
            </span>
            <FormattedNumberInput
              value={annualDeductibleCharges}
              onChange={setAnnualDeductibleCharges}
              className={NUMERIC_FIELD_CLASS}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink">
            Tranche marginale d&apos;imposition (TMI)
            <select
              value={tmiPct}
              onChange={(e) => setTmiPct(Number(e.target.value) as TmiBracket)}
              className={FIELD_CLASS}
            >
              {TMI_BRACKETS.map((bracket) => (
                <option key={bracket} value={bracket}>
                  {TMI_BRACKET_LABELS[bracket]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-ink sm:col-span-2">
            Prix de vente estimé (€)
            <FormattedNumberInput
              value={estimatedSalePrice}
              onChange={setEstimatedSalePrice}
              className={NUMERIC_FIELD_CLASS}
            />
          </label>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-sm text-ink">Amortissement (LMNP réel et SCI à l&apos;IS)</p>
          <AmortizationInputs value={amortization} onChange={setAmortization} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="p-4 font-normal text-slate"></th>
              {results.map((result) => (
                <th key={result.regimeId} className="p-4 font-medium text-ink">
                  {result.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-ink">
            <ResultRow label="Résultat imposable annuel" results={results} field="taxableResult" />
            <ResultRow label="Impôt sur le revenu (ou IS)" results={results} field="incomeTax" />
            <ResultRow
              label="Prélèvements sociaux"
              results={results}
              field="socialContributions"
            />
            <ResultRow
              label="Revenu net après impôt (annuel)"
              results={results}
              field="netIncomeAfterTax"
              bold
            />
            <ResultRow
              label="Déficit non imputable / reportable"
              results={results}
              field="nonImputableOrCarriedForward"
            />
            <tr>
              <td colSpan={results.length + 1} className="border-t border-line p-0"></td>
            </tr>
            <ResultRow
              label="Plus-value brute à la revente"
              results={results}
              field="capitalGainGross"
            />
            <ResultRow
              label="Impôt sur la plus-value"
              results={results}
              field="capitalGainTax"
            />
            <ResultRow
              label="Produit net de cession estimé"
              results={results}
              field="netSaleProceeds"
              bold
              last
            />
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 text-sm">
        <h2 className="font-serif text-lg text-ink">Méthodologie</h2>

        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">LMNP au réel</p>
          <p className="text-slate">
            Résultat = loyer − charges − intérêts − amortissement (l&apos;amortissement
            ne peut ni créer ni aggraver un déficit ; l&apos;excédent se reporte
            indéfiniment, non chiffré ici). Impôt sur le revenu à la TMI saisie +
            prélèvements sociaux à 18,6 % (LFSS 2026). À la revente, réforme Le Meur
            (art. 84, loi de finances 2025, en vigueur depuis le 15/02/2025) : les
            amortissements déduits réduisent le prix d&apos;acquisition retenu pour le
            calcul de la plus-value. <strong>Point non tranché à ce jour</strong>{" "}
            : aucune
            doctrine BOFiP ne précise si la part réintégrée bénéficie de l&apos;abattement
            pour durée de détention — ce calcul l&apos;applique à la plus-value totale,
            l&apos;interprétation la plus courante actuellement, à vérifier au moment de
            la cession.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">LMNP micro-BIC</p>
          <p className="text-slate">
            Abattement forfaitaire de 50 % sur le loyer (plafond de recettes 83 600 €,
            non vérifié ici), réputé couvrir toutes les charges. Non concerné par la
            réforme Le Meur (aucun amortissement suivi) : la plus-value se calcule sur
            le prix d&apos;acquisition brut.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">SCI à l&apos;IS</p>
          <p className="text-slate">
            Résultat = loyer − charges − intérêts − amortissement, imposé à l&apos;IS
            (15 % jusqu&apos;à 42 500 € de bénéfice, 25 % au-delà) — le déficit se
            reporte indéfiniment sur les bénéfices futurs de la SCI, sans plafonnement
            de l&apos;amortissement. Le revenu net affiché s&apos;arrête au résultat
            après IS, <strong>sans supposer de distribution</strong>{" "}
            aux associés — en
            cas de distribution effective, une fiscalité personnelle supplémentaire
            s&apos;applique (prélèvement forfaitaire unique de 30 % ou barème), non
            incluse ici. Plus-value = prix de cession − valeur nette comptable, imposée
            à l&apos;IS, sans aucun abattement pour durée de détention.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">Location nue (déficit foncier)</p>
          <p className="text-slate">
            Pas d&apos;amortissement en location nue. Un déficit se ventile entre la
            part liée aux intérêts d&apos;emprunt (jamais imputable sur le revenu
            global, seulement reportable 10 ans sur les revenus fonciers futurs) et le
            reste, imputable sur le revenu global dans la limite de 10 700 €/an. Le
            dispositif de plafond doublé (21 400 €) pour travaux de rénovation
            énergétique n&apos;est pas modélisé ici.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-ink">Hypothèses communes</p>
          <p className="text-slate">
            TMI appliquée en analyse marginale simple (le résultat de l&apos;année est
            taxé en totalité à la tranche saisie). Intérêts d&apos;emprunt annuels
            approximés à partir du capital restant dû actuel × taux du/des prêt(s), pas
            un tableau d&apos;amortissement détaillé. Amortissement : valeur amortissable
            et durée par défaut (85 % du prix d&apos;acquisition sur 25 ans en mode
            global) sont des conventions ajustables, pas une règle fiscale. Abattement
            pour durée de détention et surtaxe sur les plus-values élevées appliqués
            selon le barème en vigueur (impôt sur le revenu 19 %, prélèvements sociaux
            17,2 % sur toutes les plus-values immobilières individuelles).
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-bronze/30 bg-bronze/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bronze" />
          <p className="text-bronze">
            Simulation indicative. Ne remplace pas l&apos;avis d&apos;un
            expert-comptable ou d&apos;un conseiller fiscal — la fiscalité française
            évolue régulièrement et dépend de la situation personnelle complète du
            client (tranche marginale d&apos;imposition réelle, autres revenus, régime
            matrimonial, etc.), pas seulement du bien concerné.
          </p>
        </div>
      </div>
    </div>
  );
}

interface ResultRowProps {
  label: string;
  results: RegimeResult[];
  field: NumericField;
  bold?: boolean;
  last?: boolean;
}

function ResultRow({ label, results, field, bold, last }: ResultRowProps) {
  return (
    <tr className={last ? "" : "border-b border-line/70"}>
      <td className={`p-4 font-sans ${bold ? "font-medium text-ink" : "text-slate"}`}>
        {label}
      </td>
      {results.map((result) => {
        const rawValue = result[field];
        return (
          <td
            key={result.regimeId}
            className={`p-4 ${bold ? "font-semibold" : ""} ${
              rawValue < 0 ? "text-bronze" : ""
            }`}
          >
            {formatCurrency(rawValue)}
          </td>
        );
      })}
    </tr>
  );
}
