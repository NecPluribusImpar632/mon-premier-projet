export const RISK_PROFILES = ["prudent", "equilibre", "dynamique", "offensif"] as const;

export type RiskProfile = (typeof RISK_PROFILES)[number];

export const RISK_PROFILE_LABELS: Record<RiskProfile, string> = {
  prudent: "Prudent",
  equilibre: "Équilibré",
  dynamique: "Dynamique",
  offensif: "Offensif",
};

export function isRiskProfile(value: string): value is RiskProfile {
  return (RISK_PROFILES as readonly string[]).includes(value);
}
