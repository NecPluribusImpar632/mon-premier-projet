export interface AmortizationComponent {
  value: number;
  durationYears: number;
}

export interface AmortizationInputs {
  mode: "global" | "detailed";
  global: AmortizationComponent;
  detailed: {
    bati: AmortizationComponent;
    agencements: AmortizationComponent;
    mobilier: AmortizationComponent;
  };
}

function annualForComponent(component: AmortizationComponent): number {
  return component.durationYears > 0 ? component.value / component.durationYears : 0;
}

export function computeAnnualAmortization(inputs: AmortizationInputs): number {
  if (inputs.mode === "global") {
    return annualForComponent(inputs.global);
  }
  const { bati, agencements, mobilier } = inputs.detailed;
  return (
    annualForComponent(bati) + annualForComponent(agencements) + annualForComponent(mobilier)
  );
}

/** Plafond de réintégration cumulée — l'amortissement cumulé ne peut jamais
 * dépasser la valeur amortissable totale, même sur un bien détenu longtemps. */
export function computeTotalAmortizableValue(inputs: AmortizationInputs): number {
  if (inputs.mode === "global") {
    return inputs.global.value;
  }
  const { bati, agencements, mobilier } = inputs.detailed;
  return bati.value + agencements.value + mobilier.value;
}
