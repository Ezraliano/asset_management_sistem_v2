import { Asset } from '../types';

export interface DepreciationResult {
    monthlyDepreciation: number;
    accumulatedDepreciation: number;
    currentValue: number;
}

export const calculateDepreciation = (asset: Asset): DepreciationResult => {
    const value = parseFloat(asset.value.toString());
    const usefulLife = asset.useful_life || 1; // Gunakan useful_life
    
    // Hitung penyusutan bulanan
    const monthlyDepreciation = value / usefulLife;
    
    // Hitung akumulasi penyusutan berdasarkan waktu
    let accumulatedDepreciation = 0;
    let currentValue = value;
    
    if (asset.purchase_date) {
        const purchaseDate = new Date(asset.purchase_date);
        const currentDate = new Date();
        const monthsOwned = Math.max(0, 
            (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + 
            (currentDate.getMonth() - purchaseDate.getMonth())
        );
        
        const monthsToDepreciate = Math.min(monthsOwned, usefulLife);
        accumulatedDepreciation = monthlyDepreciation * monthsToDepreciate;
        currentValue = Math.max(0, value - accumulatedDepreciation);
    }
    
    return {
        monthlyDepreciation,
        accumulatedDepreciation,
        currentValue
    };
};