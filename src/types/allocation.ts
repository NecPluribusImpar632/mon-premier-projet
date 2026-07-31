export interface AssetCategory {
  id: string;
  label: string;
  /** Segment/swatch color. */
  color: string;
  /** Text color for a label drawn on top of `color`. */
  onColor: string;
}

export interface AllocationEntry {
  categoryId: string;
  percentage: number;
}
