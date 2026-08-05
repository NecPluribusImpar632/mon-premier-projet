export const TMI_BRACKETS = [0, 11, 30, 41, 45] as const;

export type TmiBracket = (typeof TMI_BRACKETS)[number];

export const TMI_BRACKET_LABELS: Record<TmiBracket, string> = {
  0: "0 %",
  11: "11 %",
  30: "30 %",
  41: "41 %",
  45: "45 %",
};

export function isTmiBracket(value: number): value is TmiBracket {
  return (TMI_BRACKETS as readonly number[]).includes(value);
}
