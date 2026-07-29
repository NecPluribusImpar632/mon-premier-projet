export interface AssetCategory {
  id: string;
  label: string;
  color: string;
}

export interface AllocationEntry {
  categoryId: string;
  percentage: number;
}
