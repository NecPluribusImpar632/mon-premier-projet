/**
 * Sensibilité or/argent à l'inflation, calibrée sur des séries longues et
 * publiques : prix mensuels 1960-2025 (World Bank Commodity Markets "Pink
 * Sheet", CMO-Historical-Data-Monthly.xlsx) agrégés en moyenne annuelle,
 * régressés sur l'inflation US annuelle (World Bank Open Data, indicateur
 * FP.CPI.TOTL.ZG, pays USA).
 *
 * Méthode : croissance annuelle du prix moyen régressée sur l'inflation US de
 * la même année (décalage 0) — seul décalage testé qui ait un sens
 * économique (marché liquide, réaction immédiate) et le seul qui ressort
 * significatif ; les décalages 1 à 5 ans s'effondrent (R² < 3%, non
 * significatifs), contrairement à l'immobilier où le décalage de plusieurs
 * trimestres est la norme (marché illiquide, ajustement lent). Fenêtre
 * restreinte à 1972+ : avant, l'or était fixé à 35$/once par les accords de
 * Bretton Woods, donc "sans risque de change" par décret, pas par le marché —
 * inclure cette période aurait biaisé le résultat.
 *
 * Devise : régression faite en USD contre l'inflation US (la référence
 * académique standard pour tester la propriété de couverture de l'or — série
 * la plus longue et la plus fiable disponible). Un test direct en euros
 * contre l'inflation française (1999+, seule fenêtre possible depuis
 * l'introduction de l'euro) ne montre AUCUNE relation contemporaine
 * (R²=0,0%) — cohérent, pas contradictoire : l'or réagit à la conjoncture
 * économique dominante mondiale (USD), pas spécifiquement à l'inflation
 * française. `eurVolatilityPct` (l'écart-type de la croissance annuelle une
 * fois le prix converti en euros, via le taux de change USD/EUR annuel moyen,
 * World Bank PA.NUS.FCRF) reste la référence à utiliser pour la volatilité :
 * le taux de change absorbe une partie du mouvement en dollars, donc la
 * volatilité réellement vécue par un détenteur en euros est plus faible que
 * la volatilité en USD brute.
 */

export interface PreciousMetalSensitivity {
  /** Pente : points de croissance annuelle du prix pour 1 point d'inflation US. */
  slope: number;
  /** Croissance annuelle "de base" à inflation nulle (dérive propre au métal,
   * non expliquée par l'inflation — taux réels, demande industrielle, etc.). */
  intercept: number;
  r2Pct: number;
  n: number;
  /** Écart-type de la croissance annuelle du prix en euros (1999-2025) — la
   * volatilité à afficher, pas celle en USD brut. */
  eurVolatilityPct: number;
}

export const GOLD_SENSITIVITY: PreciousMetalSensitivity = {
  slope: 3.54,
  intercept: -3.95,
  r2Pct: 18.8,
  n: 53,
  eurVolatilityPct: 13.3,
};

export const SILVER_SENSITIVITY: PreciousMetalSensitivity = {
  slope: 3.84,
  intercept: 6.22,
  r2Pct: 13.0,
  n: 53,
  eurVolatilityPct: 21.6,
};
