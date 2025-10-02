import { Asset } from '../types';

/**
 * Calculates depreciation details for a given asset using the straight-line method.
 * @param asset The asset object.
 * @returns An object containing monthly depreciation, accumulated depreciation, and current value.
 */
export const calculateDepreciation = (asset: Asset) => {
  const purchaseDate = new Date(asset.purchaseDate);
  const now = new Date();

  // Calculate the total number of months elapsed since the purchase date.
  let monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12;
  monthsElapsed -= purchaseDate.getMonth();
  monthsElapsed += now.getMonth();
  
  // Ensure monthsElapsed is not negative if the purchase date is in the future.
  monthsElapsed = Math.max(0, monthsElapsed);

  // Calculate straight-line monthly depreciation. Handle division by zero if usefulLife is 0.
  const monthlyDepreciation = asset.usefulLife > 0 ? asset.value / asset.usefulLife : 0;
  
  // The number of months to calculate depreciation for cannot exceed the asset's useful life.
  const effectiveDepreciationMonths = Math.min(monthsElapsed, asset.usefulLife);
  
  // Total depreciation accumulated to date.
  const accumulatedDepreciation = monthlyDepreciation * effectiveDepreciationMonths;
  
  // The current book value of the asset, ensuring it doesn't fall below zero.
  const currentValue = Math.max(0, asset.value - accumulatedDepreciation);

  return {
    monthlyDepreciation,
    accumulatedDepreciation,
    currentValue,
    monthsElapsed,
  };
};
