import {
  REFERENCE_INDICES,
  DEFAULT_REFERENCE_INDEX,
  type ReferenceIndex,
} from "./referenceIndices";

/** How the client's Actions bucket splits across real indices (e.g. 40% CAC
 * 40, 60% Nasdaq) — a closed 100% partition, same UX contract as the old
 * Indiciel/Défensif/Croissance breakdown it replaces. */
export type ActionsIndexBreakdown = Record<ReferenceIndex, number>;

export function emptyActionsIndexBreakdown(): ActionsIndexBreakdown {
  return Object.fromEntries(REFERENCE_INDICES.map((index) => [index, 0])) as ActionsIndexBreakdown;
}

/** The implicit default for a client who has never detailed this breakdown:
 * 100% MSCI World, not an empty/undefined state. */
export function defaultActionsIndexBreakdown(): ActionsIndexBreakdown {
  return { ...emptyActionsIndexBreakdown(), [DEFAULT_REFERENCE_INDEX]: 100 };
}

export function actionsIndexBreakdownTotal(breakdown: ActionsIndexBreakdown): number {
  return REFERENCE_INDICES.reduce((sum, index) => sum + (breakdown[index] ?? 0), 0);
}

export function isActionsIndexBreakdownComplete(breakdown: ActionsIndexBreakdown): boolean {
  return actionsIndexBreakdownTotal(breakdown) === 100;
}

/** Whether the client has ever explicitly saved a breakdown — as opposed to
 * currently sitting at the untouched 100% MSCI World default — used to
 * decide whether the details panel should auto-expand. */
export function isActionsIndexBreakdownDefault(breakdown: ActionsIndexBreakdown): boolean {
  return REFERENCE_INDICES.every(
    (index) => breakdown[index] === (index === DEFAULT_REFERENCE_INDEX ? 100 : 0)
  );
}
