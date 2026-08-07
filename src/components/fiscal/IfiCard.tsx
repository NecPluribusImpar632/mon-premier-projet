"use client";

import { useState } from "react";
import { Landmark, AlertTriangle } from "lucide-react";
import type { PropertyWithLoans } from "@/lib/property/loanCalculations";
import { computeIfi } from "@/lib/fiscal/ifi";
import { isMaritalStatus, impliesJointIfiHousehold } from "@/lib/client/maritalStatus";
import { formatCurrency } from "@/lib/format/currency";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface IfiCardProps {
  properties: PropertyWithLoans[];
  immobilierAmount: number;
  scpiAmount: number;
  maritalStatus: string | null;
  spouseImmobilierAmount: number | null;
  spouseScpiAmount: number | null;
  spouseDebtAmount: number | null;
}

export function IfiCard({
  properties,
  immobilierAmount,
  scpiAmount,
  maritalStatus,
  spouseImmobilierAmount,
  spouseScpiAmount,
  spouseDebtAmount,
}: IfiCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isJointHousehold =
    maritalStatus !== null &&
    isMaritalStatus(maritalStatus) &&
    impliesJointIfiHousehold(maritalStatus);
  const result = computeIfi(
    properties,
    immobilierAmount,
    scpiAmount,
    isJointHousehold
      ? {
          immobilierAmount: spouseImmobilierAmount ?? 0,
          scpiAmount: spouseScpiAmount ?? 0,
          debtAmount: spouseDebtAmount ?? 0,
        }
      : undefined
  );

  return (
    <div className="border-b border-line pb-4">
      <div className="flex items-center gap-1.5">
        <Landmark className="h-4 w-4 text-slate" />
        <h2 className="font-serif text-lg text-ink">IFI (impôt sur la fortune immobilière)</h2>
        <InfoTooltip>
          <p>
            Seuil d&apos;imposition : 1 300 000 €. Au-delà, barème progressif par
            tranches (art. 977 CGI) : 0 % jusqu&apos;à 800 k€, 0,5 % de 800 k€ à
            1,3 M€, 0,7 % de 1,3 M€ à 2,57 M€, 1 % de 2,57 M€ à 5 M€, 1,25 % de 5 M€
            à 10 M€, 1,5 % au-delà.
          </p>
          <p className="mt-2">
            Abattement de 30 % sur la résidence principale (art. 973 CGI). Décote
            entre 1,3 M€ et 1,4 M€ de patrimoine net taxable : 17 500 € − 1,25 % ×
            patrimoine net taxable, soustraite de l&apos;impôt brut. Dettes
            immobilières déductibles à hauteur du capital restant dû ; au-delà de
            5 M€ de base taxable brute, la fraction de dette dépassant 60 % de
            cette base n&apos;est déductible qu&apos;à 50 % (art. 973 II CGI).
          </p>
          <p className="mt-2">
            L&apos;IFI se déclare par foyer fiscal : pour un couple marié, pacsé, ou
            en concubinage notoire, le patrimoine immobilier du conjoint est ajouté
            à celui du client pour le calcul du seuil et du barème (art. 964 CGI).
          </p>
          <p className="mt-2">
            Limites de ce simulateur : démembrement (usufruit/nue-propriété), biens
            professionnels exonérés, détention via une société autre qu&apos;une
            SCPI, et plafonnement IFI + IR à 75 % des revenus ne sont pas modélisés.
            Les parts de SCPI sont retenues à leur valeur déclarée, sans abattement.
            Sans bien immobilier détaillé, le montant Immobilier saisi manuellement
            est utilisé tel quel, sans abattement résidence principale ni déduction
            de dette.
          </p>
        </InfoTooltip>
      </div>

      {result.isHousehold && (
        <p className="mt-1 text-xs text-slate">
          Calcul au niveau du foyer fiscal (avec conjoint).
        </p>
      )}

      {!result.isTaxable ? (
        <p className="mt-2 text-sm text-slate">
          Patrimoine net taxable estimé à {formatCurrency(result.netTaxableWealth)},
          sous le seuil d&apos;imposition de {formatCurrency(1_300_000)} — IFI non dû.
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate">Patrimoine net taxable</p>
              <p className="mt-1 font-mono text-base tabular-nums text-slate">
                {formatCurrency(result.netTaxableWealth)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate">Dette déductible</p>
              <p className="mt-1 font-mono text-base tabular-nums text-slate">
                {formatCurrency(result.deductibleDebt)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-slate">IFI estimé</p>
              <p className="mt-1 font-serif text-5xl font-semibold tabular-nums text-ink">
                {formatCurrency(result.finalTax)}
              </p>
            </div>
          </div>

          {!expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3 w-fit text-left text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
            >
              Détailler le calcul
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5 rounded-md border border-line bg-paper p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate">Détail du calcul</p>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-xs text-slate underline decoration-dotted underline-offset-2 hover:text-ink"
                >
                  Réduire
                </button>
              </div>
              <ul className="flex flex-col gap-1 text-xs">
                {result.brackets.map((bracket) => (
                  <li
                    key={bracket.threshold}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-slate">
                      Tranche {formatCurrency(bracket.threshold)}+ ({bracket.ratePct} %)
                    </span>
                    <span className="font-mono tabular-nums text-ink">
                      {formatCurrency(bracket.taxForBracket)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-line pt-1 font-medium">
                  <span className="text-ink">Total avant décote</span>
                  <span className="font-mono tabular-nums text-ink">
                    {formatCurrency(result.grossTax)}
                  </span>
                </li>
                {result.decote > 0 && (
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-slate">Décote</span>
                    <span className="font-mono tabular-nums text-emerald-strong">
                      -{formatCurrency(result.decote)}
                    </span>
                  </li>
                )}
              </ul>
              {result.primaryResidenceAbatementAmount > 0 && (
                <p className="text-xs text-slate">
                  Abattement résidence principale appliqué : -
                  {formatCurrency(result.primaryResidenceAbatementAmount)}
                </p>
              )}
              {result.debtCapApplied && (
                <p className="text-xs text-bronze">
                  Plafonnement des dettes déductibles appliqué (art. 973 II CGI).
                </p>
              )}
            </div>
          )}
        </>
      )}

      {!result.hasDetailedProperties && (
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-bronze bg-bronze-tint p-3 text-sm text-bronze">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Aucun bien immobilier détaillé pour ce client — calcul basé sur le
            montant Immobilier saisi manuellement, sans abattement résidence
            principale ni déduction de dette.
          </p>
        </div>
      )}
    </div>
  );
}
