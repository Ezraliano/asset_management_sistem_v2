// utils/depreciation.ts
import { Asset } from '../types';

export interface DepreciationResult {
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  currentValue: number;
  monthsUsed: number;
}

export const calculateDepreciation = (asset: Asset): DepreciationResult => {
  const purchaseDate = new Date(asset.purchase_date);
  const currentDate = new Date();
  
  // Calculate months between purchase date and current date
  const monthsUsed = (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 
    + (currentDate.getMonth() - purchaseDate.getMonth());
  
  // Monthly depreciation (straight-line method)
  const monthlyDepreciation = asset.value / asset.useful_life;
  
  // Accumulated depreciation
  const accumulatedDepreciation = monthlyDepreciation * Math.min(monthsUsed, asset.useful_life);
  
  // Current value
  const currentValue = Math.max(0, asset.value - accumulatedDepreciation);
  
  return {
    monthlyDepreciation,
    accumulatedDepreciation,
    currentValue,
    monthsUsed: Math.min(monthsUsed, asset.useful_life)
  };
};