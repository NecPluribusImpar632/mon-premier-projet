export interface AssetCategory {
  id: string;
  label: string;
  /** Segment/swatch color, light UI mode. */
  color: string;
  /** Segment/swatch color, dark UI mode. */
  colorDark: string;
  /** Text color for a label drawn on top of `color`. */
  onColor: string;
  /** Text color for a label drawn on top of `colorDark`. */
  onColorDark: string;
}

export interface AllocationEntry {
  categoryId: string;
  percentage: number;
}
